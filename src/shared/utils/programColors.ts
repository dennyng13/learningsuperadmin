/**
 * Program color/icon/label system — driven by the shared `programs` DB table.
 *
 * Lookup priority (in `getProgramPalette` / `getProgramIcon` / `getProgramLabel`):
 *   1. Exact match against cached `programs.key` (lower-cased).
 *   2. Exact match against cached `programs.name` (lower-cased).
 *   3. Substring match against cached programs (e.g. "IELTS Junior" → key 'ielts').
 *   4. Static fallback map for the canonical 3 programs (ielts/wre/private).
 *   5. Hash-based palette for unknown programs (deterministic, color always
 *      stable for a given input string).
 *
 * Tailwind classes are built from a color name + the safelist in
 * `tailwind.config.ts` ensures every combination is generated.
 */
import {
  GraduationCap,
  BookOpen,
  Sparkles,
  CalendarDays,
  Briefcase,
  User,
  Users,
  Award,
  Globe,
  Languages,
  Trophy,
  Target,
  Rocket,
  Star,
  Heart,
  type LucideIcon,
} from "lucide-react";
import { getCachedPrograms, type Program } from "@shared/hooks/usePrograms";

export interface ProgramPalette {
  /** Outlined badge (light/dark variants) */
  badge: string;
  /** Active/solid badge state */
  badgeActive: string;
  /** Soft tint background for icon container */
  iconBg: string;
  /** Icon foreground color */
  iconText: string;
  /** Soft banner gradient (tinted info cards) */
  bannerGradient: string;
  /** Border color used by banner */
  bannerBorder: string;
  /** Solid hero gradient (for hero sections with white text) */
  heroGradient: string;
  /** Linear progress bar fill */
  progressFill: string;
  /** Top-border accent (e.g. card highlight) */
  borderTop: string;
  /** Left-border accent (e.g. list highlight) */
  borderLeft: string;
  /** Soft tinted background for buttons / ghost surfaces */
  accentSoftBg: string;
  /** Hover variant for `accentSoftBg` */
  accentSoftHover: string;
  /** Accent foreground text color */
  accentText: string;
  /** Subtle accent border */
  accentBorder: string;
  /** Hover variant for `accentBorder` (đậm hơn) */
  accentBorderHover: string;
  /** Focus ring color */
  ring: string;
  /** Soft background color for hero sections */
  bgSoft?: string;
  /** Soft border color */
  borderSoft?: string;
  borderColor?: string;
}

// ---- Whitelisted Tailwind colors (must match safelist) ---------------------
const ALLOWED_COLORS = [
  "emerald", "blue", "violet", "orange", "rose", "cyan", "amber", "pink",
  "teal", "indigo", "slate", "purple", "red", "yellow", "green", "sky",
  "fuchsia", "lime",
] as const;
type AllowedColor = (typeof ALLOWED_COLORS)[number];

function isAllowedColor(c?: string | null): c is AllowedColor {
  return !!c && (ALLOWED_COLORS as readonly string[]).includes(c);
}

// ---- Whitelisted Lucide icons (kebab-case key → component) -----------------
const ICON_MAP: Record<string, LucideIcon> = {
  "graduation-cap": GraduationCap,
  "book-open": BookOpen,
  "sparkles": Sparkles,
  "calendar-days": CalendarDays,
  "briefcase": Briefcase,
  "user": User,
  "users": Users,
  "award": Award,
  "globe": Globe,
  "languages": Languages,
  "trophy": Trophy,
  "target": Target,
  "rocket": Rocket,
  "star": Star,
  "heart": Heart,
};

// ---- Static fallback (used when DB cache is empty / table unreachable) -----
interface StaticEntry { color: AllowedColor; icon: string; label: string }
const STATIC_FALLBACK: Record<string, StaticEntry> = {
  ielts:      { color: "teal",   icon: "graduation-cap", label: "IELTS" },
  wre:        { color: "violet", icon: "briefcase",      label: "WRE" },
  private:    { color: "amber",  icon: "user",           label: "Private (1-1)" },
  "1-1":      { color: "amber",  icon: "user",           label: "Private (1-1)" },
  customized: { color: "amber",  icon: "user",           label: "Customized" },
};

// ---- Build a palette from a single Tailwind color name ---------------------
function buildPalette(c: AllowedColor): ProgramPalette {
  return {
    badge: `border-${c}-300 bg-${c}-50 text-${c}-700 dark:border-${c}-700 dark:bg-${c}-950/40 dark:text-${c}-400`,
    badgeActive: `bg-${c}-200 text-${c}-800 border-${c}-300`,
    iconBg: `bg-${c}-500/15`,
    iconText: `text-${c}-600 dark:text-${c}-400`,
    bannerGradient: `from-${c}-500/15 via-${c}-500/5 to-card`,
    bannerBorder: `border-${c}-500/30`,
    heroGradient: `from-${c}-500 to-${c}-700`,
    progressFill: `bg-${c}-500`,
    borderTop: `border-t-${c}-500`,
    borderLeft: `border-l-${c}-500`,
    accentSoftBg: `bg-${c}-500/10`,
    accentSoftHover: `hover:bg-${c}-500/15`,
    accentText: `text-${c}-600 dark:text-${c}-400`,
    accentBorder: `border-${c}-500/20`,
    accentBorderHover: `hover:border-${c}-500/50`,
    ring: `ring-${c}-500/40`,
    bgSoft: `bg-${c}-50`,
    borderSoft: `border-${c}-200`,
    borderColor: `border-${c}-500`,
  };
}

const DEFAULT_PALETTE: ProgramPalette = {
  badge: "border-border bg-muted text-muted-foreground",
  badgeActive: "bg-primary/15 text-primary border-primary/30",
  iconBg: "bg-primary/15",
  iconText: "text-primary",
  bannerGradient: "from-primary/10 via-primary/5 to-card",
  bannerBorder: "border-primary/20",
  heroGradient: "from-primary to-primary/80",
  progressFill: "bg-primary",
  borderTop: "border-t-primary",
  borderLeft: "border-l-primary",
  accentSoftBg: "bg-primary/10",
  accentSoftHover: "hover:bg-primary/15",
  accentText: "text-primary",
  accentBorder: "border-primary/20",
  accentBorderHover: "hover:border-primary/60",
  ring: "ring-primary/40",
};

// ---- Hash fallback (unknown programs get a stable color) -------------------
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

// ---- DB lookup (key → name → substring) ------------------------------------
function findProgram(input: string): Program | undefined {
  const key = input.trim().toLowerCase();
  if (!key) return undefined;
  const programs = getCachedPrograms();
  if (programs.length === 0) return undefined;

  // 1) exact key match
  let match = programs.find((p) => p.key.toLowerCase() === key);
  if (match) return match;

  // 2) exact name match
  match = programs.find((p) => p.name.toLowerCase() === key);
  if (match) return match;

  // 3) substring match (e.g. "IELTS Junior" → key 'ielts')
  match = programs.find((p) =>
    key.includes(p.key.toLowerCase()) || key.includes(p.name.toLowerCase()),
  );
  return match;
}

// ---- Public API ------------------------------------------------------------
export function getProgramPalette(program?: string | null): ProgramPalette {
  if (!program) return DEFAULT_PALETTE;
  const key = program.trim().toLowerCase();
  if (!key) return DEFAULT_PALETTE;

  // 1) DB-driven
  const dbHit = findProgram(key);
  if (dbHit && isAllowedColor(dbHit.color_key)) return buildPalette(dbHit.color_key);

  // 2) Static fallback
  for (const [staticKey, entry] of Object.entries(STATIC_FALLBACK)) {
    if (key === staticKey || key.includes(staticKey)) return buildPalette(entry.color);
  }

  // 3) Hash fallback
  return buildPalette(ALLOWED_COLORS[hash(key) % ALLOWED_COLORS.length]);
}

export function getProgramIcon(program?: string | null): LucideIcon {
  if (!program) return GraduationCap;
  const key = program.trim().toLowerCase();
  if (!key) return GraduationCap;

  const dbHit = findProgram(key);
  if (dbHit?.icon_key && ICON_MAP[dbHit.icon_key]) return ICON_MAP[dbHit.icon_key];

  for (const [staticKey, entry] of Object.entries(STATIC_FALLBACK)) {
    if (key === staticKey || key.includes(staticKey)) {
      const ico = ICON_MAP[entry.icon];
      if (ico) return ico;
    }
  }

  return GraduationCap;
}

export function getProgramLabel(program?: string | null): string {
  if (!program) return "—";
  const key = program.trim().toLowerCase();
  if (!key) return "—";

  const dbHit = findProgram(key);
  if (dbHit?.name) return dbHit.name;

  for (const [staticKey, entry] of Object.entries(STATIC_FALLBACK)) {
    if (key === staticKey || key.includes(staticKey)) return entry.label;
  }

  // Last resort — humanise the raw input
  return program.trim();
}

// ---- Emoji helpers --------------------------------------------------------

const PROGRAM_EMOJIS: Record<string, string> = {
  ielts: "🎯",
  wre: "💼",
  private: "👤",
  "1-1": "👤",
  customized: "✨",
  toefl: "🌎",
  sat: "📚",
  gre: "🎓",
};

export function getProgramEmoji(program?: string | null): string {
  if (!program) return "📚";
  const key = program.trim().toLowerCase();
  if (!key) return "📚";

  // Check exact match
  if (PROGRAM_EMOJIS[key]) return PROGRAM_EMOJIS[key];

  // Check partial match
  for (const [progKey, emoji] of Object.entries(PROGRAM_EMOJIS)) {
    if (key.includes(progKey)) return emoji;
  }

  return "📚";
}

export function getCourseEmoji(codeOrName?: string | null): string {
  if (!codeOrName) return "📚";
  const key = codeOrName.toLowerCase();

  if (key.includes('listening')) return '🎧';
  if (key.includes('reading')) return '📖';
  if (key.includes('writing')) return '✍️';
  if (key.includes('speaking')) return '🎙️';
  if (key.includes('mock')) return '🏁';
  if (key.includes('foundation') || key.includes('pre')) return '🌱';
  if (key.includes('intensive')) return '⚡';
  if (key.includes('bridge')) return '🌉';
  if (key.includes('grammar')) return '📝';
  if (key.includes('vocab')) return '📚';
  if (key.includes('test') || key.includes('ielts academic')) return '📋';

  return "📚";
}

/**
 * Map program key to a ProgramHero-compatible color name
 */
export function getProgramColorKey(program?: string | null): "coral" | "teal" | "sky" | "violet" | "yellow" {
  if (!program) return "coral";
  const key = program.trim().toLowerCase();
  if (!key) return "coral";

  // Static mappings for known programs
  const COLOR_MAPPINGS: Record<string, "coral" | "teal" | "sky" | "violet" | "yellow"> = {
    ielts: "teal",
    wre: "violet",
    private: "yellow",
    "1-1": "yellow",
    customized: "yellow",
  };

  for (const [progKey, color] of Object.entries(COLOR_MAPPINGS)) {
    if (key === progKey || key.includes(progKey)) return color;
  }

  // Hash-based fallback
  const colors: ("coral" | "teal" | "sky" | "violet" | "yellow")[] = ["coral", "teal", "sky", "violet", "yellow"];
  return colors[hash(key) % colors.length];
}
