-- Reset bảng programs: xóa tất cả, chỉ giữ duy nhất IELTS.
-- Mọi course_levels đang link với program khác sẽ được re-link sang IELTS.
--
-- Yêu cầu nghiệp vụ: user muốn dọn sạch /courses/programs, chỉ còn IELTS;
-- toàn bộ Khóa học (cấp độ) hiện có phải gộp về dưới IELTS.

DO $$
DECLARE
  v_ielts_id uuid;
BEGIN
  -- 1) Đảm bảo có 1 row IELTS (active). Tạo mới nếu chưa có.
  SELECT id INTO v_ielts_id
  FROM public.programs
  WHERE lower(key) = 'ielts'
  LIMIT 1;

  IF v_ielts_id IS NULL THEN
    INSERT INTO public.programs (key, name, description, color_key, icon_key, sort_order, status)
    VALUES ('ielts', 'IELTS', 'Lộ trình luyện thi IELTS Academic.', 'blue', 'trophy', 1, 'active')
    RETURNING id INTO v_ielts_id;
  ELSE
    UPDATE public.programs
    SET status = 'active',
        sort_order = 1,
        name = COALESCE(NULLIF(name, ''), 'IELTS'),
        color_key = COALESCE(color_key, 'blue'),
        icon_key = COALESCE(icon_key, 'trophy')
    WHERE id = v_ielts_id;
  END IF;

  -- 2) Re-link program_levels của các program khác sang IELTS.
  --    UNIQUE(level_id) buộc phải xử lý trùng trước:
  --    nếu level đã có link IELTS rồi → xóa link "khác IELTS"; còn lại update.
  DELETE FROM public.program_levels pl
  USING public.program_levels pl_ielts
  WHERE pl.level_id = pl_ielts.level_id
    AND pl_ielts.program_id = v_ielts_id
    AND pl.program_id <> v_ielts_id;

  UPDATE public.program_levels
  SET program_id = v_ielts_id
  WHERE program_id <> v_ielts_id;

  -- 3) Xóa toàn bộ programs khác IELTS.
  DELETE FROM public.programs
  WHERE id <> v_ielts_id;
END $$;
