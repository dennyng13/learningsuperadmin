-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ Brand assets — RLS policies + atomic version bump RPC               ║
-- ║                                                                      ║
-- ║ Bucket `brand-assets` (public read) and table `public.brand_assets`  ║
-- ║ already exist. This migration enforces super_admin-only writes and   ║
-- ║ adds a helper RPC for atomic version bumps when assets are replaced. ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ─── Storage policies (public read kept; only super_admin can write) ───
DROP POLICY IF EXISTS "Super admin can upload brand assets"  ON storage.objects;
DROP POLICY IF EXISTS "Super admin can update brand assets"  ON storage.objects;
DROP POLICY IF EXISTS "Super admin can delete brand assets"  ON storage.objects;

CREATE POLICY "Super admin can upload brand assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'brand-assets'
    AND public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

CREATE POLICY "Super admin can update brand assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'brand-assets'
    AND public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

CREATE POLICY "Super admin can delete brand assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'brand-assets'
    AND public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

-- ─── brand_assets table policies (super_admin write only) ───
DROP POLICY IF EXISTS "Super admin can insert brand assets metadata" ON public.brand_assets;
DROP POLICY IF EXISTS "Super admin can update brand assets metadata" ON public.brand_assets;
DROP POLICY IF EXISTS "Super admin can delete brand assets metadata" ON public.brand_assets;

CREATE POLICY "Super admin can insert brand assets metadata"
  ON public.brand_assets FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Super admin can update brand assets metadata"
  ON public.brand_assets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Super admin can delete brand assets metadata"
  ON public.brand_assets FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- ─── Atomic RPC: bump version + updated_at when an asset is replaced ───
CREATE OR REPLACE FUNCTION public.bump_brand_asset_version(
  p_storage_path text,
  p_public_url text DEFAULT NULL
)
RETURNS public.brand_assets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.brand_assets;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'permission denied: super_admin required';
  END IF;

  UPDATE public.brand_assets
  SET
    version    = COALESCE(version, 0) + 1,
    public_url = COALESCE(p_public_url, public_url),
    updated_at = now()
  WHERE storage_path = p_storage_path
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_brand_asset_version(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bump_brand_asset_version(text, text) TO authenticated;