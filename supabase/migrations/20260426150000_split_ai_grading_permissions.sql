-- Tách quyền AI chấm bài thành 2 quyền riêng (Writing / Speaking) trên teachers.
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS can_use_ai_writing  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_use_ai_speaking boolean NOT NULL DEFAULT false;

UPDATE public.teachers
SET can_use_ai_writing = true, can_use_ai_speaking = true
WHERE can_use_ai_grading IS TRUE
  AND can_use_ai_writing = false
  AND can_use_ai_speaking = false;

COMMENT ON COLUMN public.teachers.can_use_ai_writing  IS 'Cho phép giáo viên sử dụng AI chấm bài Writing';
COMMENT ON COLUMN public.teachers.can_use_ai_speaking IS 'Cho phép giáo viên sử dụng AI chấm bài Speaking';
