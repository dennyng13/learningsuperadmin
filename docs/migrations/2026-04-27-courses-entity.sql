-- ============================================================================
-- Migration: Courses entity (song song với Levels)
-- ============================================================================
-- Date:     2026-04-27
-- Scope:    Tạo thực thể "Khoá học" (courses) độc lập với "Cấp độ" (course_levels).
--             · courses                  — 1 program có nhiều khoá học
--             · course_level_links       — 1 khoá ↔ N levels (M2M)
--             · course_study_plans       — 1 khoá ↔ N study plan templates (M2M)
-- Notes:    Idempotent. Safe to re-run.
--           RLS: chỉ admin/super_admin được ghi; mọi role authenticated đọc.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. courses
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.courses (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id        uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  name              text NOT NULL,
  slug              text,
  description       text,
  long_description  text,
  outcomes          text[] NOT NULL DEFAULT '{}',
  color_key         text,
  icon_key          text,
  sort_order        int  NOT NULL DEFAULT 0,
  status            text NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active','inactive')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_courses_program
  ON public.courses (program_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_courses_status
  ON public.courses (status);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_courses_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_courses_updated_at ON public.courses;
CREATE TRIGGER trg_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.touch_courses_updated_at();

-- ----------------------------------------------------------------------------
-- 2. course_level_links (M2M course ↔ level)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_level_links (
  course_id   uuid NOT NULL REFERENCES public.courses(id)        ON DELETE CASCADE,
  level_id    uuid NOT NULL REFERENCES public.course_levels(id)  ON DELETE CASCADE,
  sort_order  int  NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, level_id)
);
CREATE INDEX IF NOT EXISTS idx_course_level_links_level
  ON public.course_level_links (level_id);

-- ----------------------------------------------------------------------------
-- 3. course_study_plans (M2M course ↔ study_plan_templates)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_study_plans (
  course_id   uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.study_plan_templates(id) ON DELETE CASCADE,
  is_default  boolean NOT NULL DEFAULT false,
  sort_order  int     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, template_id)
);
CREATE INDEX IF NOT EXISTS idx_course_study_plans_template
  ON public.course_study_plans (template_id);

-- ----------------------------------------------------------------------------
-- 4. RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.courses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_level_links   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_study_plans   ENABLE ROW LEVEL SECURITY;

-- READ: mọi user đăng nhập
DROP POLICY IF EXISTS courses_select ON public.courses;
CREATE POLICY courses_select
  ON public.courses FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS course_level_links_select ON public.course_level_links;
CREATE POLICY course_level_links_select
  ON public.course_level_links FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS course_study_plans_select ON public.course_study_plans;
CREATE POLICY course_study_plans_select
  ON public.course_study_plans FOR SELECT TO authenticated USING (true);

-- WRITE: admin/super_admin
DROP POLICY IF EXISTS courses_admin_write ON public.courses;
CREATE POLICY courses_admin_write
  ON public.courses FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

DROP POLICY IF EXISTS course_level_links_admin_write ON public.course_level_links;
CREATE POLICY course_level_links_admin_write
  ON public.course_level_links FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

DROP POLICY IF EXISTS course_study_plans_admin_write ON public.course_study_plans;
CREATE POLICY course_study_plans_admin_write
  ON public.course_study_plans FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

-- ----------------------------------------------------------------------------
-- 5. Realtime (optional — admin UI dùng)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  PERFORM 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'courses';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.courses';
  END IF;
  PERFORM 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'course_level_links';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.course_level_links';
  END IF;
  PERFORM 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'course_study_plans';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.course_study_plans';
  END IF;
END $$;