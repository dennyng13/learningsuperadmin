-- Chỉ giữ 3 chương trình: IELTS, WRE, Customized.
-- Các chương trình khác chuyển sang 'inactive' (không xóa để bảo toàn dữ liệu liên quan).
-- Đồng thời chuẩn hóa sort_order: IELTS=1, WRE=2, Customized=3.

UPDATE public.programs
SET status = 'inactive'
WHERE lower(key) NOT IN ('ielts', 'wre', 'customized');

UPDATE public.programs SET status = 'active', sort_order = 1 WHERE lower(key) = 'ielts';
UPDATE public.programs SET status = 'active', sort_order = 2 WHERE lower(key) = 'wre';
UPDATE public.programs SET status = 'active', sort_order = 3 WHERE lower(key) = 'customized';
