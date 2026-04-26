-- Add 'shape' value to brand_asset_type enum so geometric shapes have their own bucket
-- (previously stored under 'other' with asset_key prefix 'shape-').
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'brand_asset_type' AND e.enumlabel = 'shape'
  ) THEN
    ALTER TYPE public.brand_asset_type ADD VALUE 'shape';
  END IF;
END$$;

-- Backfill: migrate any existing rows where asset_type='other' AND asset_key starts with 'shape-'
-- Must run in a separate transaction from the ALTER TYPE above (Postgres limitation).
COMMIT;
BEGIN;

UPDATE public.brand_assets
SET asset_type = 'shape'::public.brand_asset_type
WHERE asset_type = 'other'::public.brand_asset_type
  AND asset_key LIKE 'shape-%';
