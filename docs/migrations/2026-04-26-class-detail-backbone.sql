-- ============================================================================
-- Migration: Class detail page backbone
-- ============================================================================
-- Date:     2026-04-26
-- Scope:    Tạo các bảng + RPC còn thiếu để trang /admin/classes/:id query đầy đủ:
--             · class_teachers           (multi-teacher; may already exist)
--             · class_sessions           (per-class scheduled session; may already exist)
--             · class_status_history     (audit log lifecycle changes)        — NEW
--             · class_enrollments        (student ↔ class)                    — NEW
--             · class_invitations        (lời mời GV vào lớp + withdraw)      — NEW
--             · RPC request_replacement_teacher                                — NEW
--             · RPC get_class_status_history                                   — NEW
--             · Trigger ghi class_status_history mỗi khi lifecycle_status đổi  — NEW
-- Notes:    Idempotent. Safe to re-run. Stage-B portions (class_teachers /
--           class_sessions) chỉ tạo nếu chưa có — không thay đổi cấu trúc cũ.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- (Enum class_lifecycle_status đã được tạo/cập nhật ở migration trước.)

-- ----------------------------------------------------------------------------
-- 0b. teachngo_classes: đảm bảo có lifecycle_status + cancellation_reason +
--     status_changed_at + name/class_code (FE đã dùng các cột này).
-- ----------------------------------------------------------------------------
ALTER TABLE public.teachngo_classes
  ADD COLUMN IF NOT EXISTS lifecycle_status     public.class_lifecycle_status NOT NULL DEFAULT 'planning',
  ADD COLUMN IF NOT EXISTS cancellation_reason  text,
  ADD COLUMN IF NOT EXISTS status_changed_at    timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS name                 text,
  ADD COLUMN IF NOT EXISTS class_code           text,
  ADD COLUMN IF NOT EXISTS branch               text,
  ADD COLUMN IF NOT EXISTS mode                 text;

CREATE INDEX IF NOT EXISTS idx_teachngo_classes_lifecycle_status
  ON public.teachngo_classes(lifecycle_status);

-- ----------------------------------------------------------------------------
-- 1. class_teachers (idempotent — Stage B có thể đã tạo)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.class_teachers (
  class_id    uuid NOT NULL REFERENCES public.teachngo_classes(id) ON DELETE CASCADE,
  teacher_id  uuid NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
  role        text NOT NULL DEFAULT 'primary'
              CHECK (role IN ('primary', 'ta', 'substitute')),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (class_id, teacher_id)
);
CREATE INDEX IF NOT EXISTS idx_class_teachers_teacher_id ON public.class_teachers(teacher_id);
CREATE INDEX IF NOT EXISTS idx_class_teachers_class_id   ON public.class_teachers(class_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_class_teachers_one_primary
  ON public.class_teachers(class_id) WHERE role = 'primary';

ALTER TABLE public.class_teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins manage class_teachers" ON public.class_teachers;
CREATE POLICY "admins manage class_teachers" ON public.class_teachers
  FOR ALL TO authenticated
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
DROP POLICY IF EXISTS "teachers read own class_teachers" ON public.class_teachers;
CREATE POLICY "teachers read own class_teachers" ON public.class_teachers
  FOR SELECT TO authenticated
  USING (
    public.is_admin_user()
    OR teacher_id = public.current_teacher_id()
    OR class_id IN (SELECT class_id FROM public.class_teachers WHERE teacher_id = public.current_teacher_id())
  );

-- ----------------------------------------------------------------------------
-- 2. class_sessions (idempotent)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.class_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id        uuid NOT NULL REFERENCES public.teachngo_classes(id) ON DELETE CASCADE,
  teacher_id      uuid NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
  starts_at       timestamptz NOT NULL,
  ends_at         timestamptz NOT NULL,
  status          text NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  location        text,
  notes           text,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS idx_class_sessions_class_id              ON public.class_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_teacher_id_starts_at  ON public.class_sessions(teacher_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_class_sessions_starts_at             ON public.class_sessions(starts_at);

ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins manage class_sessions" ON public.class_sessions;
CREATE POLICY "admins manage class_sessions" ON public.class_sessions
  FOR ALL TO authenticated
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
DROP POLICY IF EXISTS "teachers read own class_sessions" ON public.class_sessions;
CREATE POLICY "teachers read own class_sessions" ON public.class_sessions
  FOR SELECT TO authenticated
  USING (public.is_admin_user() OR teacher_id = public.current_teacher_id());

-- updated_at auto-bump (shared trigger fn)
CREATE OR REPLACE FUNCTION public.tg_class_sessions_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS class_sessions_set_updated_at ON public.class_sessions;
CREATE TRIGGER class_sessions_set_updated_at
  BEFORE UPDATE ON public.class_sessions
  FOR EACH ROW EXECUTE FUNCTION public.tg_class_sessions_set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. class_enrollments (NEW) — student trong lớp
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.class_enrollments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id     uuid NOT NULL REFERENCES public.teachngo_classes(id) ON DELETE CASCADE,
  student_id   uuid NOT NULL REFERENCES public.teachngo_students(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'active'
               CHECK (status IN ('active', 'paused', 'transferred', 'dropped', 'completed')),
  enrolled_at  timestamptz NOT NULL DEFAULT now(),
  enrolled_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  dropped_at   timestamptz,
  drop_reason  text,
  notes        text,
  UNIQUE (class_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class_id   ON public.class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_student_id ON public.class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_status     ON public.class_enrollments(status);

ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins manage class_enrollments" ON public.class_enrollments;
CREATE POLICY "admins manage class_enrollments" ON public.class_enrollments
  FOR ALL TO authenticated
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

-- Teachers in the class can see enrollments
DROP POLICY IF EXISTS "teachers read class_enrollments" ON public.class_enrollments;
CREATE POLICY "teachers read class_enrollments" ON public.class_enrollments
  FOR SELECT TO authenticated
  USING (
    public.is_admin_user()
    OR class_id IN (
      SELECT class_id FROM public.class_teachers
      WHERE teacher_id = public.current_teacher_id()
    )
  );

-- ----------------------------------------------------------------------------
-- 4. class_invitations (NEW) — lời mời GV
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.class_invitations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id        uuid NOT NULL REFERENCES public.teachngo_classes(id) ON DELETE CASCADE,
  teacher_id      uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'declined', 'withdrawn', 'expired')),
  message         text,
  withdrawal_note text,
  invited_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at      timestamptz NOT NULL DEFAULT now(),
  responded_at    timestamptz,
  expires_at      timestamptz
);
CREATE INDEX IF NOT EXISTS idx_class_invitations_class_id        ON public.class_invitations(class_id);
CREATE INDEX IF NOT EXISTS idx_class_invitations_teacher_id      ON public.class_invitations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_class_invitations_status          ON public.class_invitations(status);
-- Chỉ 1 lời mời pending tại 1 thời điểm cho cùng 1 cặp (class, teacher)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_class_invitations_active
  ON public.class_invitations(class_id, teacher_id)
  WHERE status = 'pending';

ALTER TABLE public.class_invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins manage class_invitations" ON public.class_invitations;
CREATE POLICY "admins manage class_invitations" ON public.class_invitations
  FOR ALL TO authenticated
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
DROP POLICY IF EXISTS "teachers read own invitations" ON public.class_invitations;
CREATE POLICY "teachers read own invitations" ON public.class_invitations
  FOR SELECT TO authenticated
  USING (public.is_admin_user() OR teacher_id = public.current_teacher_id());
-- Teacher có thể cập nhật response của chính mình (accept/decline)
DROP POLICY IF EXISTS "teachers respond own invitations" ON public.class_invitations;
CREATE POLICY "teachers respond own invitations" ON public.class_invitations
  FOR UPDATE TO authenticated
  USING (teacher_id = public.current_teacher_id() AND status = 'pending')
  WITH CHECK (teacher_id = public.current_teacher_id() AND status IN ('accepted', 'declined'));

-- ----------------------------------------------------------------------------
-- 5. class_status_history (NEW) — audit log
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.class_status_history (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id     uuid NOT NULL REFERENCES public.teachngo_classes(id) ON DELETE CASCADE,
  from_status  public.class_lifecycle_status,
  to_status    public.class_lifecycle_status NOT NULL,
  reason       text,
  changed_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_class_status_history_class_id_changed_at
  ON public.class_status_history(class_id, changed_at DESC);

ALTER TABLE public.class_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins read class_status_history" ON public.class_status_history;
CREATE POLICY "admins read class_status_history" ON public.class_status_history
  FOR SELECT TO authenticated
  USING (
    public.is_admin_user()
    OR class_id IN (
      SELECT class_id FROM public.class_teachers
      WHERE teacher_id = public.current_teacher_id()
    )
  );
-- INSERT chỉ qua trigger (không expose policy → service role + trigger SECURITY DEFINER tự làm)
-- → không có ALL/INSERT policy cho client.

-- Trigger ghi history mỗi khi lifecycle_status đổi
CREATE OR REPLACE FUNCTION public.tg_log_class_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.class_status_history (class_id, from_status, to_status, reason, changed_by, changed_at)
    VALUES (NEW.id, NULL, NEW.lifecycle_status, NEW.cancellation_reason, auth.uid(), now());
    RETURN NEW;
  END IF;

  IF NEW.lifecycle_status IS DISTINCT FROM OLD.lifecycle_status THEN
    INSERT INTO public.class_status_history (class_id, from_status, to_status, reason, changed_by, changed_at)
    VALUES (NEW.id, OLD.lifecycle_status, NEW.lifecycle_status, NEW.cancellation_reason, auth.uid(), now());
    NEW.status_changed_at := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS teachngo_classes_log_status_change ON public.teachngo_classes;
CREATE TRIGGER teachngo_classes_log_status_change
  BEFORE INSERT OR UPDATE OF lifecycle_status, cancellation_reason
  ON public.teachngo_classes
  FOR EACH ROW EXECUTE FUNCTION public.tg_log_class_status_change();

-- ----------------------------------------------------------------------------
-- 6. RPC get_class_status_history — view tiện cho FE
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_class_status_history(p_class_id uuid)
RETURNS TABLE (
  id          uuid,
  from_status public.class_lifecycle_status,
  to_status   public.class_lifecycle_status,
  reason      text,
  changed_by  uuid,
  changed_at  timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, from_status, to_status, reason, changed_by, changed_at
  FROM public.class_status_history
  WHERE class_id = p_class_id
    AND (
      public.is_admin_user()
      OR class_id IN (SELECT class_id FROM public.class_teachers WHERE teacher_id = public.current_teacher_id())
    )
  ORDER BY changed_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_class_status_history(uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- 7. RPC request_replacement_teacher
-- ----------------------------------------------------------------------------
-- Chỉ admin/super_admin chạy được. Trong 1 transaction:
--   · withdraw mọi class_invitations.pending (note auto)
--   · xoá class_teachers
--   · set lifecycle_status='recruiting_replacement', teacher_name=NULL, teacher_id=NULL
--   · trigger sẽ tự ghi class_status_history
--   · cập nhật reason cho row history vừa được trigger ghi (không có cách
--     pass reason qua trigger ngoài cancellation_reason — nên ta SET
--     cancellation_reason cho lần update lifecycle này; trigger đã pick lên)
--   · tạo class_invitations mới cho từng teacher_id trong p_teacher_ids
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_replacement_teacher(
  p_class_id    uuid,
  p_reason      text,
  p_teacher_ids uuid[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitations_created int := 0;
  v_actor               uuid := auth.uid();
  v_tid                 uuid;
BEGIN
  -- 1. Authorization
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Only admins can request a replacement teacher'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. Validate input
  IF p_class_id IS NULL THEN
    RAISE EXCEPTION 'p_class_id is required';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'p_reason is required (min 5 chars)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.teachngo_classes WHERE id = p_class_id) THEN
    RAISE EXCEPTION 'Class % not found', p_class_id;
  END IF;

  -- 3. Withdraw pending invitations
  UPDATE public.class_invitations
  SET status          = 'withdrawn',
      withdrawal_note = '[auto: tìm GV thay thế] ' || p_reason,
      responded_at    = now()
  WHERE class_id = p_class_id
    AND status   = 'pending';

  -- 4. Detach current teachers
  DELETE FROM public.class_teachers WHERE class_id = p_class_id;

  -- 5. Update class itself — trigger sẽ ghi class_status_history với reason
  UPDATE public.teachngo_classes
  SET lifecycle_status    = 'recruiting_replacement',
      cancellation_reason = p_reason,   -- reused as "lý do thay GV" cho history
      teacher_id          = NULL,
      teacher_name        = NULL,
      status_changed_at   = now()
  WHERE id = p_class_id;

  -- 6. Tạo invitations mới (nếu admin chọn teacher)
  IF p_teacher_ids IS NOT NULL AND array_length(p_teacher_ids, 1) > 0 THEN
    FOREACH v_tid IN ARRAY p_teacher_ids LOOP
      INSERT INTO public.class_invitations (class_id, teacher_id, status, message, invited_by)
      VALUES (
        p_class_id,
        v_tid,
        'pending',
        'Mời tham gia làm GV thay thế. Lý do: ' || p_reason,
        v_actor
      )
      ON CONFLICT DO NOTHING;
      v_invitations_created := v_invitations_created + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success',              true,
    'class_id',             p_class_id,
    'invitations_created',  v_invitations_created,
    'new_status',           'recruiting_replacement'
  );
END $$;

GRANT EXECUTE ON FUNCTION public.request_replacement_teacher(uuid, text, uuid[]) TO authenticated;

-- ----------------------------------------------------------------------------
-- 8. Realtime publication (idempotent)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='class_teachers') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.class_teachers;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='class_sessions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.class_sessions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='class_enrollments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.class_enrollments;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='class_invitations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.class_invitations;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='class_status_history') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.class_status_history;
  END IF;
END $$;
