-- ============================================================================
-- Migration: Rename teachngo_classes → classes (+ teachngo_students)
-- ============================================================================
-- Date:     2026-04-26
-- Scope:    Loại bỏ tàn dư brand "teachngo" khỏi schema:
--             · teachngo_classes  → classes
--             · teachngo_students → synced_students
--             · Indexes / constraints / trigger có prefix `teachngo_` → đổi tên
--           GIỮ NGUYÊN:
--             · Edge function name `sync-teachngo-students` (external contract
--               — đó là tên SaaS thật mà tổ chức sync data từ đó).
--             · Enum value `source = 'teachngo'` (nhãn nguồn dữ liệu, đúng nghĩa).
-- Notes:    Idempotent — kiểm tra tồn tại trước khi rename.
--           FK reference tự động follow tên mới (Postgres update FK target).
--           RLS policies follow table → không cần đụng.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Rename teachngo_classes → classes
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'teachngo_classes')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables
                     WHERE table_schema = 'public' AND table_name = 'classes')
  THEN
    ALTER TABLE public.teachngo_classes RENAME TO classes;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Rename teachngo_students → synced_students
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'teachngo_students')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables
                     WHERE table_schema = 'public' AND table_name = 'synced_students')
  THEN
    ALTER TABLE public.teachngo_students RENAME TO synced_students;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Rename indexes có prefix `idx_teachngo_classes_` → `idx_classes_`
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname LIKE 'idx_teachngo_classes_%'
  LOOP
    EXECUTE format(
      'ALTER INDEX public.%I RENAME TO %I',
      r.indexname,
      replace(r.indexname, 'idx_teachngo_classes_', 'idx_classes_')
    );
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 4. Rename constraints có prefix `teachngo_classes_` → `classes_`
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.classes'::regclass
      AND conname LIKE 'teachngo_classes_%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.classes RENAME CONSTRAINT %I TO %I',
      r.conname,
      replace(r.conname, 'teachngo_classes_', 'classes_')
    );
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 5. Rename trigger `teachngo_classes_log_status_change` → `classes_log_status_change`
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'teachngo_classes_log_status_change'
      AND tgrelid = 'public.classes'::regclass
  ) THEN
    ALTER TRIGGER teachngo_classes_log_status_change
      ON public.classes
      RENAME TO classes_log_status_change;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 6. Backward compat: tạo VIEW teachngo_classes (read-only) để bất kỳ code
--    nào còn sót reference cũ vẫn select được trong giai đoạn chuyển tiếp.
--    Sau khi confirm FE sạch, xóa view bằng `DROP VIEW public.teachngo_classes;`.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.teachngo_classes AS
  SELECT * FROM public.classes;

CREATE OR REPLACE VIEW public.teachngo_students AS
  SELECT * FROM public.synced_students;

COMMENT ON VIEW public.teachngo_classes IS
  'DEPRECATED back-compat view — use public.classes. Drop sau khi FE migrate xong.';
COMMENT ON VIEW public.teachngo_students IS
  'DEPRECATED back-compat view — use public.synced_students.';