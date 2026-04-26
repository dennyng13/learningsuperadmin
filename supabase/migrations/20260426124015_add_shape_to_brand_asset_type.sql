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
