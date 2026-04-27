-- Extend course_levels with descriptive fields + dedupe program_levels.

-- 1) CEFR enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cefr_level') THEN
    CREATE TYPE public.cefr_level AS ENUM ('A1','A2','B1','B2','C1','C2');
  END IF;
END$$;

-- 2) Extra columns on course_levels
ALTER TABLE public.course_levels
  ADD COLUMN IF NOT EXISTS target_score text,
  ADD COLUMN IF NOT EXISTS cefr public.cefr_level,
  ADD COLUMN IF NOT EXISTS long_description text,
  ADD COLUMN IF NOT EXISTS outcomes text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS study_plan_template_id uuid;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'study_plan_templates'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'course_levels_study_plan_template_fk'
  ) THEN
    ALTER TABLE public.course_levels
      ADD CONSTRAINT course_levels_study_plan_template_fk
      FOREIGN KEY (study_plan_template_id)
      REFERENCES public.study_plan_templates(id)
      ON DELETE SET NULL;
  END IF;
END$$;

-- 3) Dedupe program_levels: keep one row per level_id (smallest sort_order, then program_id).
WITH ranked AS (
  SELECT
    ctid,
    level_id,
    ROW_NUMBER() OVER (
      PARTITION BY level_id
      ORDER BY COALESCE(sort_order, 0) ASC, program_id ASC
    ) AS rn
  FROM public.program_levels
)
DELETE FROM public.program_levels pl
USING ranked r
WHERE pl.ctid = r.ctid
  AND r.rn > 1;

-- 4) UNIQUE(level_id) — UI ép mỗi level thuộc đúng 1 program.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'program_levels_level_unique'
  ) THEN
    ALTER TABLE public.program_levels
      ADD CONSTRAINT program_levels_level_unique UNIQUE (level_id);
  END IF;
END$$;

COMMENT ON COLUMN public.course_levels.target_score IS 'Điểm mục tiêu free-text.';
COMMENT ON COLUMN public.course_levels.cefr IS 'CEFR tương ứng A1..C2.';
COMMENT ON COLUMN public.course_levels.long_description IS 'Mô tả chi tiết cấp độ.';
COMMENT ON COLUMN public.course_levels.outcomes IS 'Danh sách đầu ra.';
COMMENT ON COLUMN public.course_levels.study_plan_template_id IS 'Study Plan Template mặc định.';
