-- ============================================
-- Migration A: Notifications System (Wave 1)
-- F-Notifications-Migration-A
-- ============================================

-- 1. Create teacher_notifications table if not exists
CREATE TABLE IF NOT EXISTS public.teacher_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'substitute_assigned',      -- Bạn được đề xuất dạy thế
    'substitute_confirmed',     -- GV đồng ý dạy thế, chờ admin duyệt
    'substitute_declined',      -- GV từ chối dạy thế
    'substitute_approved',      -- Admin đã duyệt dạy thế
    'substitute_rejected',      -- Admin từ chối dạy thế
    'makeup_approved',          -- Admin đã duyệt báo bù
    'makeup_rejected',          -- Admin từ chối báo bù
    'makeup_scheduled'          -- Báo bù đã được lên lịch
  )),
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',      -- Flexible metadata (class_id, request_id, etc.)
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ
);

-- 2. Enable RLS
ALTER TABLE public.teacher_notifications ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Users can view own notifications" ON public.teacher_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.teacher_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Only system can insert (via triggers)
CREATE POLICY "System can insert notifications" ON public.teacher_notifications
  FOR INSERT WITH CHECK (true);

-- 4. Function: Create notification
CREATE OR REPLACE FUNCTION public.create_teacher_notification(
  p_user_id UUID,
  p_type VARCHAR,
  p_title VARCHAR,
  p_message TEXT,
  p_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.teacher_notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function: Mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.teacher_notifications
  SET is_read = true, read_at = now()
  WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger: substitute_request status changes
CREATE OR REPLACE FUNCTION public.handle_substitute_request_change()
RETURNS TRIGGER AS $$
DECLARE
  v_class_name VARCHAR;
  v_requester_name VARCHAR;
  v_substitute_name VARCHAR;
BEGIN
  -- Get class name
  SELECT class_name INTO v_class_name FROM app_classes WHERE id = NEW.class_id;
  
  -- Get requester name
  SELECT full_name INTO v_requester_name FROM app_teachers WHERE id = NEW.requested_by_user_id;
  
  -- Get substitute name if exists
  IF NEW.proposed_substitute_user_id IS NOT NULL THEN
    SELECT full_name INTO v_substitute_name FROM app_teachers WHERE id = NEW.proposed_substitute_user_id;
  END IF;

  -- Status: pending → notify substitute
  IF NEW.status = 'pending' AND NEW.proposed_substitute_user_id IS NOT NULL THEN
    PERFORM public.create_teacher_notification(
      NEW.proposed_substitute_user_id,
      'substitute_assigned',
      'Lời mời dạy thế mới',
      format('%s đề xuất bạn dạy thế lớp %s', COALESCE(v_requester_name, 'Giáo viên'), COALESCE(v_class_name, 'Không xác định')),
      jsonb_build_object(
        'request_id', NEW.id,
        'class_id', NEW.class_id,
        'class_name', v_class_name,
        'requested_by', v_requester_name
      )
    );
  END IF;

  -- Status: substitute_confirmed → notify requester
  IF NEW.status = 'substitute_confirmed' AND OLD.status = 'pending' THEN
    PERFORM public.create_teacher_notification(
      NEW.requested_by_user_id,
      'substitute_confirmed',
      'GV đã xác nhận dạy thế',
      format('%s đã đồng ý dạy thế lớp %s. Admin sẽ phê duyệt.', COALESCE(v_substitute_name, 'Giáo viên'), COALESCE(v_class_name, 'Không xác định')),
      jsonb_build_object(
        'request_id', NEW.id,
        'class_id', NEW.class_id,
        'class_name', v_class_name,
        'substitute_name', v_substitute_name
      )
    );
  END IF;

  -- Status: substitute_declined → notify requester
  IF NEW.status = 'substitute_declined' AND OLD.status = 'pending' THEN
    PERFORM public.create_teacher_notification(
      NEW.requested_by_user_id,
      'substitute_declined',
      'GV từ chối dạy thế',
      format('%s đã từ chối dạy thế lớp %s. Vui lòng chọn người khác.', COALESCE(v_substitute_name, 'Giáo viên'), COALESCE(v_class_name, 'Không xác định')),
      jsonb_build_object(
        'request_id', NEW.id,
        'class_id', NEW.class_id,
        'class_name', v_class_name,
        'substitute_name', v_substitute_name,
        'admin_note', NEW.admin_note
      )
    );
  END IF;

  -- Status: admin_approved → notify both requester and substitute
  IF NEW.status = 'admin_approved' AND OLD.status != 'admin_approved' THEN
    -- Notify requester
    PERFORM public.create_teacher_notification(
      NEW.requested_by_user_id,
      'substitute_approved',
      'Admin đã duyệt dạy thế',
      format('Yêu cầu dạy thế lớp %s đã được Admin phê duyệt.', COALESCE(v_class_name, 'Không xác định')),
      jsonb_build_object(
        'request_id', NEW.id,
        'class_id', NEW.class_id,
        'class_name', v_class_name,
        'substitute_name', v_substitute_name,
        'admin_note', NEW.admin_note
      )
    );
    
    -- Notify substitute
    IF NEW.proposed_substitute_user_id IS NOT NULL THEN
      PERFORM public.create_teacher_notification(
        NEW.proposed_substitute_user_id,
        'substitute_approved',
        'Admin đã duyệt - Bạn chính thức dạy thế',
        format('Admin đã phê duyệt bạn dạy thế lớp %s.', COALESCE(v_class_name, 'Không xác định')),
        jsonb_build_object(
          'request_id', NEW.id,
          'class_id', NEW.class_id,
          'class_name', v_class_name
        )
      );
    END IF;
  END IF;

  -- Status: admin_rejected → notify both
  IF NEW.status = 'admin_rejected' AND OLD.status != 'admin_rejected' THEN
    -- Notify requester
    PERFORM public.create_teacher_notification(
      NEW.requested_by_user_id,
      'substitute_rejected',
      'Admin từ chối yêu cầu dạy thế',
      format('Yêu cầu dạy thế lớp %s không được phê duyệt.', COALESCE(v_class_name, 'Không xác định')),
      jsonb_build_object(
        'request_id', NEW.id,
        'class_id', NEW.class_id,
        'class_name', v_class_name,
        'admin_note', NEW.admin_note
      )
    );
    
    -- Notify substitute if already confirmed
    IF NEW.proposed_substitute_user_id IS NOT NULL AND NEW.status = 'substitute_confirmed' THEN
      PERFORM public.create_teacher_notification(
        NEW.proposed_substitute_user_id,
        'substitute_rejected',
        'Admin từ chối - Dạy thế bị hủy',
        format('Yêu cầu dạy thế lớp %s không được Admin phê duyệt.', COALESCE(v_class_name, 'Không xác định')),
        jsonb_build_object(
          'request_id', NEW.id,
          'class_id', NEW.class_id,
          'class_name', v_class_name,
          'admin_note', NEW.admin_note
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS tr_substitute_request_change ON public.substitute_request;
CREATE TRIGGER tr_substitute_request_change
  AFTER UPDATE ON public.substitute_request
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_substitute_request_change();

-- Also trigger on insert for 'pending' status
DROP TRIGGER IF EXISTS tr_substitute_request_insert ON public.substitute_request;
CREATE TRIGGER tr_substitute_request_insert
  AFTER INSERT ON public.substitute_request
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_substitute_request_change();

-- 7. Trigger: makeup_request status changes
CREATE OR REPLACE FUNCTION public.handle_makeup_request_change()
RETURNS TRIGGER AS $$
DECLARE
  v_class_name VARCHAR;
  v_requester_name VARCHAR;
BEGIN
  -- Get class name
  SELECT class_name INTO v_class_name FROM app_classes WHERE id = NEW.class_id;
  
  -- Get requester name
  SELECT full_name INTO v_requester_name FROM app_teachers WHERE id = NEW.requested_by_user_id;

  -- Status: approved
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    PERFORM public.create_teacher_notification(
      NEW.requested_by_user_id,
      'makeup_approved',
      'Admin đã duyệt báo bù',
      format('Yêu cầu báo bù lớp %s ngày %s đã được duyệt.', 
        COALESCE(v_class_name, 'Không xác định'),
        to_char(NEW.proposed_date::date, 'DD/MM/YYYY')
      ),
      jsonb_build_object(
        'request_id', NEW.id,
        'class_id', NEW.class_id,
        'class_name', v_class_name,
        'proposed_date', NEW.proposed_date,
        'proposed_start_time', NEW.proposed_start_time,
        'proposed_end_time', NEW.proposed_end_time,
        'admin_note', NEW.admin_note
      )
    );
  END IF;

  -- Status: rejected
  IF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    PERFORM public.create_teacher_notification(
      NEW.requested_by_user_id,
      'makeup_rejected',
      'Admin từ chối báo bù',
      format('Yêu cầu báo bù lớp %s ngày %s không được duyệt.', 
        COALESCE(v_class_name, 'Không xác định'),
        to_char(NEW.proposed_date::date, 'DD/MM/YYYY')
      ),
      jsonb_build_object(
        'request_id', NEW.id,
        'class_id', NEW.class_id,
        'class_name', v_class_name,
        'proposed_date', NEW.proposed_date,
        'admin_note', NEW.admin_note
      )
    );
  END IF;

  -- Status: scheduled (session created)
  IF NEW.status = 'scheduled' AND OLD.status != 'scheduled' AND NEW.created_session_id IS NOT NULL THEN
    PERFORM public.create_teacher_notification(
      NEW.requested_by_user_id,
      'makeup_scheduled',
      'Buổi bù đã được lên lịch',
      format('Buổi bù lớp %s đã được lên lịch. Vui lòng kiểm tra lịch dạy.', COALESCE(v_class_name, 'Không xác định')),
      jsonb_build_object(
        'request_id', NEW.id,
        'class_id', NEW.class_id,
        'class_name', v_class_name,
        'session_id', NEW.created_session_id,
        'proposed_date', NEW.proposed_date
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS tr_makeup_request_change ON public.makeup_request;
CREATE TRIGGER tr_makeup_request_change
  AFTER UPDATE ON public.makeup_request
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_makeup_request_change();

-- 8. Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_notifications;

-- 9. Index for performance
CREATE INDEX IF NOT EXISTS idx_teacher_notifications_user_id ON public.teacher_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_notifications_is_read ON public.teacher_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_teacher_notifications_created_at ON public.teacher_notifications(created_at DESC);

-- 10. View: Unread count
CREATE OR REPLACE VIEW public.v_teacher_unread_notifications AS
SELECT 
  user_id,
  COUNT(*) as unread_count
FROM public.teacher_notifications
WHERE is_read = false
GROUP BY user_id;

COMMENT ON TABLE public.teacher_notifications IS 'Notifications for teachers about substitute/makeup request status changes';
