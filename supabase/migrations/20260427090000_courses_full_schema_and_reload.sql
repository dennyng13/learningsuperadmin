-- =============================================================================
-- Idempotent: course_levels extension columns + courses entity (M2M course<->level
-- and course<->study_plan_template), then NOTIFY PostgREST to reload schema cache.
--
-- Why: previous migration 20260427052737_course_levels_extend.sql and the
-- design doc docs/migrations/2026-04-27-courses-entity.sql were not reflected
-- in the live PostgREST schema cache, causing
--   400 "Could not find the 'cefr' column of 'course_levels'"
--   404 "courses / course_level_links / course_study_plans" not found.
-- Safe to re-run.
-- =============================================================================

-- 1) CEFR enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cefr_level') THEN
    CREATE TYPE public.cefr_level AS ENUM ('A1','A2','B1','B2','C1','C2');
  END IF;
END$$;

-- 2) course_levels: add descriptive columns
ALTER TABLE public.course_levels
  ADD COLUMN IF NOT EXISTS target_score           text,
  ADD COLUMN IF NOT EXISTS cefr                   public.cefr_level,
  ADD COLUMN IF NOT EXISTS long_description       text,
  ADD COLUMN IF NOT EXISTS outcomes               text[] NOT NULL DEFAULT '{}'::text[],
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

-- 3) program_levels: ensure UNIQUE(level_id) (dedupe first)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'program_levels') THEN
    WITH ranked AS (
      SELECT ctid, level_id,
             ROW_NUMBER() OVER (PARTITION BY level_id
                                ORDER BY COALESCE(sort_order, 0) ASC, program_id ASC) AS rn
      FROM public.program_levels
    )
    DELETE FROM public.program_levels pl
    USING ranked r
    WHERE pl.ctid = r.ctid AND r.rn > 1;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'program_levels_level_unique'
    ) THEN
      ALTER TABLE public.program_levels
        ADD CONSTRAINT program_levels_level_unique UNIQUE (level_id);
    END IF;
  END IF;
END$$;

-- 4) courses
CREATE TABLE IF NOT EXISTS public.courses (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id        uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  name              text NOT NULL,
  slug              text,
  description       text,
  long_description  text,
  outcomes          text[] NOT NULL DEFAULT '{}'::text[],
  color_key         text,
  icon_key          text,
  sort_order        int  NOT NULL DEFAULT 0,
  status            text NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active','inactive')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_courses_program ON public.courses (program_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_courses_status  ON public.courses (status);

CREATE OR REPLACE FUNCTION public.touch_courses_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_courses_updated_at ON public.courses;
CREATE TRIGGER trg_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.touch_courses_updated_at();

-- 5) course_level_links (M2M)
CREATE TABLE IF NOT EXISTS public.course_level_links (
  course_id  uuid NOT NULL REFERENCES public.courses(id)       ON DELETE CASCADE,
  level_id   uuid NOT NULL REFERENCES public.course_levels(id) ON DELETE CASCADE,
  sort_order int  NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, level_id)
);
CREATE INDEX IF NOT EXISTS idx_course_level_links_level ON public.course_level_links (level_id);

-- 6) course_study_plans (M2M)
CREATE TABLE IF NOT EXISTS public.course_study_plans (
  course_id   uuid NOT NULL REFERENCES public.courses(id)               ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.study_plan_templates(id)  ON DELETE CASCADE,
  is_default  boolean NOT NULL DEFAULT false,
  sort_order  int     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, template_id)
);
CREATE INDEX IF NOT EXISTS idx_course_study_plans_template ON public.course_study_plans (template_id);

-- 7) RLS
ALTER TABLE public.courses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_level_links   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_study_plans   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS courses_select ON public.courses;
CREATE POLICY courses_select
  ON public.courses FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS course_level_links_select ON public.course_level_links;
CREATE POLICY course_level_links_select
  ON public.course_level_links FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS course_study_plans_select ON public.course_study_plans;
CREATE POLICY course_study_plans_select
  ON public.course_study_plans FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS courses_admin_write ON public.courses;
CREATE POLICY courses_admin_write
  ON public.courses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS course_level_links_admin_write ON public.course_level_links;
CREATE POLICY course_level_links_admin_write
  ON public.course_level_links FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS course_study_plans_admin_write ON public.course_study_plans;
CREATE POLICY course_study_plans_admin_write
  ON public.course_study_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- 8) Realtime (best-effort)
DO $$
BEGIN
  PERFORM 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'courses';
  IF NOT FOUND THEN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.courses'; END IF;

  PERFORM 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'course_level_links';
  IF NOT FOUND THEN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.course_level_links'; END IF;

  PERFORM 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'course_study_plans';
  IF NOT FOUND THEN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.course_study_plans'; END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 9) Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
