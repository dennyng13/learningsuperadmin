-- Add 'archived' to class_lifecycle_status enum.
-- Lớp archived = đã đóng lưu trữ vĩnh viễn (giữ toàn bộ history, không hiển
-- thị trong danh sách thường). Khác với 'cancelled' (huỷ bỏ).
ALTER TYPE public.class_lifecycle_status ADD VALUE IF NOT EXISTS 'archived';
