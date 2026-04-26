export type BrandAssetType =
  | "logo"
  | "favicon"
  | "mascot"
  | "icon"
  | "illustration"
  | "shape"
  | "other";

export interface BrandAsset {
  id: string;
  asset_key: string;
  display_name: string;
  asset_type: BrandAssetType;
  storage_path: string;
  public_url: string;
  description: string | null;
  mime_type: string | null;
  version: number;
  sort_order: number;
  is_active: boolean;
  updated_at: string;
}

export const BRAND_ASSET_TYPE_LABELS: Record<BrandAssetType, string> = {
  logo: "Logo",
  favicon: "Favicon",
  mascot: "Mascot",
  icon: "Icon",
  illustration: "Illustration",
  shape: "Shape (geometric)",
  other: "Khác",
};

export const SHAPE_PALETTES = ["teal", "coral", "indigo", "amber", "slate"] as const;
export type ShapePalette = (typeof SHAPE_PALETTES)[number];

/** Extract palette color from a shape asset_key like `shape-teal-circle`. */
export function extractShapePalette(asset_key: string): ShapePalette | null {
  const m = asset_key.match(/^shape-([a-z]+)-/);
  if (!m) return null;
  const c = m[1] as ShapePalette;
  return SHAPE_PALETTES.includes(c) ? c : null;
}