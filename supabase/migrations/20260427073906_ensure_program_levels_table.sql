-- ============================================================================
-- Migration: Ensure public.program_levels exists
-- ============================================================================
-- Date:   2026-04-27
-- Why:    Code (useCoursesAdmin, useCourseLevels, ProgramLevelManager,
--         CourseLevelsPage, FlashcardSetsPage, Step1ClassInfo, …) đọc/ghi vào
--         bảng `public.program_levels`, nhưng schema cache của Supabase đang
--         báo "Could not find the table 'public.program_levels'".
--         File tạo bảng nằm ở docs/migrations/2026-04-26-courses-module.sql
--         (không tự apply). Migration này tái tạo bảng + RLS theo đúng định
--         nghĩa gốc, idempotent (CREATE TABLE IF NOT EXISTS), an toàn với DB
--         đã có sẵn bảng (chỉ no-op).
-- ============================================================================

-- 1. Bảng liên kết M2M programs ↔ course_levels
CREATE TABLE IF NOT EXISTS public.program_levels (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id  uuid NOT NULL REFERENCES public.programs(id)      ON DELETE CASCADE,
  level_id    uuid NOT NULL REFERENCES public.course_levels(id) ON DELETE CASCADE,
  sort_order  int  NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, level_id)
);

CREATE INDEX IF NOT EXISTS idx_program_levels_program
  ON public.program_levels (program_id, sort_order);

-- 2. RLS: read mọi user đăng nhập, write admin/super_admin
ALTER TABLE public.program_levels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS program_levels_select ON public.program_levels;
CREATE POLICY program_levels_select
  ON public.program_levels FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS program_levels_write ON public.program_levels;
CREATE POLICY program_levels_write
  ON public.program_levels FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

-- 3. Realtime — code subscribe { table: "program_levels" }
DO $$
BEGIN
  PERFORM 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'program_levels';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.program_levels';
  END IF;
END $$;

-- 4. Refresh PostgREST schema cache (giúp lỗi "schema cache" biến mất ngay)
NOTIFY pgrst, 'reload schema';
