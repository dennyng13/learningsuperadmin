-- ============================================================================
-- Migration: backfill resource_courses từ legacy (program, level)
-- ============================================================================
-- Date:  2026-04-27
-- Why:   Trước khi có pivot `resource_courses`, mỗi resource (practice_exercise,
--        flashcard_set, assessment) chỉ gắn với 1 program (text) + 1 course_level
--        (text). Migration này tự động map (program_key, level_name) → course_id
--        bằng cách join:
--          programs.key (lower)            ↔ resource.program (lower)
--          course_level_links.level_id     ↔ course_levels.name
--          courses.program_id              ↔ programs.id (qua course)
--
--        Nếu 1 (program, level) khớp với NHIỀU course → chèn nhiều dòng (đủ
--        an toàn vì pivot có UNIQUE constraint).
--
-- Idempotent:
--   - INSERT ... ON CONFLICT DO NOTHING dựa trên UNIQUE
--     (resource_type, resource_id, course_id).
--   - Có thể chạy lại nhiều lần.
--
-- Scope:  practice_exercises, flashcard_sets, assessments. Mỗi bảng có 1 block
--         được bọc trong DO/IF để skip nếu chưa tồn tại.
--
-- Verify (sau khi chạy, copy đoạn dưới chạy bằng tay):
--   SELECT resource_type, COUNT(*) FROM public.resource_courses GROUP BY 1;
--   SELECT resource_type, COUNT(DISTINCT resource_id) AS tagged_resources
--     FROM public.resource_courses GROUP BY 1;
-- ============================================================================

-- Helper CTE: map mọi (program_key_lower, level_name_lower) → course_id
-- Tạo MATERIALIZED VIEW tạm thì nặng — dùng inline CTE trong từng INSERT.

-- ───────────────────────────────────────────────────────────────────────────
-- 1) practice_exercises
-- ───────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='practice_exercises'
  ) THEN
    INSERT INTO public.resource_courses (resource_type, resource_id, course_id)
    SELECT DISTINCT
      'exercise'::text,
      ex.id,
      c.id
    FROM public.practice_exercises ex
    JOIN public.programs            p   ON LOWER(p.key) = LOWER(ex.program)
    JOIN public.courses             c   ON c.program_id = p.id
    JOIN public.course_level_links  cll ON cll.course_id = c.id
    JOIN public.course_levels       cl  ON cl.id = cll.level_id
    WHERE ex.program       IS NOT NULL
      AND ex.course_level  IS NOT NULL
      AND LOWER(cl.name)   = LOWER(ex.course_level)
      AND c.status         = 'active'
    ON CONFLICT (resource_type, resource_id, course_id) DO NOTHING;

    RAISE NOTICE 'Backfill practice_exercises → resource_courses done.';
  END IF;
END$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 2) flashcard_sets
-- ───────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='flashcard_sets'
  ) THEN
    INSERT INTO public.resource_courses (resource_type, resource_id, course_id)
    SELECT DISTINCT
      'flashcard_set'::text,
      fs.id,
      c.id
    FROM public.flashcard_sets      fs
    JOIN public.programs            p   ON LOWER(p.key) = LOWER(fs.program)
    JOIN public.courses             c   ON c.program_id = p.id
    JOIN public.course_level_links  cll ON cll.course_id = c.id
    JOIN public.course_levels       cl  ON cl.id = cll.level_id
    WHERE fs.program       IS NOT NULL
      AND fs.course_level  IS NOT NULL
      AND LOWER(cl.name)   = LOWER(fs.course_level)
      AND c.status         = 'active'
    ON CONFLICT (resource_type, resource_id, course_id) DO NOTHING;

    RAISE NOTICE 'Backfill flashcard_sets → resource_courses done.';
  END IF;
END$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 3) assessments
-- ───────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='assessments'
  ) THEN
    INSERT INTO public.resource_courses (resource_type, resource_id, course_id)
    SELECT DISTINCT
      'assessment'::text,
      a.id,
      c.id
    FROM public.assessments         a
    JOIN public.programs            p   ON LOWER(p.key) = LOWER(a.program)
    JOIN public.courses             c   ON c.program_id = p.id
    JOIN public.course_level_links  cll ON cll.course_id = c.id
    JOIN public.course_levels       cl  ON cl.id = cll.level_id
    WHERE a.program       IS NOT NULL
      AND a.course_level  IS NOT NULL
      AND LOWER(cl.name)  = LOWER(a.course_level)
      AND c.status        = 'active'
    ON CONFLICT (resource_type, resource_id, course_id) DO NOTHING;

    RAISE NOTICE 'Backfill assessments → resource_courses done.';
  END IF;
END$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 4) Unmatched report (chỉ in ra số liệu, không thay đổi data)
-- ───────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_ex_total int;  v_ex_tagged int;
  v_fs_total int;  v_fs_tagged int;
  v_as_total int;  v_as_tagged int;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='practice_exercises') THEN
    SELECT COUNT(*) INTO v_ex_total
      FROM public.practice_exercises
      WHERE program IS NOT NULL AND course_level IS NOT NULL;
    SELECT COUNT(DISTINCT resource_id) INTO v_ex_tagged
      FROM public.resource_courses WHERE resource_type='exercise';
    RAISE NOTICE '[exercise] candidates with program+level=%, tagged=%',
                 v_ex_total, v_ex_tagged;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='flashcard_sets') THEN
    SELECT COUNT(*) INTO v_fs_total
      FROM public.flashcard_sets
      WHERE program IS NOT NULL AND course_level IS NOT NULL;
    SELECT COUNT(DISTINCT resource_id) INTO v_fs_tagged
      FROM public.resource_courses WHERE resource_type='flashcard_set';
    RAISE NOTICE '[flashcard_set] candidates with program+level=%, tagged=%',
                 v_fs_total, v_fs_tagged;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='assessments') THEN
    SELECT COUNT(*) INTO v_as_total
      FROM public.assessments
      WHERE program IS NOT NULL AND course_level IS NOT NULL;
    SELECT COUNT(DISTINCT resource_id) INTO v_as_tagged
      FROM public.resource_courses WHERE resource_type='assessment';
    RAISE NOTICE '[assessment] candidates with program+level=%, tagged=%',
                 v_as_total, v_as_tagged;
  END IF;
END$$;

-- Reload PostgREST cache
NOTIFY pgrst, 'reload schema';