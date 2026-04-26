-- ─────────────────────────────────────────────────────────────────────────────
-- class_enrollments: map học viên ↔ lớp.
-- Idempotent — chạy lại an toàn. Apply qua Lovable Cloud SQL editor.
--
-- Quyết định schema:
--   • FK class_id → public.classes(id) ON DELETE CASCADE.
--   • FK student_id → public.synced_students(id) ON DELETE CASCADE.
--   • status text + CHECK enum lite (active/paused/transferred/dropped/completed).
--   • UNIQUE (class_id, student_id) — re-enroll thì UPDATE status, không INSERT mới.
--   • RLS admin full CRUD qua has_role(auth.uid(),'admin').
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.class_enrollments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id      uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id    uuid NOT NULL REFERENCES public.synced_students(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','paused','transferred','dropped','completed')),
  enrolled_at   timestamptz NOT NULL DEFAULT now(),
  dropped_at    timestamptz,
  drop_reason   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT class_enrollments_class_student_uniq UNIQUE (class_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_class_enrollments_class_id   ON public.class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_student_id ON public.class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_status     ON public.class_enrollments(status);

-- updated_at auto-touch
CREATE OR REPLACE FUNCTION public.tg_touch_class_enrollments_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_class_enrollments_touch_updated_at ON public.class_enrollments;
CREATE TRIGGER trg_class_enrollments_touch_updated_at
  BEFORE UPDATE ON public.class_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_class_enrollments_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "class_enrollments_admin_select" ON public.class_enrollments;
CREATE POLICY "class_enrollments_admin_select"
  ON public.class_enrollments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "class_enrollments_admin_insert" ON public.class_enrollments;
CREATE POLICY "class_enrollments_admin_insert"
  ON public.class_enrollments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "class_enrollments_admin_update" ON public.class_enrollments;
CREATE POLICY "class_enrollments_admin_update"
  ON public.class_enrollments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "class_enrollments_admin_delete" ON public.class_enrollments;
CREATE POLICY "class_enrollments_admin_delete"
  ON public.class_enrollments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

COMMENT ON TABLE public.class_enrollments IS
  'Map học viên (synced_students) ↔ lớp (classes). 1 record / cặp (class,student); re-enroll → UPDATE status.';