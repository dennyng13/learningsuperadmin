import { supabase } from "@/integrations/supabase/client";
import type { BrandAsset, BrandAssetType } from "@admin/features/brand-assets/types";

export const BRAND_ASSETS_BUCKET = "brand-assets";

/* ─────────── URL helpers ─────────── */

/** Append a cache-busting query so CDN serves the latest replaced file. */
export function cacheBustedUrl(asset: Pick<BrandAsset, "public_url" | "version" | "updated_at">): string {
  if (!asset.public_url) return "";
  const sep = asset.public_url.includes("?") ? "&" : "?";
  // Prefer version (monotonic), fall back to updated_at hash.
  const tag = asset.version ?? Date.parse(asset.updated_at || "");
  return `${asset.public_url}${sep}v=${tag}`;
}

export function publicUrlFor(storagePath: string): string {
  const { data } = supabase.storage.from(BRAND_ASSETS_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

/* ─────────── Convention helpers ─────────── */

/** Suggest a canonical storage_path from asset_type + asset_key. */
export function suggestStoragePath(
  type: BrandAssetType,
  assetKey: string,
  ext = "png",
): string {
  const safeExt = ext.replace(/^\./, "");
  const key = assetKey.trim();
  switch (type) {
    case "logo":
      return `logos/${key}.${safeExt}`;
    case "favicon":
      return `favicons/${key || "favicon"}.${safeExt}`;
    case "mascot": {
      // mascotHero → mascots/hero.png
      const m = key.match(/^mascot([A-Z][a-zA-Z0-9]*)$/);
      const name = m ? m[1].charAt(0).toLowerCase() + m[1].slice(1) : key;
      return `mascots/${name}.${safeExt}`;
    }
    case "icon":
      return `icons/${key}.${safeExt}`;
    case "illustration":
      return `illustrations/${key}.${safeExt}`;
    case "shape": {
      // shape-teal-circle → shapes/teal/circle.png
      const m = key.match(/^shape-([a-z]+)-(.+)$/);
      if (m) return `shapes/${m[1]}/${m[2]}.${safeExt}`;
      return `shapes/${key}.${safeExt}`;
    }
    default: {
      return `other/${key}.${safeExt}`;
    }
  }
}

export function fileExt(file: File): string {
  const m = file.name.match(/\.([a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : "png";
}

/* ─────────── CRUD ops ─────────── */

export async function listBrandAssets(): Promise<BrandAsset[]> {
  const { data, error } = await (supabase as any)
    .from("brand_assets")
    .select("*")
    .order("asset_type", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("asset_key", { ascending: true });
  if (error) throw error;
  return (data ?? []) as BrandAsset[];
}

/**
 * Upload a new file to the existing storage_path (overwrites), then bump version.
 * Returns the refreshed registry row.
 */
export async function replaceBrandAsset(
  storagePath: string,
  file: File,
): Promise<BrandAsset> {
  const { error: upErr } = await supabase.storage
    .from(BRAND_ASSETS_BUCKET)
    .upload(storagePath, file, {
      upsert: true,
      cacheControl: "3600",
      contentType: file.type || undefined,
    });
  if (upErr) throw upErr;

  const publicUrl = publicUrlFor(storagePath);

  // Atomic bump via RPC (super_admin guard inside).
  const { data, error } = await (supabase as any).rpc("bump_brand_asset_version", {
    p_storage_path: storagePath,
    p_public_url: publicUrl,
  });
  if (error) throw error;

  // Also keep mime_type in sync if changed.
  if (file.type) {
    await (supabase as any)
      .from("brand_assets")
      .update({ mime_type: file.type })
      .eq("storage_path", storagePath);
  }

  return data as BrandAsset;
}

/** Upload a brand-new asset and insert a registry row. */
export async function createBrandAsset(input: {
  asset_key: string;
  display_name: string;
  asset_type: BrandAssetType;
  storage_path: string;
  description?: string | null;
  sort_order?: number;
  file: File;
}): Promise<BrandAsset> {
  const { error: upErr } = await supabase.storage
    .from(BRAND_ASSETS_BUCKET)
    .upload(input.storage_path, input.file, {
      upsert: true,
      cacheControl: "3600",
      contentType: input.file.type || undefined,
    });
  if (upErr) throw upErr;

  const publicUrl = publicUrlFor(input.storage_path);

  const { data, error } = await (supabase as any)
    .from("brand_assets")
    .insert({
      asset_key: input.asset_key,
      display_name: input.display_name,
      asset_type: input.asset_type,
      storage_path: input.storage_path,
      public_url: publicUrl,
      description: input.description ?? null,
      mime_type: input.file.type || null,
      sort_order: input.sort_order ?? 0,
      is_active: true,
      version: 1,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as BrandAsset;
}

export async function updateBrandAssetMetadata(
  id: string,
  patch: Partial<Pick<BrandAsset, "display_name" | "description" | "sort_order" | "is_active">>,
): Promise<BrandAsset> {
  const { data, error } = await (supabase as any)
    .from("brand_assets")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as BrandAsset;
}

export async function deleteBrandAsset(asset: BrandAsset): Promise<void> {
  // Remove storage object first, then registry row.
  await supabase.storage.from(BRAND_ASSETS_BUCKET).remove([asset.storage_path]);
  const { error } = await (supabase as any)
    .from("brand_assets")
    .delete()
    .eq("id", asset.id);
  if (error) throw error;
}