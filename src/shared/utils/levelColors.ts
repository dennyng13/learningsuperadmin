export interface LevelColorConfig {
  bg: string;
  text: string;
  border: string;
  selected: string;
  combined: string;
  /** Swatch color for the color picker */
  swatch: string;
  label: string;
}

export const COLOR_PRESETS: Record<string, LevelColorConfig> = {
  sky:      { bg: "bg-sky-50",      text: "text-sky-700",      border: "border-sky-200",      selected: "bg-sky-200 text-sky-800",      combined: "bg-sky-100 text-sky-700 border-sky-200",      swatch: "#0ea5e9", label: "Sky" },
  emerald:  { bg: "bg-emerald-50",  text: "text-emerald-700",  border: "border-emerald-200",  selected: "bg-emerald-200 text-emerald-800",  combined: "bg-emerald-100 text-emerald-700 border-emerald-200",  swatch: "#10b981", label: "Emerald" },
  green:    { bg: "bg-green-50",    text: "text-green-700",    border: "border-green-200",    selected: "bg-green-200 text-green-800",    combined: "bg-green-100 text-green-700 border-green-200",    swatch: "#22c55e", label: "Green" },
  amber:    { bg: "bg-amber-50",    text: "text-amber-700",    border: "border-amber-200",    selected: "bg-amber-200 text-amber-800",    combined: "bg-amber-100 text-amber-700 border-amber-200",    swatch: "#f59e0b", label: "Amber" },
  orange:   { bg: "bg-orange-50",   text: "text-orange-700",   border: "border-orange-200",   selected: "bg-orange-200 text-orange-800",   combined: "bg-orange-100 text-orange-700 border-orange-200",   swatch: "#f97316", label: "Orange" },
  violet:   { bg: "bg-violet-50",   text: "text-violet-700",   border: "border-violet-200",   selected: "bg-violet-200 text-violet-800",   combined: "bg-violet-100 text-violet-700 border-violet-200",   swatch: "#8b5cf6", label: "Violet" },
  purple:   { bg: "bg-purple-50",   text: "text-purple-700",   border: "border-purple-200",   selected: "bg-purple-200 text-purple-800",   combined: "bg-purple-100 text-purple-700 border-purple-200",   swatch: "#a855f7", label: "Purple" },
  fuchsia:  { bg: "bg-fuchsia-50",  text: "text-fuchsia-700",  border: "border-fuchsia-200",  selected: "bg-fuchsia-200 text-fuchsia-800",  combined: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",  swatch: "#d946ef", label: "Fuchsia" },
  rose:     { bg: "bg-rose-50",     text: "text-rose-700",     border: "border-rose-200",     selected: "bg-rose-200 text-rose-800",     combined: "bg-rose-100 text-rose-700 border-rose-200",     swatch: "#f43f5e", label: "Rose" },
  teal:     { bg: "bg-teal-50",     text: "text-teal-700",     border: "border-teal-200",     selected: "bg-teal-200 text-teal-800",     combined: "bg-teal-100 text-teal-700 border-teal-200",     swatch: "#14b8a6", label: "Teal" },
  cyan:     { bg: "bg-cyan-50",     text: "text-cyan-700",     border: "border-cyan-200",     selected: "bg-cyan-200 text-cyan-800",     combined: "bg-cyan-100 text-cyan-700 border-cyan-200",     swatch: "#06b6d4", label: "Cyan" },
  indigo:   { bg: "bg-indigo-50",   text: "text-indigo-700",   border: "border-indigo-200",   selected: "bg-indigo-200 text-indigo-800",   combined: "bg-indigo-100 text-indigo-700 border-indigo-200",   swatch: "#6366f1", label: "Indigo" },
  lime:     { bg: "bg-lime-50",     text: "text-lime-700",     border: "border-lime-200",     selected: "bg-lime-200 text-lime-800",     combined: "bg-lime-100 text-lime-700 border-lime-200",     swatch: "#84cc16", label: "Lime" },
  pink:     { bg: "bg-pink-50",     text: "text-pink-700",     border: "border-pink-200",     selected: "bg-pink-200 text-pink-800",     combined: "bg-pink-100 text-pink-700 border-pink-200",     swatch: "#ec4899", label: "Pink" },
  gray:     { bg: "bg-gray-50",     text: "text-gray-600",     border: "border-gray-200",     selected: "bg-gray-200 text-gray-700",     combined: "bg-gray-100 text-gray-600 border-gray-200",     swatch: "#6b7280", label: "Gray" },
};

/** Backward-compat: map level names to color keys (fallback for levels without color_key in DB) */
const LEGACY_NAME_MAP: Record<string, string> = {
  "Căng buồm": "sky",
  "Đón gió 1": "emerald",
  "Đón gió 2": "green",
  "Lướt sóng 1": "amber",
  "Lướt sóng 2": "orange",
  "Ra khơi 1": "violet",
  "Ra khơi 2": "purple",
  "Ra khơi 3": "fuchsia",
  "Khác": "gray",
};

/** Resolve color config from a color_key or level name */
export function getLevelColorConfig(colorKeyOrName: string | null | undefined): LevelColorConfig | null {
  if (!colorKeyOrName) return null;
  // Try direct key first
  if (COLOR_PRESETS[colorKeyOrName]) return COLOR_PRESETS[colorKeyOrName];
  // Try legacy name mapping
  const key = LEGACY_NAME_MAP[colorKeyOrName];
  if (key) return COLOR_PRESETS[key];
  return null;
}

/** Get combined class string for a level (by color_key or name) */
export const getLevelColor = (colorKeyOrName: string | null): string => {
  const config = getLevelColorConfig(colorKeyOrName);
  return config ? config.combined : (colorKeyOrName ? "bg-muted text-muted-foreground border-border" : "");
};

// Keep LEVEL_COLORS for backward compat but derive from COLOR_PRESETS
export const LEVEL_COLORS: Record<string, LevelColorConfig> = Object.fromEntries(
  Object.entries(LEGACY_NAME_MAP).map(([name, key]) => [name, COLOR_PRESETS[key]])
);
