import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cacheBustedUrl } from "@admin/lib/brandAssets";
import { extractShapePalette, type BrandAsset, type ShapePalette } from "@admin/features/brand-assets/types";
import { BRAND_ASSETS_REGISTRY_QUERY_KEY } from "@shared/hooks/useBrandAsset";

/**
 * Resolve a list of brand "shape" assets filtered by palette color
 * (vd: teal / coral / indigo / amber / slate). Reuses the same
 * registry query key as `useBrandAsset` so a single network round-trip
 * powers both single-asset and palette lookups.
 *
 * Shapes are uploaded under `asset_type = "shape"` with keys following the
 * convention `shape-{palette}-{name}` (vd `shape-teal-circle`). We strip the
 * palette prefix and return the asset list sorted by `sort_order`.
 */
async function fetchActiveAssets(): Promise<BrandAsset[]> {
  const { data, error } = await (supabase as any)
    .from("brand_assets")
    .select("*")
    .eq("is_active", true);
  if (error) throw error;
  return (data ?? []) as BrandAsset[];
}

export interface UseBrandShapesResult {
  /** Cache-busted URLs ready for `<img src>` (already filtered by palette). */
  urls: string[];
  shapes: BrandAsset[];
  isLoading: boolean;
  error: Error | null;
}

export function useBrandShapes(palette: ShapePalette): UseBrandShapesResult {
  const { data = [], isLoading, error } = useQuery({
    queryKey: BRAND_ASSETS_REGISTRY_QUERY_KEY,
    queryFn: fetchActiveAssets,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });

  const shapes = data
    .filter((a) => a.asset_type === "shape" && extractShapePalette(a.asset_key) === palette)
    .sort((a, b) => a.sort_order - b.sort_order);

  return {
    shapes,
    urls: shapes.map(cacheBustedUrl).filter(Boolean),
    isLoading,
    error: (error as Error) ?? null,
  };
}