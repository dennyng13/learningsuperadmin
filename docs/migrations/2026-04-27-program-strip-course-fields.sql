-- ============================================================================
-- Migration: Tách Program vs Course — Program chỉ giữ phạm vi chương trình
-- ============================================================================
-- Date:     2026-04-27
-- Scope:    Sau khi đã có bảng `courses` (mô tả/đầu ra/study plan riêng),
--           Program chỉ còn các trường định danh phạm vi (key/name/description
--           ngắn/icon/color/sort_order/status). Bỏ:
--             · programs.long_description    — chuyển sang courses.long_description
--             · programs.outcomes            — chuyển sang courses.outcomes
--
-- Notes:    Idempotent. Safe to re-run.
--           KHÔNG migrate dữ liệu — IELTS/WRE/Customized chỉ có 3 dòng,
--           admin có thể nhập lại mô tả/đầu ra ở cấp Course nếu cần.
-- ============================================================================

ALTER TABLE public.programs
  DROP COLUMN IF EXISTS long_description,
  DROP COLUMN IF EXISTS outcomes;