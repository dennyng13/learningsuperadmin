# Test Setup Guide - Account Types & Mockup Data

## Account Types Overview

### 1. Super Admin + Teacher (info@learningplus.vn)
- **Email**: info@learningplus.vn
- **Roles**: super_admin, teacher
- **Use case**: Quản lý toàn hệ thống + dạy học
- **Teacher ID**: Có (gắn với teachers.id)

### 2. Admin
- **Role**: admin
- **Use case**: Quản lý nhưng không có quyền super_admin

### 3. Teacher
- **Role**: teacher
- **Use case**: Chỉ dạy học, không quản lý

### 4. Student (Linked)
- **Role**: student
- **Linked**: app_students.linked_user_id = auth.users.id
- **Use case**: Học sinh đã có account, có thể đăng nhập

### 5. Guest → Student Upgrade
- **Role**: (none initially)
- **Linked**: NULL (chưa link với user)
- **Use case**: Guest đăng ký → claim student record → linked_user_id được cập nhật

---

## Setup Steps

### Step 1: Create Auth Users (Supabase Dashboard)

Vào **Supabase Dashboard → Authentication → Add User**:

1. **Super Admin Teacher**:
   ```
   Email: info@learningplus.vn (đã có)
   Password: (your existing password)
   ```

2. **Student Test Account** (để test student portal):
   ```
   Email: student1.test@example.com
   Password: Test123456!
   ```

3. **Regular Teacher** (không phải admin):
   ```
   Email: teacher.regular@example.com
   Password: Test123456!
   ```

### Step 2: Set User Roles

Vào **SQL Editor**:

```sql
-- Get user IDs first
SELECT id, email FROM auth.users WHERE email IN (
  'info@learningplus.vn',
  'student1.test@example.com',
  'teacher.regular@example.com'
);

-- Then insert roles (replace UUIDs from above query)
INSERT INTO public.user_roles (user_id, role) VALUES
  ('uuid-info@learningplus.vn', 'super_admin'),
  ('uuid-info@learningplus.vn', 'teacher'),      -- Dual role
  ('uuid-student1.test@example.com', 'student'),
  ('uuid-teacher.regular@example.com', 'teacher');
```

### Step 3: Run Mockup Migration

File: `supabase/migrations/2026-05-04-mockup-test-data.sql`

```sql
-- Chạy toàn bộ file SQL trong Supabase SQL Editor
```

### Step 4: Link Student to User

```sql
-- Link student1.test@example.com to STU001
UPDATE public.app_students
SET linked_user_id = (SELECT id FROM auth.users WHERE email = 'student1.test@example.com')
WHERE student_code = 'STU001';
```

---

## Test Scenarios

### Scenario 1: Super Admin Teacher View
**Login**: info@learningplus.vn
**Expected**:
- Admin Portal: Full access
- Teacher Portal: Thấy lớp IELTS-MOCK-A-2025 + 3 học sinh
- Requests Inbox: Thấy student leave/makeup requests

### Scenario 2: Student Leave Request
**Login**: student1.test@example.com
**Expected**:
- Student Portal: Thấy lớp IELTS-MOCK-A-2025
- Có thể tạo leave request cho buổi 01/05
- Có thể tạo makeup request

### Scenario 3: Admin Approves Request
**Login**: info@learningplus.vn (hoặc admin khác)
- Admin Portal → Requests → Student Leave tab
- Duyệt/từ chối request của STU001

### Scenario 4: Guest Claims Student Record
**Flow**:
1. Guest đăng ký account với email student2.demo@example.com
2. Vào profile → "Claim Student Record"
3. Nhập student_code = STU002
4. System cập nhật linked_user_id

---

## Database Schema Summary

```
auth.users (Supabase Auth)
  ↓ linked_user_id
app_students (student profile)
  ↓ student_id
app_class_students (enrollment)
  ↓ class_id
app_classes (class info)
  ↓ class_id
app_class_teachers (teacher assignment)
  ↓ teacher_id
teachers (teacher profile)
  ↓ linked_user_id
auth.users (Supabase Auth)
```

---

## Cleanup (if needed)

```sql
-- Remove test data (run in order)
DELETE FROM public.student_makeup_request WHERE created_at > '2025-05-01';
DELETE FROM public.student_leave_request WHERE created_at > '2025-05-01';
DELETE FROM public.app_class_students 
WHERE class_id IN (SELECT id FROM public.app_classes WHERE class_code = 'IELTS-MOCK-A-2025');
DELETE FROM public.app_class_teachers 
WHERE class_id IN (SELECT id FROM public.app_classes WHERE class_code = 'IELTS-MOCK-A-2025');
DELETE FROM public.class_sessions 
WHERE class_id IN (SELECT id FROM public.app_classes WHERE class_code = 'IELTS-MOCK-A-2025');
DELETE FROM public.app_classes WHERE class_code = 'IELTS-MOCK-A-2025';
DELETE FROM public.app_students WHERE student_code IN ('STU001', 'STU002', 'STU003');
-- Keep teacher record for info@learningplus.vn
```

---

## Notes on Teachngo Data Migration

- **Old data**: Đã sync từ Teachngo vào bảng `app_*`
- **Current**: Teachngo không còn, data tồn tại trong Supabase
- **Legacy codes**: `legacy_student_code` trong app_students để trace về Teachngo nếu cần
- **Action needed**: None - data đã migrate xong, có thể xóa cột legacy nếu muốn
