import type { LucideIcon } from "lucide-react";
import { BookOpen, Headphones, PenLine, Mic } from "lucide-react";

/**
 * Standardized skill color system used across the entire app.
 * Reading = emerald, Listening = blue, Writing = orange, Speaking = violet
 *
 * Import from here instead of defining ad-hoc SKILL_COLORS / SKILL_TABS
 * in individual components or pages.
 */
export const SKILL_COLOR_MAP = {
  reading: {
    text: "text-emerald-600",
    bg: "bg-emerald-500/10",
    bar: "bg-emerald-500",
    border: "border-emerald-500/30",
    selected: "bg-emerald-500 text-white",
    icon: BookOpen,
    label: "Reading",
  },
  listening: {
    text: "text-blue-600",
    bg: "bg-blue-500/10",
    bar: "bg-blue-500",
    border: "border-blue-500/30",
    selected: "bg-blue-500 text-white",
    icon: Headphones,
    label: "Listening",
  },
  writing: {
    text: "text-orange-600",
    bg: "bg-orange-500/10",
    bar: "bg-orange-500",
    border: "border-orange-500/30",
    selected: "bg-orange-500 text-white",
    icon: PenLine,
    label: "Writing",
  },
  speaking: {
    text: "text-violet-600",
    bg: "bg-violet-500/10",
    bar: "bg-violet-500",
    border: "border-violet-500/30",
    selected: "bg-violet-500 text-white",
    icon: Mic,
    label: "Speaking",
  },
} as const;

export type SkillKey = keyof typeof SKILL_COLOR_MAP;

export function getSkillColors(skill: string) {
  return SKILL_COLOR_MAP[skill as SkillKey] || SKILL_COLOR_MAP.reading;
}

export function getSkillIcon(skill: string) {
  return getSkillColors(skill).icon;
}

/* ───── Rich SKILL_TABS used by performance / dashboard pages ───── */

export interface SkillTabConfig {
  id: SkillKey;
  label: string;
  icon: LucideIcon;
  sectionType: string;
  gradient: string;
  bg: string;
  text: string;
  ring: string;
}

export const SKILL_TABS: SkillTabConfig[] = [
  { id: "reading",   label: "Reading",   icon: BookOpen,   sectionType: "READING",   gradient: "from-emerald-500 to-teal-600",  bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400", ring: "ring-emerald-200 dark:ring-emerald-800" },
  { id: "listening",  label: "Listening",  icon: Headphones, sectionType: "LISTENING",  gradient: "from-blue-500 to-indigo-600",   bg: "bg-blue-50 dark:bg-blue-950/30",       text: "text-blue-700 dark:text-blue-400",       ring: "ring-blue-200 dark:ring-blue-800" },
  { id: "writing",   label: "Writing",   icon: PenLine,    sectionType: "WRITING",   gradient: "from-orange-500 to-rose-600",   bg: "bg-orange-50 dark:bg-orange-950/30",   text: "text-orange-700 dark:text-orange-400",   ring: "ring-orange-200 dark:ring-orange-800" },
  { id: "speaking",  label: "Speaking",  icon: Mic,        sectionType: "SPEAKING",  gradient: "from-violet-500 to-purple-600", bg: "bg-violet-50 dark:bg-violet-950/30",   text: "text-violet-700 dark:text-violet-400",   ring: "ring-violet-200 dark:ring-violet-800" },
];

/* ───── Simple skill → CSS class map for badges/pills ───── */

export const SKILL_BADGE_COLORS: Record<string, string> = {
  reading: "bg-emerald-100 text-emerald-700",
  listening: "bg-blue-100 text-blue-700",
  writing: "bg-orange-100 text-orange-700",
  speaking: "bg-violet-100 text-violet-700",
  READING: "bg-emerald-100 text-emerald-700",
  LISTENING: "bg-blue-100 text-blue-700",
  WRITING: "bg-orange-100 text-orange-700",
  SPEAKING: "bg-violet-100 text-violet-700",
};
