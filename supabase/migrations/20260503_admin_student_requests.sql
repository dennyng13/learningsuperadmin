-- ============================================
-- Admin Views for Student Requests (Wave 2)
-- Admin có thể xem và xử lý student_leave_request + student_makeup_request
-- ============================================

-- 1. View: Student leave requests with student info (for Admin)
CREATE OR REPLACE VIEW public.v_student_leave_requests AS
SELECT 
  lr.*,
  u.email as student_email,
  u.raw_user_meta_data->>'full_name' as student_name,
  c.class_name,
  c.class_code,
  s.session_date,
  s.start_time as session_start_time,
  s.end_time as session_end_time
FROM public.student_leave_request lr
LEFT JOIN auth.users u ON lr.user_id = u.id
LEFT JOIN app_classes c ON lr.class_id = c.id
LEFT JOIN app_sessions s ON lr.session_id = s.id
ORDER BY lr.created_at DESC;

COMMENT ON VIEW public.v_student_leave_requests IS 'Admin view of all student leave requests with joined info';

-- 2. View: Student makeup requests with student info (for Admin)
CREATE OR REPLACE VIEW public.v_student_makeup_requests AS
SELECT 
  mr.*,
  u.email as student_email,
  u.raw_user_meta_data->>'full_name' as student_name,
  c.class_name,
  c.class_code,
  os.session_date as original_session_date,
  ns.session_date as scheduled_session_date
FROM public.student_makeup_request mr
LEFT JOIN auth.users u ON mr.user_id = u.id
LEFT JOIN app_classes c ON mr.class_id = c.id
LEFT JOIN app_sessions os ON mr.original_session_id = os.id
LEFT JOIN app_sessions ns ON mr.created_session_id = ns.id
ORDER BY mr.created_at DESC;

COMMENT ON VIEW public.v_student_makeup_requests IS 'Admin view of all student makeup requests with joined info';

-- 3. View: Pending student requests summary (for Admin dashboard)
CREATE OR REPLACE VIEW public.v_pending_student_requests AS
SELECT 
  'leave' as request_type,
  id,
  user_id,
  class_id,
  status,
  created_at,
  reason
FROM public.student_leave_request
WHERE status = 'pending'
UNION ALL
SELECT 
  'makeup' as request_type,
  id,
  user_id,
  class_id,
  status,
  created_at,
  reason
FROM public.student_makeup_request
WHERE status = 'pending'
ORDER BY created_at DESC;

-- 4. Function: Admin approve/reject student leave request
CREATE OR REPLACE FUNCTION public.admin_review_student_leave(
  p_request_id UUID,
  p_status VARCHAR, -- 'approved' or 'rejected'
  p_admin_note TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_admin_id UUID := auth.uid();
BEGIN
  -- Verify user is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN app_roles r ON ur.role_id = r.id
    WHERE ur.user_id = v_admin_id 
    AND r.role_name IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Only admin can review student requests';
  END IF;

  UPDATE public.student_leave_request
  SET 
    status = p_status,
    admin_note = p_admin_note,
    reviewed_by_user_id = v_admin_id,
    reviewed_at = now(),
    updated_at = now()
  WHERE id = p_request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function: Admin approve/reject student makeup request
CREATE OR REPLACE FUNCTION public.admin_review_student_makeup(
  p_request_id UUID,
  p_status VARCHAR, -- 'approved', 'rejected'
  p_admin_note TEXT DEFAULT NULL,
  p_created_session_id UUID DEFAULT NULL -- if approved and session created
)
RETURNS void AS $$
DECLARE
  v_admin_id UUID := auth.uid();
BEGIN
  -- Verify user is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN app_roles r ON ur.role_id = r.id
    WHERE ur.user_id = v_admin_id 
    AND r.role_name IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Only admin can review student requests';
  END IF;

  UPDATE public.student_makeup_request
  SET 
    status = CASE 
      WHEN p_status = 'approved' AND p_created_session_id IS NOT NULL THEN 'scheduled'
      ELSE p_status
    END,
    admin_note = p_admin_note,
    reviewed_by_user_id = v_admin_id,
    reviewed_at = now(),
    created_session_id = COALESCE(p_created_session_id, created_session_id),
    updated_at = now()
  WHERE id = p_request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant permissions
GRANT SELECT ON public.v_student_leave_requests TO authenticated;
GRANT SELECT ON public.v_student_makeup_requests TO authenticated;
GRANT SELECT ON public.v_pending_student_requests TO authenticated;

-- Grant execute permissions for admin functions
GRANT EXECUTE ON FUNCTION public.admin_review_student_leave(UUID, VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_student_makeup(UUID, VARCHAR, TEXT, UUID) TO authenticated;
