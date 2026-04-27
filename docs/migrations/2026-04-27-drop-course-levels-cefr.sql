-- ============================================================================
-- Migration: Bỏ cột course_levels.cefr (single)
-- ============================================================================
-- Date:  2026-04-27
-- Why:   CEFR đã chuyển hẳn sang bảng level_cefr_map (many-to-many: 1 level
--        có thể map nhiều CEFR, vd "Ra khơi 2" = B2 + C1).
--        Cột cũ course_levels.cefr là single-value → mâu thuẫn / không nhất
--        quán với dialog "Map CEFR". Xoá để 1 nguồn duy nhất.
--
-- Safety: Backfill các giá trị còn sót sang level_cefr_map trước khi drop.
--         Idempotent — re-run an toàn.
-- ============================================================================

-- 1) Backfill: copy cefr hiện có sang level_cefr_map (nếu chưa có)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'course_levels'
      AND column_name = 'cefr'
  ) THEN
    INSERT INTO public.level_cefr_map (level_id, cefr)
    SELECT id, cefr::text::cefr_level
    FROM public.course_levels
    WHERE cefr IS NOT NULL
    ON CONFLICT (level_id, cefr) DO NOTHING;
  END IF;
END $$;

-- 2) Drop cột cũ
ALTER TABLE public.course_levels DROP COLUMN IF EXISTS cefr;
