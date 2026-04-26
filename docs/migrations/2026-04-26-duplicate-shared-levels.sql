-- ============================================================================
-- Migration: Nhân bản các cấp độ đang share giữa nhiều program
-- ============================================================================
-- Date:    2026-04-26
-- Goal:    Sau khi UI /courses/levels coi mỗi level "thuộc" 1 hoặc nhiều
--          program, ta vẫn muốn TÊN level có ngữ cảnh program để dễ quản lý
--          (vd. "Ra khơi 1" của IELTS vs "Ra khơi 1" của WRE là 2 level khác
--          nhau dù tên giống). Migration này:
--            • Tìm các course_levels được link bởi >1 program.
--            • Với mỗi program (sau program đầu tiên), tạo bản clone level
--              mới rồi swap link program_levels qua bản clone.
--            • Bản gốc giữ nguyên link với program đầu tiên.
--          Sau migration: 1 level chỉ còn link với 1 program (dù schema vẫn
--          many-to-many).
--
-- Notes:   Idempotent — chạy lần 2 không gây thêm clone.
--          UNIQUE constraint trên course_levels.name (nếu có) sẽ buộc tên
--          mới khác — script append " ({program.key})" suffix.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. DRY-RUN: xem các level đang share trước khi chạy
-- ----------------------------------------------------------------------------
-- SELECT cl.id, cl.name, COUNT(pl.program_id) AS program_count,
--        ARRAY_AGG(p.key ORDER BY pl.sort_order) AS programs
-- FROM   course_levels cl
-- JOIN   program_levels pl ON pl.level_id = cl.id
-- JOIN   programs p ON p.id = pl.program_id
-- GROUP  BY cl.id, cl.name
-- HAVING COUNT(pl.program_id) > 1
-- ORDER  BY program_count DESC, cl.name;

-- ----------------------------------------------------------------------------
-- 1. Nhân bản
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  shared RECORD;
  link   RECORD;
  new_id uuid;
  is_first boolean;
  new_name text;
BEGIN
  FOR shared IN
    SELECT cl.id AS level_id, cl.name, cl.color_key, cl.sort_order
    FROM   course_levels cl
    WHERE  (SELECT COUNT(*) FROM program_levels WHERE level_id = cl.id) > 1
  LOOP
    is_first := TRUE;
    FOR link IN
      SELECT pl.program_id, pl.sort_order, p.key AS program_key
      FROM   program_levels pl
      JOIN   programs p ON p.id = pl.program_id
      WHERE  pl.level_id = shared.level_id
      ORDER  BY pl.sort_order, pl.program_id
    LOOP
      IF is_first THEN
        -- giữ nguyên bản gốc cho program đầu tiên
        is_first := FALSE;
        CONTINUE;
      END IF;

      new_name := shared.name || ' (' || link.program_key || ')';

      INSERT INTO course_levels (name, sort_order, color_key)
      VALUES (new_name, shared.sort_order, shared.color_key)
      ON CONFLICT (name) DO UPDATE SET color_key = EXCLUDED.color_key
      RETURNING id INTO new_id;

      -- Swap link sang bản clone
      UPDATE program_levels
         SET level_id = new_id
       WHERE program_id = link.program_id
         AND level_id   = shared.level_id;

      RAISE NOTICE 'Cloned "%" → "%" cho program %', shared.name, new_name, link.program_key;
    END LOOP;
  END LOOP;
END$$;

-- ----------------------------------------------------------------------------
-- 2. Verify: sau migration, mọi level chỉ còn link với 1 program
-- ----------------------------------------------------------------------------
-- SELECT cl.name, COUNT(pl.program_id) AS still_shared
-- FROM   course_levels cl
-- JOIN   program_levels pl ON pl.level_id = cl.id
-- GROUP  BY cl.name
-- HAVING COUNT(pl.program_id) > 1;
-- (kỳ vọng: 0 row)