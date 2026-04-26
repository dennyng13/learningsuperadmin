---
name: Brand Assets Manager
description: Super-admin only page for managing shared brand assets (logo, favicon, mascots, shapes) used across all 3 portals.
type: feature
---
Route: `/brand-assets` — wrapped by `SuperAdminRoute` guard (only `super_admin` role).
Nav item: `brand-assets` in `system` group, `superAdminOnly: true`.

Backend:
- Bucket `brand-assets` (public read), super_admin-only write via storage policies.
- Table `public.brand_assets` (asset_key, storage_path, public_url, version, sort_order, is_active).
- RPC `bump_brand_asset_version(p_storage_path, p_public_url)` — atomic version++/updated_at refresh, super_admin guarded.
- Migration: `docs/migrations/2026-04-26-brand-assets-rls.sql` (user must run).

Helpers (`src/admin/lib/brandAssets.ts`):
- `replaceBrandAsset(storagePath, file)` — overwrite + bump version.
- `cacheBustedUrl(asset)` — append `?v={version}` for CDN bypass. Reusable across portals.
- `suggestStoragePath(type, key, ext)` — convention: logos/{key}.png, favicons/, mascots/{name}.png (mascotHero→hero), shapes/{color}/{name}.png.
- `createBrandAsset` / `updateBrandAssetMetadata` / `deleteBrandAsset`.

UI: `BrandAssetsPage` with tabs Logo&Favicon / Mascots / Shapes (palette filter teal/coral/indigo/amber/slate) / Khác. Per-card: preview modal, copy URL, replace (drag&drop + confirm), edit metadata, toggle active, delete. Global upload dialog with auto-suggested storage_path.

Note: `src/integrations/supabase/types.ts` may not yet include `brand_assets` — helper uses `(supabase as any)` casts. Regenerate types when convenient.