-- ============================================================================
-- Migration: resource_courses pivot + course_id on study plan templates/plans
-- ============================================================================
-- Date:  2026-04-27
-- Why:   Cho phép gán nhiều resource (practice_exercises, flashcard_sets,
--        assessments) cho nhiều course một cách rõ ràng (FK + RLS), thay vì
--        dùng resource_tags string thô. Đồng thời thêm course_id vào
--        study_plan_templates và study_plans để Study Plan biết khoá học của
--        mình → filter resource theo course.
-- ============================================================================

-- 1) Pivot table: resource_courses ----------------------------------------
CREATE TABLE IF NOT EXISTS public.resource_courses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type text NOT NULL CHECK (resource_type IN ('exercise','flashcard_set','assessment')),
  resource_id   uuid NOT NULL,
  course_id     uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (resource_type, resource_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_resource_courses_course
  ON public.resource_courses (course_id, resource_type);
CREATE INDEX IF NOT EXISTS idx_resource_courses_resource
  ON public.resource_courses (resource_type, resource_id);

ALTER TABLE public.resource_courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS resource_courses_select ON public.resource_courses;
CREATE POLICY resource_courses_select
  ON public.resource_courses FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS resource_courses_insert ON public.resource_courses;
CREATE POLICY resource_courses_insert
  ON public.resource_courses FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'teacher')
  );

DROP POLICY IF EXISTS resource_courses_delete ON public.resource_courses;
CREATE POLICY resource_courses_delete
  ON public.resource_courses FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR created_by = auth.uid()
  );

-- 2) study_plan_templates.course_id ---------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='study_plan_templates'
  ) THEN
    ALTER TABLE public.study_plan_templates
      ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_study_plan_templates_course
      ON public.study_plan_templates (course_id);
  END IF;
END$$;

-- 3) study_plans.course_id ------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='study_plans'
  ) THEN
    ALTER TABLE public.study_plans
      ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_study_plans_course
      ON public.study_plans (course_id);
  END IF;
END$$;

-- 4) Reload PostgREST cache -----------------------------------------------
NOTIFY pgrst, 'reload schema';