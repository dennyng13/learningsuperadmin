-- ============================================================================
-- AUDIT_SQL.sql — Learning Plus Platform
-- ============================================================================
-- Purpose: verify findings từ ARCHITECTURE_REVIEW.md trên live Supabase DB.
-- Usage:   Supabase Dashboard → SQL Editor → paste từng section → Run.
-- DO NOT mutate: tất cả queries đều SELECT-only. An toàn chạy trên PROD.
-- Version: 1.0  (2026-04-21)
-- ============================================================================

-- ============================================================================
-- SECTION 1 — RLS COVERAGE
-- ============================================================================
-- 1.1: Tables trong schema public CHƯA enable RLS → security hole.
-- Expected: 0 rows. Nếu có rows → bảng đó anyone có anon key có thể read/write.

SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
ORDER BY tablename;

-- 1.2: Tables có RLS enabled NHƯNG không có policy nào → DEFAULT DENY all queries.
-- Expected: 0 rows (hoặc bảng mà bạn intentionally lock).

SELECT
  t.schemaname,
  t.tablename,
  t.rowsecurity,
  COUNT(p.policyname) AS policy_count
FROM pg_tables t
LEFT JOIN pg_policies p
  ON p.schemaname = t.schemaname AND p.tablename = t.tablename
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
GROUP BY t.schemaname, t.tablename, t.rowsecurity
HAVING COUNT(p.policyname) = 0;

-- 1.3: List tất cả policies — check operations (SELECT/INSERT/UPDATE/DELETE) có đầy đủ không.
-- Look for tables có SELECT policy nhưng thiếu INSERT (user không tạo được row).

SELECT
  schemaname,
  tablename,
  policyname,
  cmd,          -- ALL, SELECT, INSERT, UPDATE, DELETE
  roles,        -- authenticated, anon, public
  qual,         -- USING clause
  with_check    -- WITH CHECK clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- 1.4: Policies dùng anon role — nguy hiểm trừ khi intentional (placement token flow).
-- Expected: small list (submit-placement-result tương ứng, v.v.)

SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND ('anon' = ANY(roles) OR 'public' = ANY(roles))
ORDER BY tablename;

-- ============================================================================
-- SECTION 2 — SECURITY DEFINER FUNCTIONS
-- ============================================================================
-- 2.1: SECURITY DEFINER functions thiếu search_path setting → search_path injection risk.
-- Expected: 0 rows (sau khi fix). Bất kỳ row nào = HIGH severity.

SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS args,
  p.prosecdef AS is_security_definer,
  COALESCE(
    array_to_string(p.proconfig, E'\n'),
    '(NO search_path SET — RISK)'
  ) AS proconfig
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true
  AND (p.proconfig IS NULL OR NOT EXISTS (
    SELECT 1 FROM unnest(p.proconfig) cfg
    WHERE cfg LIKE 'search_path=%'
  ))
ORDER BY p.proname;

-- 2.2: Tất cả SECURITY DEFINER functions — review manually xem có role check không.
-- Lý tưởng: mỗi function có IF NOT auth.uid() / IF NOT is_admin_user() guard.

SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS args,
  p.prosecdef AS is_security_definer,
  CASE p.provolatile
    WHEN 'i' THEN 'IMMUTABLE'
    WHEN 's' THEN 'STABLE'
    WHEN 'v' THEN 'VOLATILE'
  END AS volatility,
  array_to_string(p.proconfig, ', ') AS config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true
ORDER BY p.proname;

-- 2.3: Permissions trên functions — anon không nên EXECUTE sensitive functions.

SELECT
  routine_schema,
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND grantee IN ('anon', 'PUBLIC')
ORDER BY routine_name, grantee;

-- ============================================================================
-- SECTION 3 — INDEX COVERAGE (hot paths)
-- ============================================================================
-- 3.1: Verify các index quan trọng có tồn tại. Query kiểm tra 1 số index từ findings.
-- Thêm/bớt theo danh sách trong ARCHITECTURE_REVIEW.md section 1.6.

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'user_roles',
    'test_results',
    'writing_feedback',
    'teachngo_classes',
    'teachngo_class_students',
    'teacher_availability_drafts',
    'teacher_availability_rules',
    'notifications',
    'practice_results',
    'prospects',
    'prospect_results'
  )
ORDER BY tablename, indexname;

-- 3.2: Tables có nhiều rows nhưng không có index trên hot columns.
-- Nếu số rows > 1000 mà không có index trên FK → slow query.

SELECT
  schemaname,
  relname AS tablename,
  n_live_tup AS row_count,
  seq_scan AS sequential_scans,
  idx_scan AS index_scans,
  CASE
    WHEN seq_scan + idx_scan = 0 THEN 0
    ELSE ROUND(100.0 * seq_scan / (seq_scan + idx_scan), 2)
  END AS pct_seq_scan
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_live_tup > 100
ORDER BY n_live_tup DESC
LIMIT 30;
-- Interpretation: pct_seq_scan > 50% trên bảng > 1000 rows = need more indexes.

-- 3.3: Suggested missing indexes (dựa trên query patterns từ findings).
-- CHẠY SAU KHI REVIEW 3.1 — nếu index chưa tồn tại, uncomment từng dòng để create.

-- CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON public.user_roles(user_id, role);
-- CREATE INDEX IF NOT EXISTS idx_test_results_section_created ON public.test_results(section_type, created_at DESC);
-- CREATE INDEX IF NOT EXISTS idx_test_results_user_created ON public.test_results(user_id, created_at DESC);
-- CREATE INDEX IF NOT EXISTS idx_writing_feedback_result_task ON public.writing_feedback(result_id, task_key);
-- CREATE INDEX IF NOT EXISTS idx_writing_feedback_status_teacher ON public.writing_feedback(status, teacher_id);
-- CREATE INDEX IF NOT EXISTS idx_teachngo_classes_teacher ON public.teachngo_classes(teacher_id);
-- CREATE INDEX IF NOT EXISTS idx_teachngo_class_students_student ON public.teachngo_class_students(teachngo_student_id);
-- CREATE INDEX IF NOT EXISTS idx_teacher_avail_drafts_status ON public.teacher_availability_drafts(status, updated_at DESC);
-- CREATE INDEX IF NOT EXISTS idx_teacher_avail_rules_teacher_effective ON public.teacher_availability_rules(teacher_id, effective_from);
-- CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read_at) WHERE read_at IS NULL;
-- CREATE INDEX IF NOT EXISTS idx_practice_results_user_exercise ON public.practice_results(user_id, exercise_id, created_at DESC);
-- CREATE INDEX IF NOT EXISTS idx_prospects_token ON public.prospects(token) WHERE token IS NOT NULL;

-- ============================================================================
-- SECTION 4 — REALTIME PUBLICATION
-- ============================================================================
-- 4.1: Tables đã được publish cho realtime. Nếu thiếu bảng cần realtime (vd notifications) → add.

SELECT
  pubname,
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- 4.2: Expected (based on findings):
-- teacher_availability_drafts, teacher_availability_rules, teacher_availability_exceptions, teacher_capabilities.
-- Candidates to add (post-launch): notifications, writing_feedback (for student to see grade realtime).

-- ============================================================================
-- SECTION 5 — DATA INTEGRITY
-- ============================================================================
-- 5.1: Orphan rows — FK trỏ tới auth.users() đã bị delete.
-- Nếu edge function delete-user không clean bảng nào → sẽ có orphan.
-- Chạy check cho các bảng có user_id FK.

SELECT
  'profiles' AS table_name,
  COUNT(*) AS orphan_count
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id)
UNION ALL
SELECT 'user_roles', COUNT(*) FROM public.user_roles ur
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = ur.user_id)
UNION ALL
SELECT 'test_results', COUNT(*) FROM public.test_results tr
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = tr.user_id)
UNION ALL
SELECT 'practice_results', COUNT(*) FROM public.practice_results pr
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = pr.user_id)
UNION ALL
SELECT 'writing_feedback', COUNT(*) FROM public.writing_feedback wf
WHERE wf.teacher_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = wf.teacher_id)
UNION ALL
SELECT 'notifications', COUNT(*) FROM public.notifications n
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = n.user_id)
ORDER BY table_name;
-- Expected: 0 rows at each. Non-zero = delete-user cleanup gap.

-- 5.2: Placement token reuse — prospects có nhiều prospect_results.
-- Nếu submit-placement-result không enforce single-use, sẽ thấy prospect_id trùng nhiều lần.

SELECT
  prospect_id,
  section_type,
  COUNT(*) AS submission_count,
  MIN(created_at) AS first_submit,
  MAX(created_at) AS last_submit
FROM public.prospect_results
GROUP BY prospect_id, section_type
HAVING COUNT(*) > 1
ORDER BY submission_count DESC
LIMIT 20;
-- Expected: empty hoặc rất ít rows. Nhiều rows = token abuse.

-- 5.3: Classes không có schedule (Flow B partial state).

SELECT
  tc.id,
  tc.class_name,
  tc.teacher_id,
  tc.created_at,
  tc.study_plan_id,
  CASE WHEN sp.id IS NULL THEN 'MISSING' ELSE 'OK' END AS plan_status
FROM public.teachngo_classes tc
LEFT JOIN public.study_plans sp ON sp.id = tc.study_plan_id
WHERE tc.status != 'archived'
ORDER BY tc.created_at DESC;
-- Expected: no MISSING (hoặc chỉ classes admin intentionally create không schedule).

-- 5.4: Writing feedback race condition detection — multiple teachers graded cùng result+task.
-- Nếu có history table/audit log → query nó. Hiện tại không có → query này chỉ detect hiện trạng.

SELECT
  result_id,
  task_key,
  COUNT(DISTINCT teacher_id) AS teacher_count,
  STRING_AGG(DISTINCT teacher_id::text, ', ') AS teachers,
  MAX(updated_at) - MIN(updated_at) AS time_between_edits
FROM public.writing_feedback
GROUP BY result_id, task_key
HAVING COUNT(DISTINCT teacher_id) > 1
ORDER BY teacher_count DESC
LIMIT 20;

-- ============================================================================
-- SECTION 6 — AUTH & USER HEALTH
-- ============================================================================
-- 6.1: Count users by role.

SELECT
  COALESCE(ur.role::text, '(none)') AS role,
  COUNT(DISTINCT u.id) AS user_count
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
GROUP BY ur.role
ORDER BY user_count DESC;

-- 6.2: Users có nhiều roles (policy logic có thể treat khác nhau).

SELECT
  user_id,
  ARRAY_AGG(role::text ORDER BY role) AS roles,
  COUNT(*) AS role_count
FROM public.user_roles
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY role_count DESC;

-- 6.3: Users chưa có profile — link auth ↔ profile gap.

SELECT COUNT(*) AS users_without_profile
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

-- 6.4: Users có must_change_password metadata nhưng đã login lâu (chưa thực hiện).
-- Nếu reset-student-password bulk reset, nhiều accounts vẫn dùng "123456".

SELECT
  u.id,
  u.email,
  u.last_sign_in_at,
  u.raw_user_meta_data->>'must_change_password' AS must_change
FROM auth.users u
WHERE u.raw_user_meta_data->>'must_change_password' = 'true'
  AND u.last_sign_in_at > u.created_at
ORDER BY u.last_sign_in_at DESC
LIMIT 50;
-- Expected: ít rows. Nhiều = user bypass force-change (UI không enforce).

-- ============================================================================
-- SECTION 7 — TABLE SIZES (growth forecast)
-- ============================================================================
-- 7.1: Row counts for capacity planning.

SELECT
  schemaname,
  relname AS tablename,
  n_live_tup AS row_count,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || relname)) AS total_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC
LIMIT 30;

-- 7.2: Database total size.

SELECT
  pg_size_pretty(pg_database_size(current_database())) AS db_size;

-- ============================================================================
-- SECTION 8 — MIGRATION HISTORY (Supabase CLI schema)
-- ============================================================================
-- 8.1: Migrations đã apply (nếu dùng Supabase CLI push).

SELECT
  version,
  name,
  statements,
  created_at
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 30;

-- 8.2: Nếu chạy tất cả migration manually qua SQL Editor (không dùng CLI):
-- Query trên sẽ không có rows hoặc không có bảng.
-- Đó là trường hợp bình thường — nghĩa là user sync SQL qua SQL Editor.
-- Không require fix, chỉ note lại.

-- ============================================================================
-- SECTION 9 — EDGE FUNCTIONS ACTIVITY (Supabase logs)
-- ============================================================================
-- Query qua Supabase Dashboard → Logs → Edge Functions (không có direct SQL).
-- Monitor:
--   - Error rate per function
--   - Invocations per day (top 10)
--   - Cold start duration
-- Action: nếu ai-grade-writing / generate-flashcards / translate-vocab spike → có khả năng abuse.

-- ============================================================================
-- SECTION 10 — RECENT SLOW QUERIES (pg_stat_statements)
-- ============================================================================
-- 10.1: Enable extension nếu chưa (CHẠY 1 LẦN).

-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 10.2: Top 20 queries theo mean exec time.

SELECT
  substring(query, 1, 100) AS query_snippet,
  calls,
  total_exec_time / 1000 AS total_sec,
  mean_exec_time AS mean_ms,
  rows
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
  AND query NOT LIKE 'COMMIT%'
  AND query NOT LIKE 'BEGIN%'
ORDER BY mean_exec_time DESC
LIMIT 20;

-- 10.3: Top queries theo total time (tổng lũy tích — index candidate).

SELECT
  substring(query, 1, 100) AS query_snippet,
  calls,
  total_exec_time / 1000 AS total_sec,
  mean_exec_time AS mean_ms
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY total_exec_time DESC
LIMIT 20;

-- ============================================================================
-- SECTION 11 — CRON JOB STATUS (pg_cron, nếu dùng)
-- ============================================================================
-- 11.1: List scheduled jobs.

SELECT
  jobid,
  schedule,
  command,
  nodename,
  active
FROM cron.job
ORDER BY jobid;

-- 11.2: Recent job runs + failures.

SELECT
  jobid,
  runid,
  status,
  return_message,
  start_time,
  end_time,
  EXTRACT(EPOCH FROM (end_time - start_time)) AS duration_sec
FROM cron.job_run_details
WHERE start_time > NOW() - INTERVAL '7 days'
ORDER BY start_time DESC
LIMIT 50;
-- Monitor: jobs consistent failure → fix or disable.

-- ============================================================================
-- SECTION 12 — PGMQ (Email queue, nếu dùng)
-- ============================================================================
-- 12.1: List queues.

SELECT queue_name, is_partitioned, is_unlogged, created_at
FROM pgmq.list_queues()
ORDER BY created_at DESC;

-- 12.2: Messages trong queue (pending).

-- Replace 'email_queue' bằng tên queue thật:
-- SELECT COUNT(*) FROM pgmq.q_email_queue;

-- ============================================================================
-- END OF AUDIT_SQL.sql
-- ============================================================================
-- Tổng hợp kết quả:
--   - Fill vào ARCHITECTURE_REVIEW.md Appendix "Live DB audit results".
--   - Đặt priorities dựa trên findings.
--   - Add suggested indexes (section 3.3) sau khi review section 3.1.
