## Bối cảnh project (rất quan trọng)

- Tôi là non-coder, làm việc theo phong cách "vibe coding"
- Tôi dùng Lovable làm công cụ chính để phát triển. GitHub sync 2 chiều với Lovable.
- Project này (learningsuperadmin) là Super Admin Portal — dành cho cấp quản lý cao nhất
- Tôi có 2 project khác liên quan:
  - ieltspractice: Student Portal — chứa toàn bộ DB Supabase chính (migrations, edge functions, schema chính)
  - teachingwithlearningplus: Teacher Portal — own một số bảng riêng (teacher_availability_*, teacher_capabilities)
- Cả 3 portal dùng chung Supabase backend
- Tôi KHÔNG có quyền truy cập Supabase dashboard. Supabase chỉ chạy được qua Lovable.

## Quy tắc làm việc với tôi

- Luôn trả lời tôi bằng tiếng Việt
- Giải thích "tại sao" trước khi làm, đừng chỉ làm
- Trước khi sửa nhiều file hoặc thay đổi lớn, hỏi tôi xác nhận trước
- KHÔNG được tự ý chạy `npm audit fix --force` hoặc nâng cấp dependencies
- KHÔNG được sửa schema database, RLS policies, edge functions, hoặc migrations — những việc đó tôi sẽ làm bên repo ieltspractice qua Lovable
- Khi commit, viết commit message rõ ràng bằng tiếng Anh ngắn gọn
- Trước khi push lên GitHub, luôn hỏi tôi trước

## Quy tắc kỹ thuật bắt buộc

- TRƯỚC khi sửa feature lớn: kiểm tra xem có thư mục `.lovable/memory/` hoặc file SCHEMA-OWNERSHIP.md không, nếu có thì đọc trước
- KHÔNG sửa file `src/integrations/supabase/types.ts` (auto-gen)
- KHÔNG sửa file `src/integrations/lovable/index.ts` nếu có (auto-gen)
- KHÔNG sửa file SQL nếu repo có thư mục migrations — chỉ Lovable mới apply được
- LƯU Ý: portal này có thể quản lý người dùng/giáo viên/admin cấp cao. Khi sửa logic phân quyền, cẩn thận vì có thể ảnh hưởng cả 3 portal
- KHI sửa code chia sẻ với 2 portal kia: cảnh báo tôi
- KHI cần component UI mới: ưu tiên shadcn CLI nếu repo có sẵn, không tự viết từ đầu
