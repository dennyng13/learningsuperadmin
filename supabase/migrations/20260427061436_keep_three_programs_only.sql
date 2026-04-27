-- Mục tiêu: trang /courses/programs CHỈ hiển thị đúng 3 chương trình chuẩn:
--   IELTS, WRE, Customized.
-- Hiện trạng: bảng `programs` còn nhiều rows cũ (đa số ở status='inactive')
-- nhưng hook useCoursesAdmin không lọc theo status, nên admin vẫn thấy chúng.
--
-- Cách xử lý:
--   1) Đảm bảo có đủ 3 row chuẩn (insert nếu thiếu, kích hoạt + chuẩn hóa).
--   2) Re-link mọi program_levels đang trỏ vào program "rác" sang IELTS
--      (xử lý UNIQUE(level_id) trước khi update).
--   3) Xóa toàn bộ program không nằm trong 3 key chuẩn.

DO $$
DECLARE
  v_ielts_id uuid;
  v_wre_id   uuid;
  v_cust_id  uuid;
BEGIN
  ----------------------------------------------------------------------------
  -- 1) Upsert 3 program chuẩn
  ----------------------------------------------------------------------------
  SELECT id INTO v_ielts_id FROM public.programs WHERE lower(key) = 'ielts' LIMIT 1;
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
        icon_key  = COALESCE(icon_key,  'trophy')
    WHERE id = v_ielts_id;
  END IF;

  SELECT id INTO v_wre_id FROM public.programs WHERE lower(key) = 'wre' LIMIT 1;
  IF v_wre_id IS NULL THEN
    INSERT INTO public.programs (key, name, description, color_key, icon_key, sort_order, status)
    VALUES ('wre', 'WRE', 'Chương trình Writing & Reading Excellence.', 'emerald', 'graduation-cap', 2, 'active')
    RETURNING id INTO v_wre_id;
  ELSE
    UPDATE public.programs
    SET status = 'active',
        sort_order = 2,
        name = COALESCE(NULLIF(name, ''), 'WRE'),
        color_key = COALESCE(color_key, 'emerald'),
        icon_key  = COALESCE(icon_key,  'graduation-cap')
    WHERE id = v_wre_id;
  END IF;

  SELECT id INTO v_cust_id FROM public.programs WHERE lower(key) = 'customized' LIMIT 1;
  IF v_cust_id IS NULL THEN
    INSERT INTO public.programs (key, name, description, color_key, icon_key, sort_order, status)
    VALUES ('customized', 'Customized', 'Lộ trình thiết kế riêng theo nhu cầu học viên.', 'violet', 'sparkles', 3, 'active')
    RETURNING id INTO v_cust_id;
  ELSE
    UPDATE public.programs
    SET status = 'active',
        sort_order = 3,
        name = COALESCE(NULLIF(name, ''), 'Customized'),
        color_key = COALESCE(color_key, 'violet'),
        icon_key  = COALESCE(icon_key,  'sparkles')
    WHERE id = v_cust_id;
  END IF;

  ----------------------------------------------------------------------------
  -- 2) Re-link program_levels của các program "rác" sang IELTS.
  --    UNIQUE(level_id) buộc phải dedupe trước.
  ----------------------------------------------------------------------------
  -- a) Nếu một level đã có link IELTS sẵn thì xóa các link "rác" khác.
  DELETE FROM public.program_levels pl
  USING public.program_levels pl_keep
  WHERE pl.level_id = pl_keep.level_id
    AND pl_keep.program_id = v_ielts_id
    AND pl.program_id NOT IN (v_ielts_id, v_wre_id, v_cust_id);

  -- b) Các link còn lại trỏ vào program "rác" → chuyển sang IELTS.
  UPDATE public.program_levels
  SET program_id = v_ielts_id
  WHERE program_id NOT IN (v_ielts_id, v_wre_id, v_cust_id);

  ----------------------------------------------------------------------------
  -- 3) Xóa toàn bộ programs không nằm trong 3 key chuẩn.
  ----------------------------------------------------------------------------
  DELETE FROM public.programs
  WHERE id NOT IN (v_ielts_id, v_wre_id, v_cust_id);
END $$;
