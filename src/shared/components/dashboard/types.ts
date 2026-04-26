import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Shared icon tone vocabulary used by every dashboard primitive
 * (SoftCard, StatCard, RecentList, InfoBanner).
 */
export type IconTone = "teal" | "coral" | "muted";

/**
 * Common props every dashboard card-style component accepts.
 * Each primitive extends this so the API is consistent across the dashboard.
 */
export interface DashboardCardBaseProps {
  /** Uppercase eyebrow label rendered above the title. */
  eyebrow?: string;
  /** Card title (rendered with display font). */
  title?: ReactNode;
  /** Right-aligned slot in the header (legend, link, button…). */
  action?: ReactNode;
  /** Lucide icon. Where it renders depends on the component (header eyebrow vs leading slot). */
  icon?: LucideIcon;
  /** Tonal accent for icon backgrounds and similar surfaces. */
  iconTone?: IconTone;
  /** Optional click handler — turns the card into a `<button>`. */
  onClick?: () => void;
  /** Extra Tailwind classes appended to the root. */
  className?: string;
}

/** Icon-tone → Tailwind background+text class lookup, shared by all primitives. */
export const ICON_TONE_CLASS: Record<IconTone, string> = {
  teal: "bg-primary/12 text-primary",
  coral: "bg-accent/12 text-accent",
  muted: "bg-muted text-muted-foreground",
};

/** Badge-tone variant used by RecentList items. */
export const BADGE_TONE_CLASS: Record<IconTone, string> = {
  teal: "bg-primary/10 text-primary",
  coral: "bg-accent/10 text-accent",
  muted: "bg-muted text-muted-foreground",
};