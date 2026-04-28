-- ============================================================================
-- Migration: Teacher performance view + targets table + upsert RPC
-- ============================================================================
-- Date:     2026-04-28
-- Scope:    public.teacher_targets,
--           public.v_teacher_performance,
--           public.v_teacher_performance_monthly,
--           public.admin_upsert_teacher_target
-- Frontend: src/admin/features/users/components/teacher-detail/TabPerformance.tsx
--
-- Conventions:
--   * "On-time" = class_sessions.status='completed' AND updated_at <= starts_at + 24h
--   * "Late"    = starts_at < now() - 24h AND (status <> 'completed' OR updated_at > starts_at + 24h)
--   * avg_gross_vnd_6mo: trả NULL cho tới khi module payroll cấp bảng payslip;
--     admin vẫn đặt được target qua admin_upsert_teacher_target.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. teacher_targets (1 row / teacher; 4 KPI columns + meta)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_targets (
  teacher_id              uuid PRIMARY KEY REFERENCES public.teachers(id) ON DELETE CASCADE,
  target_active_classes   integer,
  target_avg_revenue_6mo  numeric(14,2),
  target_on_time_pct      numeric(5,2),
  target_max_late_count   integer,
  effective_from          date,
  note                    text,
  updated_by              uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.tg_teacher_targets_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS teacher_targets_set_updated_at ON public.teacher_targets;
CREATE TRIGGER teacher_targets_set_updated_at
  BEFORE UPDATE ON public.teacher_targets
  FOR EACH ROW EXECUTE FUNCTION public.tg_teacher_targets_set_updated_at();

ALTER TABLE public.teacher_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage teacher_targets" ON public.teacher_targets;
CREATE POLICY "admins manage teacher_targets"
  ON public.teacher_targets FOR ALL TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "teachers read own teacher_targets" ON public.teacher_targets;
CREATE POLICY "teachers read own teacher_targets"
  ON public.teacher_targets FOR SELECT TO authenticated
  USING (public.is_admin_user() OR teacher_id = public.current_teacher_id());

-- ----------------------------------------------------------------------------
-- 2. v_teacher_performance (lifetime + current-month/year aggregates)
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_teacher_performance CASCADE;

CREATE VIEW public.v_teacher_performance
WITH (security_invoker = true)
AS
WITH base AS (
  SELECT t.id AS teacher_id, t.full_name
  FROM public.teachers t
),
active_classes AS (
  SELECT ct.teacher_id, COUNT(DISTINCT ct.class_id)::int AS active_classes_count
  FROM public.class_teachers ct
  JOIN public.teachngo_classes c ON c.id = ct.class_id
  WHERE c.lifecycle_status NOT IN ('archived','cancelled','completed')
  GROUP BY ct.teacher_id
),
sessions_agg AS (
  SELECT s.teacher_id,
         COUNT(*) FILTER (
           WHERE s.status = 'completed'
             AND date_trunc('month', s.starts_at) = date_trunc('month', now())
         )::int AS locked_total_month,
         COUNT(*) FILTER (
           WHERE s.status = 'completed'
             AND s.updated_at <= s.starts_at + interval '24 hours'
             AND date_trunc('month', s.starts_at) = date_trunc('month', now())
         )::int AS locked_on_time_month,
         COUNT(*) FILTER (
           WHERE s.starts_at < now() - interval '24 hours'
             AND date_trunc('month', s.starts_at) = date_trunc('month', now())
             AND (s.status <> 'completed' OR s.updated_at > s.starts_at + interval '24 hours')
         )::int AS late_count_month,
         COUNT(*) FILTER (
           WHERE s.status = 'completed'
             AND date_trunc('year', s.starts_at) = date_trunc('year', now())
         )::int AS locked_total_year,
         COUNT(*) FILTER (
           WHERE s.status = 'completed'
             AND s.updated_at <= s.starts_at + interval '24 hours'
             AND date_trunc('year', s.starts_at) = date_trunc('year', now())
         )::int AS locked_on_time_year,
         COUNT(*) FILTER (
           WHERE s.starts_at < now() - interval '24 hours'
             AND date_trunc('year', s.starts_at) = date_trunc('year', now())
             AND (s.status <> 'completed' OR s.updated_at > s.starts_at + interval '24 hours')
         )::int AS late_count_year
  FROM public.class_sessions s
  GROUP BY s.teacher_id
)
SELECT
  b.teacher_id,
  b.full_name,
  COALESCE(ac.active_classes_count, 0)               AS active_classes_count,
  NULL::numeric                                      AS avg_gross_vnd_6mo,
  COALESCE(sa.locked_on_time_month, 0)               AS locked_on_time_month,
  COALESCE(sa.locked_total_month,   0)               AS locked_total_month,
  CASE WHEN COALESCE(sa.locked_total_month, 0) = 0 THEN NULL
       ELSE ROUND( (sa.locked_on_time_month::numeric / sa.locked_total_month) * 100, 1)
  END                                                AS on_time_pct_month,
  COALESCE(sa.late_count_month, 0)                   AS late_count_month,
  COALESCE(sa.locked_on_time_year, 0)                AS locked_on_time_year,
  COALESCE(sa.locked_total_year,   0)                AS locked_total_year,
  CASE WHEN COALESCE(sa.locked_total_year, 0) = 0 THEN NULL
       ELSE ROUND( (sa.locked_on_time_year::numeric / sa.locked_total_year) * 100, 1)
  END                                                AS on_time_pct_year,
  COALESCE(sa.late_count_year, 0)                    AS late_count_year,
  tt.target_active_classes,
  tt.target_avg_revenue_6mo,
  tt.target_on_time_pct,
  tt.target_max_late_count
FROM base b
LEFT JOIN active_classes ac ON ac.teacher_id = b.teacher_id
LEFT JOIN sessions_agg   sa ON sa.teacher_id = b.teacher_id
LEFT JOIN public.teacher_targets tt ON tt.teacher_id = b.teacher_id;

REVOKE ALL ON public.v_teacher_performance FROM anon;
GRANT SELECT ON public.v_teacher_performance TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. v_teacher_performance_monthly (1 row / teacher / month)
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_teacher_performance_monthly CASCADE;

CREATE VIEW public.v_teacher_performance_monthly
WITH (security_invoker = true)
AS
SELECT
  s.teacher_id,
  date_trunc('month', s.starts_at)::date              AS period_month,
  COUNT(*) FILTER (WHERE s.status = 'completed')::int AS locked_total,
  COUNT(*) FILTER (
    WHERE s.status = 'completed'
      AND s.updated_at <= s.starts_at + interval '24 hours'
  )::int                                              AS locked_on_time,
  COUNT(*) FILTER (
    WHERE s.starts_at < now() - interval '24 hours'
      AND (s.status <> 'completed' OR s.updated_at > s.starts_at + interval '24 hours')
  )::int                                              AS late_count,
  CASE
    WHEN COUNT(*) FILTER (WHERE s.status = 'completed') = 0 THEN NULL
    ELSE ROUND(
      ( COUNT(*) FILTER (
          WHERE s.status = 'completed'
            AND s.updated_at <= s.starts_at + interval '24 hours'
        )::numeric
        / COUNT(*) FILTER (WHERE s.status = 'completed')
      ) * 100, 1)
  END                                                 AS on_time_pct
FROM public.class_sessions s
GROUP BY s.teacher_id, date_trunc('month', s.starts_at);

REVOKE ALL ON public.v_teacher_performance_monthly FROM anon;
GRANT SELECT ON public.v_teacher_performance_monthly TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. admin_upsert_teacher_target  (KPI-by-KPI upsert; 1 row / teacher)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_upsert_teacher_target(
  _teacher_id      uuid,
  _kpi_key         text,
  _target_value    numeric,
  _effective_from  date DEFAULT NULL,
  _note            text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Admin required';
  END IF;
  IF _kpi_key NOT IN ('active_classes','avg_revenue_6mo','on_time_pct','max_late_count') THEN
    RAISE EXCEPTION 'Unknown kpi_key: %', _kpi_key;
  END IF;

  -- Ensure row exists (1/teacher)
  INSERT INTO public.teacher_targets AS tt (teacher_id, effective_from, note, updated_by)
  VALUES (_teacher_id, _effective_from, _note, auth.uid())
  ON CONFLICT (teacher_id) DO UPDATE
    SET effective_from = COALESCE(EXCLUDED.effective_from, tt.effective_from),
        note           = COALESCE(EXCLUDED.note,           tt.note),
        updated_by     = EXCLUDED.updated_by;

  -- Update the targeted KPI column
  IF    _kpi_key = 'active_classes'  THEN
    UPDATE public.teacher_targets SET target_active_classes  = _target_value::int WHERE teacher_id = _teacher_id;
  ELSIF _kpi_key = 'avg_revenue_6mo' THEN
    UPDATE public.teacher_targets SET target_avg_revenue_6mo = _target_value      WHERE teacher_id = _teacher_id;
  ELSIF _kpi_key = 'on_time_pct'     THEN
    UPDATE public.teacher_targets SET target_on_time_pct     = _target_value      WHERE teacher_id = _teacher_id;
  ELSIF _kpi_key = 'max_late_count'  THEN
    UPDATE public.teacher_targets SET target_max_late_count  = _target_value::int WHERE teacher_id = _teacher_id;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.admin_upsert_teacher_target(uuid, text, numeric, date, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_upsert_teacher_target(uuid, text, numeric, date, text) TO authenticated;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- DROP FUNCTION IF EXISTS public.admin_upsert_teacher_target(uuid, text, numeric, date, text);
-- DROP VIEW     IF EXISTS public.v_teacher_performance_monthly;
-- DROP VIEW     IF EXISTS public.v_teacher_performance;
-- DROP TABLE    IF EXISTS public.teacher_targets;
-- ============================================================================