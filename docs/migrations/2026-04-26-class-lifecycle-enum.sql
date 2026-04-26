-- ============================================================================
-- Migration 1/2: ensure class_lifecycle_status enum has all required values.
-- Phải chạy TRƯỚC migration backbone vì RPC + trigger sau cast literal sang
-- enum value 'recruiting_replacement' / 'archived'. Postgres yêu cầu
-- ALTER TYPE ADD VALUE phải commit trước khi sử dụng.
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'class_lifecycle_status') THEN
    CREATE TYPE public.class_lifecycle_status AS ENUM (
      'planning', 'recruiting', 'recruiting_replacement', 'ready',
      'in_progress', 'completed', 'postponed', 'cancelled', 'archived'
    );
  END IF;
END $$;

ALTER TYPE public.class_lifecycle_status ADD VALUE IF NOT EXISTS 'recruiting_replacement';
ALTER TYPE public.class_lifecycle_status ADD VALUE IF NOT EXISTS 'archived';
