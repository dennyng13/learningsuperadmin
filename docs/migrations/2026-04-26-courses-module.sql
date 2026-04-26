-- ============================================================================
-- Migration: Courses module — outcomes + program_levels link
-- ============================================================================
-- Date:     2026-04-26
-- Scope:    Hỗ trợ trang /admin/courses (Module quản lý Khóa học):
--             · programs.outcomes              text[]   — danh sách "đầu ra"
--             · programs.long_description      text     — mô tả dài (markdown)
--             · program_levels (program_id, level_id, sort_order)
--                 — many-to-many giữa programs và course_levels
-- Notes:    Idempotent. Safe to re-run.
--           RLS: chỉ admin/super_admin được ghi; mọi role authenticated đọc.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. programs: thêm outcomes + long_description
-- ----------------------------------------------------------------------------
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS outcomes         text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS long_description text;

-- ----------------------------------------------------------------------------
-- 2. program_levels: liên kết programs ↔ course_levels
-- ----------------------------------------------------------------------------
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

ALTER TABLE public.program_levels ENABLE ROW LEVEL SECURITY;

-- Read: mọi user đăng nhập
DROP POLICY IF EXISTS program_levels_select ON public.program_levels;
CREATE POLICY program_levels_select
  ON public.program_levels FOR SELECT
  TO authenticated
  USING (true);

-- Write: admin/super_admin
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

-- ----------------------------------------------------------------------------
-- 3. RLS write cho programs (nếu chưa có) — admin/super_admin
-- ----------------------------------------------------------------------------
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS programs_admin_write ON public.programs;
CREATE POLICY programs_admin_write
  ON public.programs FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );