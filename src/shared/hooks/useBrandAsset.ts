import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cacheBustedUrl } from "@admin/lib/brandAssets";
import type { BrandAsset } from "@admin/features/brand-assets/types";

/**
 * Cache key for the entire brand-assets registry. We always fetch ALL active
 * assets in a single query so multiple `useBrandAsset()` calls on the same
 * page share one network round-trip — and stay in sync after a Replace.
 */
const REGISTRY_KEY = ["brand-assets-registry"] as const;

async function fetchActiveAssets(): Promise<BrandAsset[]> {
  const { data, error } = await (supabase as any)
    .from("brand_assets")
    .select("*")
    .eq("is_active", true);
  if (error) throw error;
  return (data ?? []) as BrandAsset[];
}

export interface UseBrandAssetResult {
  asset: BrandAsset | null;
  /** Cache-busted public URL (ready for `<img src>`), or null while loading / not found. */
  url: string | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Resolve a brand asset by `asset_key` (e.g. "logoMain", "logoApp", "favicon", "mascotHero").
 *
 * - Returns the cache-busted URL so `<img>` reloads automatically when an admin
 *   replaces the file at /admin/brand-assets.
 * - Falls back to the first matching `asset_key` from a list, useful for
 *   transitional naming (e.g. `["logoApp", "logoMain"]`).
 * - Inactive assets are filtered out at the query level.
 */
export function useBrandAsset(assetKey: string | string[]): UseBrandAssetResult {
  const keys = Array.isArray(assetKey) ? assetKey : [assetKey];

  const { data = [], isLoading, error } = useQuery({
    queryKey: REGISTRY_KEY,
    queryFn: fetchActiveAssets,
    staleTime: 5 * 60_000,    // 5 min — admins rarely change brand assets
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });

  // Pick first key that resolves (priority order matters).
  const asset = keys
    .map((k) => data.find((a) => a.asset_key === k) ?? null)
    .find((a) => a !== null) ?? null;

  return {
    asset,
    url: asset ? cacheBustedUrl(asset) : null,
    isLoading,
    error: (error as Error) ?? null,
  };
}