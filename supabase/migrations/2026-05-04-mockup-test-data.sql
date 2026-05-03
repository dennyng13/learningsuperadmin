-- =========================================================================
-- MOCKUP DATA for Testing - Admin/Teacher/Super Admin Flows
-- =========================================================================
-- Purpose: Create test class with students linked to info@learningplus.vn
-- User: info@learningplus.vn (Super Admin + Teacher)
--
-- Prerequisites:
--   - User info@learningplus.vn must exist in auth.users
--   - Run this AFTER linking the user as teacher
-- =========================================================================

-- =========================================================================
-- SECTION 1: Setup info@learningplus.vn as Teacher (if not exists)
-- =========================================================================

-- First, get the user_id for info@learningplus.vn
-- (run this manually to verify)
-- SELECT id, email FROM auth.users WHERE email = 'info@learningplus.vn';

-- Create teacher record if not exists (using ON CONFLICT)
INSERT INTO public.teachers (
  id, full_name, email, phone, linked_user_id, status,
  teaching_mode, max_hours_per_week, bio, created_at, updated_at
)
SELECT 
  gen_random_uuid(),
  'Admin Teacher',
  'info@learningplus.vn',
  '0901234567',
  (SELECT id FROM auth.users WHERE email = 'info@learningplus.vn' LIMIT 1),
  'active',
  'both',
  40,
  'Super Admin with Teacher role for testing',
  now(),
  now()
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'info@learningplus.vn')
  AND NOT EXISTS (
    SELECT 1 FROM public.teachers 
    WHERE email = 'info@learningplus.vn' 
    OR linked_user_id = (SELECT id FROM auth.users WHERE email = 'info@learningplus.vn' LIMIT 1)
  );

-- =========================================================================
-- SECTION 2: Create Test Class
-- =========================================================================

-- Create a test class
INSERT INTO public.app_classes (
  id, class_name, class_code, program_id, level, 
  status, schedule, start_date, end_date, class_type, max_students,
  created_at, updated_at
)
SELECT 
  gen_random_uuid(),
  'IELTS Mock Test Class A',
  'IELTS-MOCK-A-2025',
  (SELECT id FROM public.app_programs WHERE program_code = 'ielts' LIMIT 1),
  'intermediate',
  'active',
  '{"monday":"18:00-20:00","wednesday":"18:00-20:00"}',
  '2025-05-01',
  '2025-08-31',
  'group',
  10,
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.app_classes WHERE class_code = 'IELTS-MOCK-A-2025'
);

-- Link teacher to class
INSERT INTO public.app_class_teachers (
  id, class_id, teacher_id, is_primary, is_active, created_at
)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM public.app_classes WHERE class_code = 'IELTS-MOCK-A-2025' LIMIT 1),
  (SELECT id FROM public.teachers WHERE email = 'info@learningplus.vn' LIMIT 1),
  true,
  true,
  now()
WHERE EXISTS (SELECT 1 FROM public.app_classes WHERE class_code = 'IELTS-MOCK-A-2025')
  AND EXISTS (SELECT 1 FROM public.teachers WHERE email = 'info@learningplus.vn')
  AND NOT EXISTS (
    SELECT 1 FROM public.app_class_teachers 
    WHERE class_id = (SELECT id FROM public.app_classes WHERE class_code = 'IELTS-MOCK-A-2025' LIMIT 1)
    AND teacher_id = (SELECT id FROM public.teachers WHERE email = 'info@learningplus.vn' LIMIT 1)
  );

-- =========================================================================
-- SECTION 3: Create Mock Students
-- =========================================================================

-- Student 1: Active linked user
INSERT INTO public.app_students (
  id, full_name, email, student_code, linked_user_id,
  phone, current_level, target_band, entry_band, is_active, status,
  enrollment_date, created_at, updated_at
)
SELECT 
  gen_random_uuid(),
  'Nguyễn Văn Test',
  'student1.test@example.com',
  'STU001',
  (SELECT id FROM auth.users WHERE email = 'student1.test@example.com' LIMIT 1),
  '0901111111',
  'intermediate',
  7.0,
  5.5,
  true,
  'active',
  '2025-01-15',
  now(),
  now()
WHERE NOT EXISTS (SELECT 1 FROM public.app_students WHERE student_code = 'STU001');

-- Student 2: Active (not linked to user - guest can claim)
INSERT INTO public.app_students (
  id, full_name, email, student_code, linked_user_id,
  phone, current_level, target_band, entry_band, is_active, status,
  enrollment_date, created_at, updated_at
)
SELECT 
  gen_random_uuid(),
  'Trần Thị Demo',
  'student2.demo@example.com',
  'STU002',
  NULL, -- Not linked yet - can be claimed by guest
  '0902222222',
  'beginner',
  6.5,
  4.5,
  true,
  'active',
  '2025-02-01',
  now(),
  now()
WHERE NOT EXISTS (SELECT 1 FROM public.app_students WHERE student_code = 'STU002');

-- Student 3: Active
INSERT INTO public.app_students (
  id, full_name, email, student_code, linked_user_id,
  phone, current_level, target_band, entry_band, is_active, status,
  enrollment_date, created_at, updated_at
)
SELECT 
  gen_random_uuid(),
  'Lê Văn Sample',
  'student3.sample@example.com',
  'STU003',
  NULL,
  '0903333333',
  'advanced',
  8.0,
  7.0,
  true,
  'active',
  '2025-03-01',
  now(),
  now()
WHERE NOT EXISTS (SELECT 1 FROM public.app_students WHERE student_code = 'STU003');

-- =========================================================================
-- SECTION 4: Enroll Students in Class
-- =========================================================================

-- Enroll Student 1
INSERT INTO public.app_class_students (
  id, class_id, student_id, status, enrollment_date, created_at
)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM public.app_classes WHERE class_code = 'IELTS-MOCK-A-2025' LIMIT 1),
  (SELECT id FROM public.app_students WHERE student_code = 'STU001' LIMIT 1),
  'active',
  '2025-05-01',
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.app_class_students 
  WHERE class_id = (SELECT id FROM public.app_classes WHERE class_code = 'IELTS-MOCK-A-2025' LIMIT 1)
  AND student_id = (SELECT id FROM public.app_students WHERE student_code = 'STU001' LIMIT 1)
);

-- Enroll Student 2
INSERT INTO public.app_class_students (
  id, class_id, student_id, status, enrollment_date, created_at
)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM public.app_classes WHERE class_code = 'IELTS-MOCK-A-2025' LIMIT 1),
  (SELECT id FROM public.app_students WHERE student_code = 'STU002' LIMIT 1),
  'active',
  '2025-05-01',
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.app_class_students 
  WHERE class_id = (SELECT id FROM public.app_classes WHERE class_code = 'IELTS-MOCK-A-2025' LIMIT 1)
  AND student_id = (SELECT id FROM public.app_students WHERE student_code = 'STU002' LIMIT 1)
);

-- Enroll Student 3
INSERT INTO public.app_class_students (
  id, class_id, student_id, status, enrollment_date, created_at
)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM public.app_classes WHERE class_code = 'IELTS-MOCK-A-2025' LIMIT 1),
  (SELECT id FROM public.app_students WHERE student_code = 'STU003' LIMIT 1),
  'active',
  '2025-05-01',
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.app_class_students 
  WHERE class_id = (SELECT id FROM public.app_classes WHERE class_code = 'IELTS-MOCK-A-2025' LIMIT 1)
  AND student_id = (SELECT id FROM public.app_students WHERE student_code = 'STU003' LIMIT 1)
);

-- =========================================================================
-- SECTION 5: Create Test Sessions for Leave/Makeup Requests
-- =========================================================================

-- Create some past sessions (for leave request history)
INSERT INTO public.class_sessions (
  id, class_id, session_date, start_time, end_time, 
  room, mode, status, teacher_id, created_at
)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM public.app_classes WHERE class_code = 'IELTS-MOCK-A-2025' LIMIT 1),
  '2025-05-01', -- Past date
  '18:00:00',
  '20:00:00',
  'Room A101',
  'offline',
  'completed',
  (SELECT id FROM public.teachers WHERE email = 'info@learningplus.vn' LIMIT 1),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.class_sessions 
  WHERE class_id = (SELECT id FROM public.app_classes WHERE class_code = 'IELTS-MOCK-A-2025' LIMIT 1)
  AND session_date = '2025-05-01'
);

-- Create future sessions (for makeup requests)
INSERT INTO public.class_sessions (
  id, class_id, session_date, start_time, end_time,
  room, mode, status, teacher_id, created_at
)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM public.app_classes WHERE class_code = 'IELTS-MOCK-A-2025' LIMIT 1),
  '2025-05-15', -- Future date
  '18:00:00',
  '20:00:00',
  'Room A102',
  'offline',
  'scheduled',
  (SELECT id FROM public.teachers WHERE email = 'info@learningplus.vn' LIMIT 1),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.class_sessions 
  WHERE class_id = (SELECT id FROM public.app_classes WHERE class_code = 'IELTS-MOCK-A-2025' LIMIT 1)
  AND session_date = '2025-05-15'
);

-- =========================================================================
-- SECTION 6: Create Sample Student Requests
-- =========================================================================

-- Sample Leave Request (pending)
INSERT INTO public.student_leave_request (
  id, user_id, class_id, session_id, reason, status, created_at, updated_at
)
SELECT 
  gen_random_uuid(),
  (SELECT linked_user_id FROM public.app_students WHERE student_code = 'STU001' LIMIT 1),
  (SELECT id FROM public.app_classes WHERE class_code = 'IELTS-MOCK-A-2025' LIMIT 1),
  (SELECT id FROM public.class_sessions WHERE session_date = '2025-05-01' LIMIT 1),
  'Xin nghỉ vì bận việc gia đình',
  'pending',
  now(),
  now()
WHERE (SELECT linked_user_id FROM public.app_students WHERE student_code = 'STU001' LIMIT 1) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.student_leave_request 
    WHERE user_id = (SELECT linked_user_id FROM public.app_students WHERE student_code = 'STU001' LIMIT 1)
    AND status = 'pending'
  );

-- Sample Makeup Request (pending)
INSERT INTO public.student_makeup_request (
  id, user_id, class_id, original_session_id, 
  proposed_date, proposed_start_time, proposed_end_time,
  proposed_room, proposed_mode, reason, status, created_at, updated_at
)
SELECT 
  gen_random_uuid(),
  (SELECT linked_user_id FROM public.app_students WHERE student_code = 'STU001' LIMIT 1),
  (SELECT id FROM public.app_classes WHERE class_code = 'IELTS-MOCK-A-2025' LIMIT 1),
  (SELECT id FROM public.class_sessions WHERE session_date = '2025-05-01' LIMIT 1),
  '2025-05-10',
  '14:00:00',
  '16:00:00',
  'Room B202',
  'offline',
  'Xin học bù buổi ngày 01/05',
  'pending',
  now(),
  now()
WHERE (SELECT linked_user_id FROM public.app_students WHERE student_code = 'STU001' LIMIT 1) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.student_makeup_request 
    WHERE user_id = (SELECT linked_user_id FROM public.app_students WHERE student_code = 'STU001' LIMIT 1)
    AND status = 'pending'
  );

-- =========================================================================
-- VERIFICATION QUERIES (Run these to verify setup)
-- =========================================================================

-- 1. Check teacher setup
-- SELECT t.id, t.full_name, t.email, t.linked_user_id, u.email as user_email
-- FROM public.teachers t
-- LEFT JOIN auth.users u ON t.linked_user_id = u.id
-- WHERE t.email = 'info@learningplus.vn';

-- 2. Check class and enrollments
-- SELECT c.class_name, c.class_code, COUNT(cs.id) as student_count
-- FROM public.app_classes c
-- LEFT JOIN public.app_class_students cs ON c.id = cs.class_id AND cs.status = 'active'
-- WHERE c.class_code = 'IELTS-MOCK-A-2025'
-- GROUP BY c.id;

-- 3. Check students in class
-- SELECT s.student_code, s.full_name, s.email, s.linked_user_id IS NOT NULL as is_linked
-- FROM public.app_class_students cs
-- JOIN public.app_students s ON cs.student_id = s.id
-- JOIN public.app_classes c ON cs.class_id = c.id
-- WHERE c.class_code = 'IELTS-MOCK-A-2025';

-- 4. Check pending requests for admin
-- SELECT * FROM public.v_pending_student_requests;
