-- ============================================================================
-- Migration: Rich descriptive fields on `courses` + IELTS catalog backfill
--            + 3 sample IELTS Study Plan templates linked to courses.
-- ----------------------------------------------------------------------------
-- Date:   2026-04-27
-- Scope:
--   1. Thêm các trường mô tả "marketing-grade" cho courses:
--        target_audience    (ai phù hợp)
--        problem_solving    (giải pháp / phương pháp)
--        price_vnd          (giá khoá, integer VND)
--        duration_label     (thời gian — text như "1.5 tháng")
--        total_sessions     (số buổi)
--        hours_per_session  (giờ học mỗi buổi, numeric)
--        max_students       (sĩ số tối đa)
--        cefr_range         (CEFR khoá học, text như "A2 - B1")
--   2. Backfill 8 khoá IELTS chuẩn (CB, LS1, DG1, LS2, DG2, RK1, RK2, RK3)
--      theo bảng "Thông tin lộ trình IELTS v.04 2026" do nội dung cung cấp.
--   3. Tạo 3 mẫu Study Plan IELTS (CB - Căng buồm 24 buổi,
--      DG1 - Đón gió 1 12 buổi, LS1 - Lướt sóng 1 12 buổi) kèm entries,
--      và gán mặc định vào course tương ứng qua bảng course_study_plans.
-- Notes:  Idempotent. An toàn re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Thêm columns mô tả khoá học
-- ----------------------------------------------------------------------------
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS target_audience    text,
  ADD COLUMN IF NOT EXISTS problem_solving    text,
  ADD COLUMN IF NOT EXISTS price_vnd          integer,
  ADD COLUMN IF NOT EXISTS duration_label     text,
  ADD COLUMN IF NOT EXISTS total_sessions     integer,
  ADD COLUMN IF NOT EXISTS hours_per_session  numeric(4,2),
  ADD COLUMN IF NOT EXISTS max_students       integer,
  ADD COLUMN IF NOT EXISTS cefr_range         text;

COMMENT ON COLUMN public.courses.target_audience    IS 'Đối tượng phù hợp với khoá học (markdown / multiline)';
COMMENT ON COLUMN public.courses.problem_solving    IS 'Khoá học giải quyết vấn đề gì cho học viên';
COMMENT ON COLUMN public.courses.price_vnd          IS 'Giá khoá học (VND, integer)';
COMMENT ON COLUMN public.courses.duration_label     IS 'Tổng thời lượng dạng text, vd "1.5 tháng"';
COMMENT ON COLUMN public.courses.total_sessions     IS 'Tổng số buổi học';
COMMENT ON COLUMN public.courses.hours_per_session  IS 'Số giờ học mỗi buổi';
COMMENT ON COLUMN public.courses.max_students       IS 'Sĩ số tối đa mỗi lớp';
COMMENT ON COLUMN public.courses.cefr_range         IS 'CEFR text label, vd "A2 - B1"';

-- ----------------------------------------------------------------------------
-- 2. Backfill 8 khoá IELTS (chương trình IELTS phải tồn tại trong programs)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_program_id uuid;
BEGIN
  SELECT id INTO v_program_id FROM public.programs
   WHERE lower(key) = 'ielts' LIMIT 1;

  IF v_program_id IS NULL THEN
    RAISE NOTICE 'Chưa có program IELTS — bỏ qua phần seed khoá học.';
    RETURN;
  END IF;

  -- Helper: upsert một course theo (program_id, name).
  -- Dùng INSERT ... ON CONFLICT yêu cầu unique index → ta kiểm tra thủ công.
  -- Pattern: nếu tồn tại theo tên thì UPDATE, không thì INSERT.

  -- ===== CĂNG BUỒM =====
  IF EXISTS (SELECT 1 FROM public.courses WHERE program_id = v_program_id AND name = 'CB - Căng Buồm') THEN
    UPDATE public.courses SET
      description       = 'Khoá nền tảng tiếng Anh giao tiếp + chuẩn bị cho hành trình IELTS.',
      long_description  = 'Tập trung các điểm ngữ pháp & chủ đề từ vựng cơ bản và trọng tâm nhất, giúp học viên sử dụng được tiếng Anh trong các tình huống thường gặp. Chuẩn bị nền tảng vững chắc để bắt đầu luyện các dạng câu hỏi IELTS.',
      outcomes          = ARRAY[
        'Sử dụng tiếng Anh ở các tình huống thường gặp',
        'Nắm chắc ngữ pháp và từ vựng cơ bản',
        'Sẵn sàng nền tảng để bước vào IELTS'
      ],
      target_audience   = '- Đã có học qua tiếng Anh nhưng không dùng được'                              || E'\n' ||
                          '- Không hiểu được các câu nói ngắn, đơn giản; chỉ trả lời bằng từ vựng cơ bản' || E'\n' ||
                          '- Có mong muốn thi IELTS trong vòng 1-2 năm tới'                              || E'\n' ||
                          '- Cần luyện nghe - nói - đọc - viết cơ bản để vững nền tảng',
      problem_solving   = 'Tập trung vào các điểm ngữ pháp và chủ đề từ vựng cơ bản và trọng tâm nhất, giúp học viên sử dụng được tiếng Anh. Chuẩn bị nền tảng vững chắc trước khi bắt đầu luyện các dạng câu hỏi IELTS.',
      price_vnd         = 4490000,
      duration_label    = '3 tháng',
      total_sessions    = 24,
      hours_per_session = 2.0,
      max_students      = 12,
      cefr_range        = 'A1 - A2',
      sort_order        = 1,
      status            = 'active'
    WHERE program_id = v_program_id AND name = 'CB - Căng Buồm';
  ELSE
    INSERT INTO public.courses (program_id, name, description, long_description, outcomes,
                                target_audience, problem_solving, price_vnd, duration_label,
                                total_sessions, hours_per_session, max_students, cefr_range,
                                sort_order, status, color_key, icon_key)
    VALUES (v_program_id, 'CB - Căng Buồm',
      'Khoá nền tảng tiếng Anh giao tiếp + chuẩn bị cho hành trình IELTS.',
      'Tập trung các điểm ngữ pháp & chủ đề từ vựng cơ bản và trọng tâm nhất, giúp học viên sử dụng được tiếng Anh trong các tình huống thường gặp. Chuẩn bị nền tảng vững chắc để bắt đầu luyện các dạng câu hỏi IELTS.',
      ARRAY['Sử dụng tiếng Anh ở các tình huống thường gặp',
            'Nắm chắc ngữ pháp và từ vựng cơ bản',
            'Sẵn sàng nền tảng để bước vào IELTS'],
      '- Đã có học qua tiếng Anh nhưng không dùng được'                              || E'\n' ||
      '- Không hiểu được các câu nói ngắn, đơn giản; chỉ trả lời bằng từ vựng cơ bản' || E'\n' ||
      '- Có mong muốn thi IELTS trong vòng 1-2 năm tới'                              || E'\n' ||
      '- Cần luyện nghe - nói - đọc - viết cơ bản để vững nền tảng',
      'Tập trung vào các điểm ngữ pháp và chủ đề từ vựng cơ bản và trọng tâm nhất, giúp học viên sử dụng được tiếng Anh. Chuẩn bị nền tảng vững chắc trước khi bắt đầu luyện các dạng câu hỏi IELTS.',
      4490000, '3 tháng', 24, 2.0, 12, 'A1 - A2', 1, 'active', 'sky', 'sailboat');
  END IF;

  -- ===== LƯỚT SÓNG 1 (Listening - Speaking cơ bản) =====
  IF EXISTS (SELECT 1 FROM public.courses WHERE program_id = v_program_id AND name = 'LS1 - Lướt Sóng 1') THEN
    UPDATE public.courses SET
      description       = 'Luyện Nghe - Nói IELTS cơ bản, xoá nỗi sợ nói tiếng Anh.',
      long_description  = 'Bổ sung vốn từ tăng nghe hiểu Listening và vốn từ Speaking. Luyện kỹ thuật đọc đề và phát hiện paraphrase trong bài nghe. Loại bỏ nỗi sợ nói tiếng Anh bằng tư duy phát triển ý tự nhiên.',
      outcomes          = ARRAY[
        'Nghe hiểu IELTS band 5.0 - 5.5 (chưa áp lực thời gian)',
        'Nói band 5.0 - 5.5 ở đa số chủ đề, tốc độ chậm - trung bình',
        'Vốn từ vựng và ngữ pháp vững ở B1'
      ],
      target_audience   = '- Có vốn từ vựng và ngữ pháp tương đương A2'                || E'\n' ||
                          '- Có mong muốn thi IELTS trong khoảng 1 năm tới'           || E'\n' ||
                          '- Cần tập trung luyện Nghe - Nói IELTS cơ bản',
      problem_solving   = '- Bổ sung vốn từ vựng để tăng khả năng nghe hiểu Listening và vốn từ Speaking' || E'\n' ||
                          '- Luyện kỹ thuật đọc đề hiệu quả và phát hiện paraphrase một cách logic'        || E'\n' ||
                          '- Loại bỏ ''nỗi sợ nói tiếng Anh'' bằng tư duy phát triển ý tự nhiên',
      price_vnd         = 3490000,
      duration_label    = '1.5 tháng',
      total_sessions    = 12,
      hours_per_session = 2.0,
      max_students      = 12,
      cefr_range        = 'A2 - B1',
      sort_order        = 2,
      status            = 'active'
    WHERE program_id = v_program_id AND name = 'LS1 - Lướt Sóng 1';
  ELSE
    INSERT INTO public.courses (program_id, name, description, long_description, outcomes,
                                target_audience, problem_solving, price_vnd, duration_label,
                                total_sessions, hours_per_session, max_students, cefr_range,
                                sort_order, status, color_key, icon_key)
    VALUES (v_program_id, 'LS1 - Lướt Sóng 1',
      'Luyện Nghe - Nói IELTS cơ bản, xoá nỗi sợ nói tiếng Anh.',
      'Bổ sung vốn từ tăng nghe hiểu Listening và vốn từ Speaking. Luyện kỹ thuật đọc đề và phát hiện paraphrase trong bài nghe. Loại bỏ nỗi sợ nói tiếng Anh bằng tư duy phát triển ý tự nhiên.',
      ARRAY['Nghe hiểu IELTS band 5.0 - 5.5 (chưa áp lực thời gian)',
            'Nói band 5.0 - 5.5 ở đa số chủ đề, tốc độ chậm - trung bình',
            'Vốn từ vựng và ngữ pháp vững ở B1'],
      '- Có vốn từ vựng và ngữ pháp tương đương A2'                || E'\n' ||
      '- Có mong muốn thi IELTS trong khoảng 1 năm tới'           || E'\n' ||
      '- Cần tập trung luyện Nghe - Nói IELTS cơ bản',
      '- Bổ sung vốn từ vựng để tăng khả năng nghe hiểu Listening và vốn từ Speaking' || E'\n' ||
      '- Luyện kỹ thuật đọc đề hiệu quả và phát hiện paraphrase một cách logic'        || E'\n' ||
      '- Loại bỏ ''nỗi sợ nói tiếng Anh'' bằng tư duy phát triển ý tự nhiên',
      3490000, '1.5 tháng', 12, 2.0, 12, 'A2 - B1', 2, 'active', 'emerald', 'waves');
  END IF;

  -- ===== ĐÓN GIÓ 1 (Reading - Writing cơ bản) =====
  IF EXISTS (SELECT 1 FROM public.courses WHERE program_id = v_program_id AND name = 'DG1 - Đón Gió 1') THEN
    UPDATE public.courses SET
      description       = 'Luyện Đọc - Viết IELTS cơ bản, xoá nỗi sợ Writing Task 1.',
      long_description  = 'Bổ sung vốn từ tăng đọc hiểu Reading và vốn từ Writing. Luyện kỹ năng phát hiện paraphrase và định vị từ khoá. Loại bỏ ''nỗi sợ Task 1'' bằng tư duy phát triển dàn ý ngắn gọn, logic, mạch lạc.',
      outcomes          = ARRAY[
        'Đọc hiểu IELTS band 5.0 - 5.5',
        'Viết Task 1 mạch lạc, đúng cấu trúc cơ bản',
        'Vốn từ vựng và ngữ pháp vững ở B1'
      ],
      target_audience   = '- Có vốn từ vựng và ngữ pháp tương đương A2'                || E'\n' ||
                          '- Có mong muốn thi IELTS trong khoảng 1 năm tới'           || E'\n' ||
                          '- Cần tập trung luyện Đọc - Viết IELTS cơ bản',
      problem_solving   = '- Bổ sung vốn từ vựng để tăng khả năng đọc hiểu Reading và vốn từ Writing' || E'\n' ||
                          '- Luyện kỹ năng phát hiện paraphrase và định vị từ khoá để chọn đáp án logic' || E'\n' ||
                          '- Loại bỏ ''nỗi sợ Task 1'' bằng tư duy phát triển dàn ý ngắn gọn, logic',
      price_vnd         = 3490000,
      duration_label    = '1.5 tháng',
      total_sessions    = 12,
      hours_per_session = 2.0,
      max_students      = 12,
      cefr_range        = 'A2 - B1',
      sort_order        = 3,
      status            = 'active'
    WHERE program_id = v_program_id AND name = 'DG1 - Đón Gió 1';
  ELSE
    INSERT INTO public.courses (program_id, name, description, long_description, outcomes,
                                target_audience, problem_solving, price_vnd, duration_label,
                                total_sessions, hours_per_session, max_students, cefr_range,
                                sort_order, status, color_key, icon_key)
    VALUES (v_program_id, 'DG1 - Đón Gió 1',
      'Luyện Đọc - Viết IELTS cơ bản, xoá nỗi sợ Writing Task 1.',
      'Bổ sung vốn từ tăng đọc hiểu Reading và vốn từ Writing. Luyện kỹ năng phát hiện paraphrase và định vị từ khoá. Loại bỏ ''nỗi sợ Task 1'' bằng tư duy phát triển dàn ý ngắn gọn, logic, mạch lạc.',
      ARRAY['Đọc hiểu IELTS band 5.0 - 5.5',
            'Viết Task 1 mạch lạc, đúng cấu trúc cơ bản',
            'Vốn từ vựng và ngữ pháp vững ở B1'],
      '- Có vốn từ vựng và ngữ pháp tương đương A2'                || E'\n' ||
      '- Có mong muốn thi IELTS trong khoảng 1 năm tới'           || E'\n' ||
      '- Cần tập trung luyện Đọc - Viết IELTS cơ bản',
      '- Bổ sung vốn từ vựng để tăng khả năng đọc hiểu Reading và vốn từ Writing' || E'\n' ||
      '- Luyện kỹ năng phát hiện paraphrase và định vị từ khoá để chọn đáp án logic' || E'\n' ||
      '- Loại bỏ ''nỗi sợ Task 1'' bằng tư duy phát triển dàn ý ngắn gọn, logic',
      3490000, '1.5 tháng', 12, 2.0, 12, 'A2 - B1', 3, 'active', 'amber', 'wind');
  END IF;

  -- ===== LƯỚT SÓNG 2 =====
  IF EXISTS (SELECT 1 FROM public.courses WHERE program_id = v_program_id AND name = 'LS2 - Lướt Sóng 2') THEN
    UPDATE public.courses SET
      description       = 'Luyện Nghe - Nói IELTS trung cấp, đẩy band 5.5 - 6.0.',
      long_description  = 'Bổ sung vốn từ tăng nghe hiểu Listening và vốn từ Speaking, tập trung chủ đề học thuật. Củng cố tư duy phát triển ý tự nhiên, tăng tự tin và lưu loát mọi câu hỏi Speaking.',
      outcomes          = ARRAY[
        'Nghe hiểu IELTS band 5.5 - 6.0 (chưa áp lực thời gian)',
        'Nói band 5.5 - 6.0, tốc độ trung bình - tự nhiên',
        'Vốn từ vựng và ngữ pháp vững ở B1 - B2'
      ],
      target_audience   = '- Có vốn từ vựng và ngữ pháp tương đương B1' || E'\n' ||
                          '- Có mong muốn thi IELTS trong khoảng 1 năm tới' || E'\n' ||
                          '- Cần luyện Nghe - Nói IELTS trình độ trung cấp',
      problem_solving   = '- Bổ sung vốn từ chủ đề học thuật cho Listening và Speaking' || E'\n' ||
                          '- Luyện đọc đề và phát hiện paraphrase chủ đề học thuật' || E'\n' ||
                          '- Củng cố tư duy phát triển ý, tăng độ tự tin & lưu loát',
      price_vnd         = 4490000,
      duration_label    = '1.5 tháng',
      total_sessions    = 14,
      hours_per_session = 2.0,
      max_students      = 12,
      cefr_range        = 'B1 - B1+',
      sort_order        = 4,
      status            = 'active'
    WHERE program_id = v_program_id AND name = 'LS2 - Lướt Sóng 2';
  ELSE
    INSERT INTO public.courses (program_id, name, description, long_description, outcomes,
                                target_audience, problem_solving, price_vnd, duration_label,
                                total_sessions, hours_per_session, max_students, cefr_range,
                                sort_order, status, color_key, icon_key)
    VALUES (v_program_id, 'LS2 - Lướt Sóng 2',
      'Luyện Nghe - Nói IELTS trung cấp, đẩy band 5.5 - 6.0.',
      'Bổ sung vốn từ tăng nghe hiểu Listening và vốn từ Speaking, tập trung chủ đề học thuật. Củng cố tư duy phát triển ý tự nhiên, tăng tự tin và lưu loát mọi câu hỏi Speaking.',
      ARRAY['Nghe hiểu IELTS band 5.5 - 6.0 (chưa áp lực thời gian)',
            'Nói band 5.5 - 6.0, tốc độ trung bình - tự nhiên',
            'Vốn từ vựng và ngữ pháp vững ở B1 - B2'],
      '- Có vốn từ vựng và ngữ pháp tương đương B1' || E'\n' ||
      '- Có mong muốn thi IELTS trong khoảng 1 năm tới' || E'\n' ||
      '- Cần luyện Nghe - Nói IELTS trình độ trung cấp',
      '- Bổ sung vốn từ chủ đề học thuật cho Listening và Speaking' || E'\n' ||
      '- Luyện đọc đề và phát hiện paraphrase chủ đề học thuật' || E'\n' ||
      '- Củng cố tư duy phát triển ý, tăng độ tự tin & lưu loát',
      4490000, '1.5 tháng', 14, 2.0, 12, 'B1 - B1+', 4, 'active', 'teal', 'waves');
  END IF;

  -- ===== ĐÓN GIÓ 2 =====
  IF EXISTS (SELECT 1 FROM public.courses WHERE program_id = v_program_id AND name = 'DG2 - Đón Gió 2') THEN
    UPDATE public.courses SET
      description       = 'Luyện Đọc - Viết IELTS trung cấp, làm chủ Task 2.',
      long_description  = 'Bổ sung vốn từ tăng đọc hiểu Reading và vốn từ Writing. Hiểu ý chính từng đoạn, tăng tỷ lệ đúng dạng Matching Headings. Viết Task 2 theo logic không phụ thuộc kiến thức chủ đề.',
      outcomes          = ARRAY[
        'Đọc hiểu IELTS band 5.5 - 6.0',
        'Viết Task 2 mạch lạc, có cấu trúc',
        'Vốn từ vựng và ngữ pháp vững ở B1 - B2'
      ],
      target_audience   = '- Có vốn từ vựng và ngữ pháp tương đương B1' || E'\n' ||
                          '- Có mong muốn thi IELTS trong khoảng 1 năm tới' || E'\n' ||
                          '- Cần luyện Đọc - Viết IELTS trình độ trung cấp',
      problem_solving   = '- Bổ sung vốn từ học thuật cho Reading & Writing' || E'\n' ||
                          '- Luyện kỹ năng hiểu ý chính từng đoạn để tăng tỷ lệ đúng Matching Headings' || E'\n' ||
                          '- Luyện viết Task 2 theo logic, tự tin với mọi câu hỏi',
      price_vnd         = 4490000,
      duration_label    = '1.5 tháng',
      total_sessions    = 14,
      hours_per_session = 2.0,
      max_students      = 12,
      cefr_range        = 'B1 - B1+',
      sort_order        = 5,
      status            = 'active'
    WHERE program_id = v_program_id AND name = 'DG2 - Đón Gió 2';
  ELSE
    INSERT INTO public.courses (program_id, name, description, long_description, outcomes,
                                target_audience, problem_solving, price_vnd, duration_label,
                                total_sessions, hours_per_session, max_students, cefr_range,
                                sort_order, status, color_key, icon_key)
    VALUES (v_program_id, 'DG2 - Đón Gió 2',
      'Luyện Đọc - Viết IELTS trung cấp, làm chủ Task 2.',
      'Bổ sung vốn từ tăng đọc hiểu Reading và vốn từ Writing. Hiểu ý chính từng đoạn, tăng tỷ lệ đúng dạng Matching Headings. Viết Task 2 theo logic không phụ thuộc kiến thức chủ đề.',
      ARRAY['Đọc hiểu IELTS band 5.5 - 6.0',
            'Viết Task 2 mạch lạc, có cấu trúc',
            'Vốn từ vựng và ngữ pháp vững ở B1 - B2'],
      '- Có vốn từ vựng và ngữ pháp tương đương B1' || E'\n' ||
      '- Có mong muốn thi IELTS trong khoảng 1 năm tới' || E'\n' ||
      '- Cần luyện Đọc - Viết IELTS trình độ trung cấp',
      '- Bổ sung vốn từ học thuật cho Reading & Writing' || E'\n' ||
      '- Luyện kỹ năng hiểu ý chính từng đoạn để tăng tỷ lệ đúng Matching Headings' || E'\n' ||
      '- Luyện viết Task 2 theo logic, tự tin với mọi câu hỏi',
      4490000, '1.5 tháng', 14, 2.0, 12, 'B1 - B1+', 5, 'active', 'orange', 'wind');
  END IF;

  -- ===== RA KHƠI 1 / 2 / 3 (giá trị + thời lượng theo bảng) =====
  IF EXISTS (SELECT 1 FROM public.courses WHERE program_id = v_program_id AND name = 'RK1 - Ra Khơi 1') THEN
    UPDATE public.courses SET
      description       = 'Luyện đề IELTS toàn diện, target band 5.0 - 6.0.',
      long_description  = 'Hai nhánh nội dung: (1) target 5.0 - 5.5 luyện chiến lược ở vốn từ A2, (2) target 6.0+ xây kỹ năng giải đề 4 kỹ năng dưới áp lực thời gian, phát triển ý cho Writing & Speaking.',
      outcomes          = ARRAY[
        'Quen với áp lực thời gian khi giải đề 4 kỹ năng',
        'Sắp xếp ý cho Writing & Speaking band 5.5 - 6.0'
      ],
      target_audience   = 'Mục tiêu 5.0 - 5.5: vốn từ A2+, có kiến thức cơ bản về đề IELTS' || E'\n' ||
                          'Mục tiêu 6.0+: vốn từ B1+ và đã nắm cấu trúc đề, hoặc vốn từ B2+',
      problem_solving   = '- Luyện chiến lược làm bài cho mục tiêu 5.0 - 5.5 trên vốn từ A2' || E'\n' ||
                          '- Xây kỹ năng giải đề 4 kỹ năng dưới áp lực thời gian' || E'\n' ||
                          '- Phát triển và sắp xếp ý cho Writing & Speaking',
      price_vnd         = 5490000,
      duration_label    = '2 tháng',
      total_sessions    = 16,
      hours_per_session = 2.0,
      max_students      = 12,
      cefr_range        = 'B1 - B1+',
      sort_order        = 6,
      status            = 'active'
    WHERE program_id = v_program_id AND name = 'RK1 - Ra Khơi 1';
  ELSE
    INSERT INTO public.courses (program_id, name, description, long_description, outcomes,
                                target_audience, problem_solving, price_vnd, duration_label,
                                total_sessions, hours_per_session, max_students, cefr_range,
                                sort_order, status, color_key, icon_key)
    VALUES (v_program_id, 'RK1 - Ra Khơi 1',
      'Luyện đề IELTS toàn diện, target band 5.0 - 6.0.',
      'Hai nhánh nội dung: (1) target 5.0 - 5.5 luyện chiến lược ở vốn từ A2, (2) target 6.0+ xây kỹ năng giải đề 4 kỹ năng dưới áp lực thời gian, phát triển ý cho Writing & Speaking.',
      ARRAY['Quen với áp lực thời gian khi giải đề 4 kỹ năng',
            'Sắp xếp ý cho Writing & Speaking band 5.5 - 6.0'],
      'Mục tiêu 5.0 - 5.5: vốn từ A2+, có kiến thức cơ bản về đề IELTS' || E'\n' ||
      'Mục tiêu 6.0+: vốn từ B1+ và đã nắm cấu trúc đề, hoặc vốn từ B2+',
      '- Luyện chiến lược làm bài cho mục tiêu 5.0 - 5.5 trên vốn từ A2' || E'\n' ||
      '- Xây kỹ năng giải đề 4 kỹ năng dưới áp lực thời gian' || E'\n' ||
      '- Phát triển và sắp xếp ý cho Writing & Speaking',
      5490000, '2 tháng', 16, 2.0, 12, 'B1 - B1+', 6, 'active', 'cyan', 'ship');
  END IF;

  IF EXISTS (SELECT 1 FROM public.courses WHERE program_id = v_program_id AND name = 'RK2 - Ra Khơi 2') THEN
    UPDATE public.courses SET
      description       = 'Củng cố giải đề IELTS, target band 6.0 - 6.5.',
      long_description  = 'Củng cố kỹ năng giải đề 4 kỹ năng dưới áp lực thời gian. Tập trung phát triển ngữ pháp B2+ cho Writing & Speaking.',
      outcomes          = ARRAY[
        'Giải đề 4 kỹ năng ổn định dưới áp lực thời gian',
        'Ngữ pháp B2+ vững cho Writing & Speaking'
      ],
      target_audience   = 'Mục tiêu 6.0: vốn từ B1+ đã nắm cấu trúc đề hoặc đã thi 5.0 - 5.5' || E'\n' ||
                          'Mục tiêu 6.5+: vốn từ B2+ và đã nắm cấu trúc đề, hoặc đã thi 6.0',
      problem_solving   = '- Củng cố kỹ năng giải đề 4 kỹ năng dưới áp lực thời gian' || E'\n' ||
                          '- Phát triển ngữ pháp lên B2+ cho Writing & Speaking',
      price_vnd         = 6490000,
      duration_label    = '2 tháng',
      total_sessions    = 16,
      hours_per_session = 2.0,
      max_students      = 12,
      cefr_range        = 'B1 - B2',
      sort_order        = 7,
      status            = 'active'
    WHERE program_id = v_program_id AND name = 'RK2 - Ra Khơi 2';
  ELSE
    INSERT INTO public.courses (program_id, name, description, long_description, outcomes,
                                target_audience, problem_solving, price_vnd, duration_label,
                                total_sessions, hours_per_session, max_students, cefr_range,
                                sort_order, status, color_key, icon_key)
    VALUES (v_program_id, 'RK2 - Ra Khơi 2',
      'Củng cố giải đề IELTS, target band 6.0 - 6.5.',
      'Củng cố kỹ năng giải đề 4 kỹ năng dưới áp lực thời gian. Tập trung phát triển ngữ pháp B2+ cho Writing & Speaking.',
      ARRAY['Giải đề 4 kỹ năng ổn định dưới áp lực thời gian',
            'Ngữ pháp B2+ vững cho Writing & Speaking'],
      'Mục tiêu 6.0: vốn từ B1+ đã nắm cấu trúc đề hoặc đã thi 5.0 - 5.5' || E'\n' ||
      'Mục tiêu 6.5+: vốn từ B2+ và đã nắm cấu trúc đề, hoặc đã thi 6.0',
      '- Củng cố kỹ năng giải đề 4 kỹ năng dưới áp lực thời gian' || E'\n' ||
      '- Phát triển ngữ pháp lên B2+ cho Writing & Speaking',
      6490000, '2 tháng', 16, 2.0, 12, 'B1 - B2', 7, 'active', 'indigo', 'ship');
  END IF;

  IF EXISTS (SELECT 1 FROM public.courses WHERE program_id = v_program_id AND name = 'RK3 - Ra Khơi 3') THEN
    UPDATE public.courses SET
      description       = 'Mài giũa IELTS, target band 6.5 - 7.5+.',
      long_description  = 'Mài giũa kỹ năng giải đề 4 kỹ năng dưới áp lực thời gian. Phát triển vốn từ B2+ trong các chủ đề thường gặp nhất cho Writing & Speaking.',
      outcomes          = ARRAY[
        'Giải đề thuần thục dưới áp lực thời gian',
        'Vốn từ B2+ chủ đề IELTS phổ biến cho Writing & Speaking'
      ],
      target_audience   = '- Vốn từ vựng và ngữ pháp tương đương B2+' || E'\n' ||
                          '- Đã nắm vững cấu trúc đề và cách làm bài theo tư duy IELTS' || E'\n' ||
                          '- Hoặc đã thi IELTS được 6.0+',
      problem_solving   = '- Mài giũa kỹ năng giải đề 4 kỹ năng dưới áp lực thời gian' || E'\n' ||
                          '- Phát triển vốn từ B2+ trong các chủ đề IELTS phổ biến',
      price_vnd         = 7490000,
      duration_label    = '2 tháng',
      total_sessions    = 16,
      hours_per_session = 2.0,
      max_students      = 12,
      cefr_range        = 'B2 - C1',
      sort_order        = 8,
      status            = 'active'
    WHERE program_id = v_program_id AND name = 'RK3 - Ra Khơi 3';
  ELSE
    INSERT INTO public.courses (program_id, name, description, long_description, outcomes,
                                target_audience, problem_solving, price_vnd, duration_label,
                                total_sessions, hours_per_session, max_students, cefr_range,
                                sort_order, status, color_key, icon_key)
    VALUES (v_program_id, 'RK3 - Ra Khơi 3',
      'Mài giũa IELTS, target band 6.5 - 7.5+.',
      'Mài giũa kỹ năng giải đề 4 kỹ năng dưới áp lực thời gian. Phát triển vốn từ B2+ trong các chủ đề thường gặp nhất cho Writing & Speaking.',
      ARRAY['Giải đề thuần thục dưới áp lực thời gian',
            'Vốn từ B2+ chủ đề IELTS phổ biến cho Writing & Speaking'],
      '- Vốn từ vựng và ngữ pháp tương đương B2+' || E'\n' ||
      '- Đã nắm vững cấu trúc đề và cách làm bài theo tư duy IELTS' || E'\n' ||
      '- Hoặc đã thi IELTS được 6.0+',
      '- Mài giũa kỹ năng giải đề 4 kỹ năng dưới áp lực thời gian' || E'\n' ||
      '- Phát triển vốn từ B2+ trong các chủ đề IELTS phổ biến',
      7490000, '2 tháng', 16, 2.0, 12, 'B2 - C1', 8, 'active', 'violet', 'ship');
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Seed 3 mẫu Study Plan + entries + link course_study_plans
--    Tên mẫu giữ ngắn (không có "IELTS" prefix vì program đã chỉ rõ).
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_cb_course   uuid;
  v_dg1_course  uuid;
  v_ls1_course  uuid;
  v_cb_tpl      uuid;
  v_dg1_tpl     uuid;
  v_ls1_tpl     uuid;
  v_program_id  uuid;
BEGIN
  SELECT id INTO v_program_id FROM public.programs WHERE lower(key) = 'ielts' LIMIT 1;
  IF v_program_id IS NULL THEN
    RAISE NOTICE 'Không có program IELTS — bỏ qua seed templates.';
    RETURN;
  END IF;

  SELECT id INTO v_cb_course  FROM public.courses
    WHERE program_id = v_program_id AND name = 'CB - Căng Buồm'   LIMIT 1;
  SELECT id INTO v_dg1_course FROM public.courses
    WHERE program_id = v_program_id AND name = 'DG1 - Đón Gió 1' LIMIT 1;
  SELECT id INTO v_ls1_course FROM public.courses
    WHERE program_id = v_program_id AND name = 'LS1 - Lướt Sóng 1' LIMIT 1;

  -- ---------- Template 1: CB - Căng Buồm (24 buổi) ----------
  SELECT id INTO v_cb_tpl FROM public.study_plan_templates
    WHERE template_name = 'CB - Căng Buồm' AND lower(program) = 'ielts' LIMIT 1;
  IF v_cb_tpl IS NULL THEN
    INSERT INTO public.study_plan_templates
      (template_name, description, program, plan_type, total_sessions, session_duration,
       skills, schedule_pattern, course_id, status)
    VALUES (
      'CB - Căng Buồm',
      'Mẫu kế hoạch 24 buổi cho khoá nền tảng Căng Buồm — Reading/Listening luân phiên với Writing/Speaking theo chủ đề Study, Work, Holidays, Health, Possessions.',
      'ielts', 'structured', 24, 120,
      '["reading","listening","writing","speaking","grammar"]'::jsonb,
      '{"type":"weekly","days":["mon","wed","fri"]}'::jsonb,
      v_cb_course, 'active'
    ) RETURNING id INTO v_cb_tpl;
  END IF;

  -- Always reset entries for idempotency on this template
  DELETE FROM public.study_plan_template_entries WHERE template_id = v_cb_tpl;
  INSERT INTO public.study_plan_template_entries
    (template_id, session_order, day_offset, session_type, skills, class_note)
  VALUES
    (v_cb_tpl,  1, 0,   'lesson', '["reading","writing"]'::jsonb,  'Reading: Family · Writing: Sentence Basics'),
    (v_cb_tpl,  2, 2,   'lesson', '["listening","speaking"]'::jsonb,'Listening: Family · Speaking: Family'),
    (v_cb_tpl,  3, 4,   'lesson', '["reading","writing"]'::jsonb,  'Reading: Daily Routines · Writing: Present Simple'),
    (v_cb_tpl,  4, 7,   'lesson', '["listening","speaking"]'::jsonb,'Listening: Daily Routines · Speaking: Daily Routines'),
    (v_cb_tpl,  5, 9,   'lesson', '["reading","writing"]'::jsonb,  'Reading: Hobbies · Writing: Likes & Dislikes'),
    (v_cb_tpl,  6, 11,  'lesson', '["listening","speaking"]'::jsonb,'Listening: Hobbies · Speaking: Hobbies'),
    (v_cb_tpl,  7, 14,  'lesson', '["reading","writing"]'::jsonb,  'Reading: Food · Writing: Describing Food'),
    (v_cb_tpl,  8, 16,  'lesson', '["listening","speaking"]'::jsonb,'Listening: Food · Speaking: Food'),
    (v_cb_tpl,  9, 18,  'lesson', '["reading","writing"]'::jsonb,  'Reading: Travel · Writing: Past Simple'),
    (v_cb_tpl, 10, 21,  'lesson', '["listening","speaking"]'::jsonb,'Listening: Travel · Speaking: Travel'),
    (v_cb_tpl, 11, 23,  'lesson', '["reading","writing"]'::jsonb,  'Reading: City Life · Writing: Comparatives'),
    (v_cb_tpl, 12, 25,  'lesson', '["listening","speaking"]'::jsonb,'Listening: City Life · Speaking: City Life'),
    (v_cb_tpl, 13, 28,  'lesson', '["reading","writing"]'::jsonb,  'Reading: Study · Writing about the Past: Past Simple Tense'),
    (v_cb_tpl, 14, 30,  'lesson', '["listening","speaking"]'::jsonb,'Listening: Study · Speaking: Study'),
    (v_cb_tpl, 15, 32,  'lesson', '["reading","writing"]'::jsonb,  'Reading: Work · Writing about the Past: Complex Sentence'),
    (v_cb_tpl, 16, 35,  'lesson', '["listening","speaking"]'::jsonb,'Listening: Work · Speaking: Work'),
    (v_cb_tpl, 17, 37,  'lesson', '["reading","writing"]'::jsonb,  'Reading: Holidays · Writing about the Future'),
    (v_cb_tpl, 18, 39,  'lesson', '["listening","speaking"]'::jsonb,'Listening: Holidays · Speaking: Holidays'),
    (v_cb_tpl, 19, 42,  'lesson', '["reading","writing"]'::jsonb,  'Reading: Health · Writing Complex Sentences with Adjective Clauses'),
    (v_cb_tpl, 20, 44,  'lesson', '["listening","speaking"]'::jsonb,'Listening: Health · Speaking: Health'),
    (v_cb_tpl, 21, 46,  'lesson', '["reading","writing"]'::jsonb,  'Reading: Possessions · Putting It All Together and Preparing for More'),
    (v_cb_tpl, 22, 49,  'lesson', '["listening","speaking"]'::jsonb,'Listening: Possessions · Speaking: Possessions'),
    (v_cb_tpl, 23, 51,  'test',   '["reading","listening","writing","speaking"]'::jsonb, 'FINAL TEST'),
    (v_cb_tpl, 24, 53,  'review', '[]'::jsonb, '1-1 CONSULTATION');

  -- ---------- Template 2: DG1 - Đón Gió 1 (12 buổi) ----------
  SELECT id INTO v_dg1_tpl FROM public.study_plan_templates
    WHERE template_name = 'DG1 - Đón Gió 1' AND lower(program) = 'ielts' LIMIT 1;
  IF v_dg1_tpl IS NULL THEN
    INSERT INTO public.study_plan_templates
      (template_name, description, program, plan_type, total_sessions, session_duration,
       skills, schedule_pattern, course_id, status)
    VALUES (
      'DG1 - Đón Gió 1',
      'Mẫu kế hoạch 12 buổi cho khoá Đón Gió 1 — Reading IELTS Academic + Writing Task 1 (Process Diagrams, Maps, Graphs, Comparative Charts).',
      'ielts', 'structured', 12, 120,
      '["reading","writing"]'::jsonb,
      '{"type":"weekly","days":["mon","wed","fri"]}'::jsonb,
      v_dg1_course, 'active'
    ) RETURNING id INTO v_dg1_tpl;
  END IF;
  DELETE FROM public.study_plan_template_entries WHERE template_id = v_dg1_tpl;
  INSERT INTO public.study_plan_template_entries
    (template_id, session_order, day_offset, session_type, skills, class_note)
  VALUES
    (v_dg1_tpl,  1, 0,  'lesson', '["reading","writing"]'::jsonb, 'IELTS Academic Test Format · Unit 1 - Skimming & Scanning · Writing Unit 1 - Process Diagrams'),
    (v_dg1_tpl,  2, 2,  'lesson', '["reading","writing"]'::jsonb, 'Unit 2 - Homes / Sentence Completion · Writing Unit 1 - Process Diagrams'),
    (v_dg1_tpl,  3, 4,  'lesson', '["reading","writing"]'::jsonb, 'Unit 3 - Cities / Table Completion · Writing Unit 2 - Maps'),
    (v_dg1_tpl,  4, 7,  'lesson', '["reading","writing"]'::jsonb, 'Unit 4 - Evolution / Summary Completion · Writing Unit 2 - Maps'),
    (v_dg1_tpl,  5, 9,  'lesson', '["reading","writing"]'::jsonb, 'Unit 5 - Pioneers / Flow-chart Completion · Writing Unit 3 - Review Process Diagram & Maps'),
    (v_dg1_tpl,  6, 11, 'lesson', '["reading","writing"]'::jsonb, 'Unit 6 - Commerce / Diagram Label Completion · Writing Unit 4 - Graphs with Trends'),
    (v_dg1_tpl,  7, 14, 'lesson', '["reading","writing"]'::jsonb, 'Unit 7 - Review (1) · Writing Unit 4 - Graphs with Trends'),
    (v_dg1_tpl,  8, 16, 'lesson', '["reading","writing"]'::jsonb, 'Unit 8 - Relationships / Short-answer · Writing Unit 5 - Comparative Charts'),
    (v_dg1_tpl,  9, 18, 'lesson', '["reading","writing"]'::jsonb, 'Unit 9 - Festivals / True-False-Not given · Writing Unit 5 - Comparative Charts'),
    (v_dg1_tpl, 10, 21, 'lesson', '["reading","writing"]'::jsonb, 'Unit 10 - Conservation / Yes-No-Not given · Writing Unit 6 - Multiple Charts'),
    (v_dg1_tpl, 11, 23, 'lesson', '["reading","writing"]'::jsonb, 'Unit 11 - Review (2) · Writing Unit 7 - Review Graphs with Trends & Comparative Charts'),
    (v_dg1_tpl, 12, 25, 'test',   '["reading","writing"]'::jsonb, 'FINAL TEST');

  -- ---------- Template 3: LS1 - Lướt Sóng 1 (12 buổi) ----------
  SELECT id INTO v_ls1_tpl FROM public.study_plan_templates
    WHERE template_name = 'LS1 - Lướt Sóng 1' AND lower(program) = 'ielts' LIMIT 1;
  IF v_ls1_tpl IS NULL THEN
    INSERT INTO public.study_plan_templates
      (template_name, description, program, plan_type, total_sessions, session_duration,
       skills, schedule_pattern, course_id, status)
    VALUES (
      'LS1 - Lướt Sóng 1',
      'Mẫu kế hoạch 12 buổi cho khoá Lướt Sóng 1 — Listening cơ bản + Speaking Part 1, 2, 3 với Present/Past Simple, Present Perfect.',
      'ielts', 'structured', 12, 120,
      '["listening","speaking"]'::jsonb,
      '{"type":"weekly","days":["mon","wed","fri"]}'::jsonb,
      v_ls1_course, 'active'
    ) RETURNING id INTO v_ls1_tpl;
  END IF;
  DELETE FROM public.study_plan_template_entries WHERE template_id = v_ls1_tpl;
  INSERT INTO public.study_plan_template_entries
    (template_id, session_order, day_offset, session_type, skills, class_note)
  VALUES
    (v_ls1_tpl,  1, 0,  'lesson', '["listening","speaking"]'::jsonb, 'Unit 1 - Studies · Listening for names, dates & numbers · Speaking Part 1 - Present Simple'),
    (v_ls1_tpl,  2, 2,  'lesson', '["listening","speaking"]'::jsonb, 'Unit 2 - Places / Form Completion · Speaking Part 1 - Present Simple'),
    (v_ls1_tpl,  3, 4,  'lesson', '["listening","speaking"]'::jsonb, 'Unit 3 - Jobs / Sentence Completion · Speaking Part 1&2 - Present Simple'),
    (v_ls1_tpl,  4, 7,  'lesson', '["listening","speaking"]'::jsonb, 'Unit 4 - Food / Matching · Speaking Part 2 - Present Simple'),
    (v_ls1_tpl,  5, 9,  'lesson', '["listening","speaking"]'::jsonb, 'Unit 5 - People / Flow-chart Completion · Speaking Part 2 - Past Simple'),
    (v_ls1_tpl,  6, 11, 'review', '["listening","speaking"]'::jsonb, 'Unit 6 - Review (Listening + Speaking)'),
    (v_ls1_tpl,  7, 14, 'lesson', '["listening","speaking"]'::jsonb, 'Unit 7 - Travelling / Plan/Map/Diagram Labelling · Speaking Part 1&2 - Past Simple'),
    (v_ls1_tpl,  8, 16, 'lesson', '["listening","speaking"]'::jsonb, 'Unit 8 - Shopping / Multiple Choice · Speaking Part 3'),
    (v_ls1_tpl,  9, 18, 'lesson', '["listening","speaking"]'::jsonb, 'Unit 9 - Zoo / Table Completion · Speaking Part 3 - Present Perfect'),
    (v_ls1_tpl, 10, 21, 'lesson', '["listening","speaking"]'::jsonb, 'Unit 10 - Wildlife / Note Completion · Speaking Part 3'),
    (v_ls1_tpl, 11, 23, 'review', '["listening","speaking"]'::jsonb, 'Unit 11 - Review (Listening + Speaking)'),
    (v_ls1_tpl, 12, 25, 'test',   '["listening","speaking"]'::jsonb, 'FINAL TEST');

  -- ---------- Liên kết course ↔ template (course_study_plans) ----------
  -- Xoá link cũ với 3 template này để tránh trùng, rồi insert lại mặc định.
  IF v_cb_tpl IS NOT NULL AND v_cb_course IS NOT NULL THEN
    DELETE FROM public.course_study_plans WHERE template_id = v_cb_tpl;
    INSERT INTO public.course_study_plans (course_id, template_id, is_default, sort_order)
      VALUES (v_cb_course, v_cb_tpl, true, 0);
  END IF;
  IF v_dg1_tpl IS NOT NULL AND v_dg1_course IS NOT NULL THEN
    DELETE FROM public.course_study_plans WHERE template_id = v_dg1_tpl;
    INSERT INTO public.course_study_plans (course_id, template_id, is_default, sort_order)
      VALUES (v_dg1_course, v_dg1_tpl, true, 0);
  END IF;
  IF v_ls1_tpl IS NOT NULL AND v_ls1_course IS NOT NULL THEN
    DELETE FROM public.course_study_plans WHERE template_id = v_ls1_tpl;
    INSERT INTO public.course_study_plans (course_id, template_id, is_default, sort_order)
      VALUES (v_ls1_course, v_ls1_tpl, true, 0);
  END IF;
END $$;