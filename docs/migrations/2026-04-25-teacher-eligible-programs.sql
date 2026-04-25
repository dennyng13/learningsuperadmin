-- Stage E5 — Teacher Program Eligibility (admin-controlled)
-- Mirror of supabase/migrations/20260425180000_eligible_program_keys.sql
-- Run in Supabase SQL editor. Idempotent.

ALTER TABLE public.teacher_capabilities
  ADD COLUMN IF NOT EXISTS eligible_program_keys text[] DEFAULT NULL;

COMMENT ON COLUMN public.teacher_capabilities.eligible_program_keys IS
  'Danh sách programs.key admin cấp cho giáo viên (theo hợp đồng / phụ lục). NULL = chưa cấu hình (legacy).';
