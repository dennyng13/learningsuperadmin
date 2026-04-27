-- ============================================================================
-- Migration: programs — long_description + outcomes
-- ============================================================================
-- Date:  2026-04-27
-- Why:   Cho phép Admin viết mô tả chi tiết và liệt kê đầu ra (outcomes) cho
--        toàn bộ Chương trình (programs), tách biệt với mô tả ngắn 1 dòng.
--        Trước đây chỉ Course (courses) có long_description / outcomes; nay
--        Program cũng có để hiển thị trang giới thiệu / landing.
-- ============================================================================

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS long_description text,
  ADD COLUMN IF NOT EXISTS outcomes         text[] NOT NULL DEFAULT '{}'::text[];

NOTIFY pgrst, 'reload schema';
