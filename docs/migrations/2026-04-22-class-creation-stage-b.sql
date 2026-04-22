-- ============================================================================
-- Migration: Class creation Stage B — multi-source classes + multi-teacher
-- ============================================================================
-- Date:     2026-04-22
-- Scope:    teachngo_classes (add source, external_class_id),
--           class_teachers (new), class_sessions (new + conflict trigger),
--           data backfill, deprecation note for teachngo_classes.teacher_id
-- Notes:    Idempotent. Safe to re-run. Apply via Supabase SQL Editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. teachngo_classes — add `source` + `external_class_id`
-- ----------------------------------------------------------------------------
ALTER TABLE public.teachngo_classes
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'app',
  ADD COLUMN IF NOT EXISTS external_class_id text;

-- CHECK constraint on source (idempotent via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'teachngo_classes_source_check'
  ) THEN
    ALTER TABLE public.teachngo_classes
      ADD CONSTRAINT teachngo_classes_source_check
      CHECK (source IN ('app', 'teachngo', 'imported'));
  END IF;
END $$;

-- Unique external id per source (allow NULL — app-created rows have no external id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'teachngo_classes_source_external_unique'
  ) THEN
    ALTER TABLE public.teachngo_classes
      ADD CONSTRAINT teachngo_classes_source_external_unique
      UNIQUE (source, external_class_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_teachngo_classes_source
  ON public.teachngo_classes(source);
CREATE INDEX IF NOT EXISTS idx_teachngo_classes_external_class_id
  ON public.teachngo_classes(external_class_id)
  WHERE external_class_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 2. class_teachers — multi-teacher assignment
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

CREATE INDEX IF NOT EXISTS idx_class_teachers_teacher_id
  ON public.class_teachers(teacher_id);
CREATE INDEX IF NOT EXISTS idx_class_teachers_class_id
  ON public.class_teachers(class_id);

-- Only ONE primary teacher per class
CREATE UNIQUE INDEX IF NOT EXISTS uniq_class_teachers_one_primary
  ON public.class_teachers(class_id)
  WHERE role = 'primary';

ALTER TABLE public.class_teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage class_teachers" ON public.class_teachers;
CREATE POLICY "admins manage class_teachers"
  ON public.class_teachers
  FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "teachers read own class_teachers" ON public.class_teachers;
CREATE POLICY "teachers read own class_teachers"
  ON public.class_teachers
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin_user()
    OR teacher_id = public.current_teacher_id()
    OR class_id IN (
      SELECT class_id FROM public.class_teachers
      WHERE teacher_id = public.current_teacher_id()
    )
  );

-- ----------------------------------------------------------------------------
-- 3. class_sessions — per-class scheduled sessions + conflict trigger
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

CREATE INDEX IF NOT EXISTS idx_class_sessions_class_id
  ON public.class_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_teacher_id_starts_at
  ON public.class_sessions(teacher_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_class_sessions_starts_at
  ON public.class_sessions(starts_at);

ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage class_sessions" ON public.class_sessions;
CREATE POLICY "admins manage class_sessions"
  ON public.class_sessions
  FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "teachers read own class_sessions" ON public.class_sessions;
CREATE POLICY "teachers read own class_sessions"
  ON public.class_sessions
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin_user()
    OR teacher_id = public.current_teacher_id()
  );

-- updated_at auto-bump
CREATE OR REPLACE FUNCTION public.tg_class_sessions_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS class_sessions_set_updated_at ON public.class_sessions;
CREATE TRIGGER class_sessions_set_updated_at
  BEFORE UPDATE ON public.class_sessions
  FOR EACH ROW EXECUTE FUNCTION public.tg_class_sessions_set_updated_at();

-- Conflict guard: a teacher cannot be double-booked across active sessions
CREATE OR REPLACE FUNCTION public.check_teacher_slot_conflict()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_conflict_id uuid;
BEGIN
  IF NEW.status IN ('cancelled', 'rescheduled') THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_conflict_id
  FROM public.class_sessions
  WHERE teacher_id = NEW.teacher_id
    AND status NOT IN ('cancelled', 'rescheduled')
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND tstzrange(starts_at, ends_at, '[)') && tstzrange(NEW.starts_at, NEW.ends_at, '[)')
  LIMIT 1;

  IF v_conflict_id IS NOT NULL THEN
    RAISE EXCEPTION 'Teacher % is already booked in session % during this time window',
      NEW.teacher_id, v_conflict_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS class_sessions_check_teacher_conflict ON public.class_sessions;
CREATE TRIGGER class_sessions_check_teacher_conflict
  BEFORE INSERT OR UPDATE OF teacher_id, starts_at, ends_at, status
  ON public.class_sessions
  FOR EACH ROW EXECUTE FUNCTION public.check_teacher_slot_conflict();

-- ----------------------------------------------------------------------------
-- 4. DATA BACKFILL — migrate legacy rows
-- ----------------------------------------------------------------------------
-- 4a. Mark legacy Teach'n Go imports
UPDATE public.teachngo_classes
SET source = 'teachngo'
WHERE external_class_id IS NOT NULL
  AND source = 'app';

-- 4b. Backfill class_teachers from existing single-column teacher_id
--     Only if the teacher_id column still exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'teachngo_classes'
      AND column_name = 'teacher_id'
  ) THEN
    INSERT INTO public.class_teachers (class_id, teacher_id, role, assigned_at)
    SELECT id, teacher_id, 'primary', COALESCE(created_at, now())
    FROM public.teachngo_classes
    WHERE teacher_id IS NOT NULL
    ON CONFLICT (class_id, teacher_id) DO NOTHING;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. Realtime publication
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'class_teachers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.class_teachers;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'class_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.class_sessions;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 6. DEPRECATION NOTE — teachngo_classes.teacher_id
-- ----------------------------------------------------------------------------
-- The single-teacher column `teacher_id` is now superseded by `class_teachers`.
-- Keep it for ~1 month for backward compatibility while frontend code migrates.
--
-- Tag the column with a comment so it shows up in DB explorers:
COMMENT ON COLUMN public.teachngo_classes.teacher_id IS
  'DEPRECATED 2026-04-22 — use public.class_teachers instead. Drop after 2026-05-22.';

-- After 2026-05-22 (and after grep-verifying no code references it),
-- run this in a follow-up migration:
--
--   ALTER TABLE public.teachngo_classes DROP COLUMN IF EXISTS teacher_id;
--
-- ============================================================================
-- ROLLBACK NOTES
-- ============================================================================
-- DROP TRIGGER IF EXISTS class_sessions_check_teacher_conflict ON public.class_sessions;
-- DROP TRIGGER IF EXISTS class_sessions_set_updated_at ON public.class_sessions;
-- DROP FUNCTION IF EXISTS public.check_teacher_slot_conflict();
-- DROP FUNCTION IF EXISTS public.tg_class_sessions_set_updated_at();
-- DROP TABLE IF EXISTS public.class_sessions;
-- DROP TABLE IF EXISTS public.class_teachers;
-- ALTER TABLE public.teachngo_classes
--   DROP CONSTRAINT IF EXISTS teachngo_classes_source_external_unique,
--   DROP CONSTRAINT IF EXISTS teachngo_classes_source_check,
--   DROP COLUMN IF EXISTS source,
--   DROP COLUMN IF EXISTS external_class_id;
-- ============================================================================