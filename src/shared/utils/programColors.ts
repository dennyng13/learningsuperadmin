/**
 * Program color system — deterministic, shared across student/admin/teacher views.
 * Same program name → same palette everywhere.
 */

export interface ProgramPalette {
  /** Tailwind class for outlined badge bg/text/border */
  badge: string;
  /** Solid fill class (active state) */
  badgeActive: string;
  /** Soft tint background for icon container */
  iconBg: string;
  /** Icon foreground color */
  iconText: string;
  /** Banner gradient (soft tint → card fade) — for tinted info cards */
  bannerGradient: string;
  /** Border color used by banner */
  bannerBorder: string;
  /** Solid hero gradient (vivid → darker) — for hero sections with white text */
  heroGradient: string;
}

const PALETTES: ProgramPalette[] = [
  {
    badge: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    badgeActive: "bg-emerald-200 text-emerald-800 border-emerald-300",
    iconBg: "bg-emerald-500/15",
    iconText: "text-emerald-600 dark:text-emerald-400",
    bannerGradient: "from-emerald-500/15 via-emerald-500/5 to-card",
    bannerBorder: "border-emerald-500/30",
    heroGradient: "from-emerald-500 to-emerald-700",
  },
  {
    badge: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
    badgeActive: "bg-blue-200 text-blue-800 border-blue-300",
    iconBg: "bg-blue-500/15",
    iconText: "text-blue-600 dark:text-blue-400",
    bannerGradient: "from-blue-500/15 via-blue-500/5 to-card",
    bannerBorder: "border-blue-500/30",
    heroGradient: "from-blue-500 to-blue-700",
  },
  {
    badge: "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
    badgeActive: "bg-violet-200 text-violet-800 border-violet-300",
    iconBg: "bg-violet-500/15",
    iconText: "text-violet-600 dark:text-violet-400",
    bannerGradient: "from-violet-500/15 via-violet-500/5 to-card",
    bannerBorder: "border-violet-500/30",
    heroGradient: "from-violet-500 to-violet-700",
  },
  {
    badge: "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
    badgeActive: "bg-orange-200 text-orange-800 border-orange-300",
    iconBg: "bg-orange-500/15",
    iconText: "text-orange-600 dark:text-orange-400",
    bannerGradient: "from-orange-500/15 via-orange-500/5 to-card",
    bannerBorder: "border-orange-500/30",
    heroGradient: "from-orange-500 to-orange-700",
  },
  {
    badge: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
    badgeActive: "bg-rose-200 text-rose-800 border-rose-300",
    iconBg: "bg-rose-500/15",
    iconText: "text-rose-600 dark:text-rose-400",
    bannerGradient: "from-rose-500/15 via-rose-500/5 to-card",
    bannerBorder: "border-rose-500/30",
    heroGradient: "from-rose-500 to-rose-700",
  },
  {
    badge: "border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400",
    badgeActive: "bg-cyan-200 text-cyan-800 border-cyan-300",
    iconBg: "bg-cyan-500/15",
    iconText: "text-cyan-600 dark:text-cyan-400",
    bannerGradient: "from-cyan-500/15 via-cyan-500/5 to-card",
    bannerBorder: "border-cyan-500/30",
    heroGradient: "from-cyan-500 to-cyan-700",
  },
  {
    badge: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    badgeActive: "bg-amber-200 text-amber-800 border-amber-300",
    iconBg: "bg-amber-500/15",
    iconText: "text-amber-600 dark:text-amber-400",
    bannerGradient: "from-amber-500/15 via-amber-500/5 to-card",
    bannerBorder: "border-amber-500/30",
    heroGradient: "from-amber-500 to-amber-700",
  },
  {
    badge: "border-pink-300 bg-pink-50 text-pink-700 dark:border-pink-700 dark:bg-pink-950/40 dark:text-pink-400",
    badgeActive: "bg-pink-200 text-pink-800 border-pink-300",
    iconBg: "bg-pink-500/15",
    iconText: "text-pink-600 dark:text-pink-400",
    bannerGradient: "from-pink-500/15 via-pink-500/5 to-card",
    bannerBorder: "border-pink-500/30",
    heroGradient: "from-pink-500 to-pink-700",
  },
  {
    badge: "border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-700 dark:bg-teal-950/40 dark:text-teal-400",
    badgeActive: "bg-teal-200 text-teal-800 border-teal-300",
    iconBg: "bg-teal-500/15",
    iconText: "text-teal-600 dark:text-teal-400",
    bannerGradient: "from-teal-500/15 via-teal-500/5 to-card",
    bannerBorder: "border-teal-500/30",
    heroGradient: "from-teal-500 to-teal-700",
  },
  {
    badge: "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400",
    badgeActive: "bg-indigo-200 text-indigo-800 border-indigo-300",
    iconBg: "bg-indigo-500/15",
    iconText: "text-indigo-600 dark:text-indigo-400",
    bannerGradient: "from-indigo-500/15 via-indigo-500/5 to-card",
    bannerBorder: "border-indigo-500/30",
    heroGradient: "from-indigo-500 to-indigo-700",
  },
];

const DEFAULT_PALETTE: ProgramPalette = {
  badge: "border-border bg-muted text-muted-foreground",
  badgeActive: "bg-primary/15 text-primary border-primary/30",
  iconBg: "bg-primary/15",
  iconText: "text-primary",
  bannerGradient: "from-primary/10 via-primary/5 to-card",
  bannerBorder: "border-primary/20",
  heroGradient: "from-primary to-primary/80",
};

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export function getProgramPalette(program?: string | null): ProgramPalette {
  if (!program) return DEFAULT_PALETTE;
  const key = program.trim().toLowerCase();
  if (!key) return DEFAULT_PALETTE;
  return PALETTES[hash(key) % PALETTES.length];
}
