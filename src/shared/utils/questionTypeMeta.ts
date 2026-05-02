import {
  ListChecks, CheckSquare, GitBranch, FileText, Map, MessageSquare,
  Pencil, ClipboardList, Type, Table2, Workflow, Mic, HelpCircle,
  type LucideIcon,
} from "lucide-react";

/**
 * Centralized metadata for every question type used across the app.
 * Provides label (English), icon, and a Tailwind color palette so chips
 * look identical in admin "tạo bài tập / bài thi" and student "kho bài tập".
 *
 * Key normalization: legacy practice keys (e.g. "multiple_choice", "tfng",
 * "matching_headings"…) are mapped to their canonical r_/l_ counterparts so
 * filters and chips match regardless of which side stored the value.
 */

export interface QuestionTypeMeta {
  /** Canonical label (English, IELTS-style). */
  label: string;
  /** Lucide icon component. */
  icon: LucideIcon;
  /** Tailwind color tokens for chips / badges. */
  colors: {
    /** Background + text + border (idle pill). */
    pill: string;
    /** Solid filled (selected / active filter). */
    solid: string;
    /** Just the text/icon color (when used inline). */
    text: string;
  };
}

/** Tailwind palette presets keyed by hue. Reused across types. */
const PALETTE = {
  sky:    { pill: "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900",          solid: "bg-sky-500 text-white border-sky-500",          text: "text-sky-600 dark:text-sky-400" },
  emerald:{ pill: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900", solid: "bg-emerald-500 text-white border-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  amber:  { pill: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900", solid: "bg-amber-500 text-white border-amber-500",     text: "text-amber-600 dark:text-amber-400" },
  violet: { pill: "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900", solid: "bg-violet-500 text-white border-violet-500", text: "text-violet-600 dark:text-violet-400" },
  rose:   { pill: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900",     solid: "bg-rose-500 text-white border-rose-500",       text: "text-rose-600 dark:text-rose-400" },
  indigo: { pill: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900", solid: "bg-indigo-500 text-white border-indigo-500",  text: "text-indigo-600 dark:text-indigo-400" },
  teal:   { pill: "bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900",     solid: "bg-teal-500 text-white border-teal-500",       text: "text-teal-600 dark:text-teal-400" },
  fuchsia:{ pill: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 hover:bg-fuchsia-100 dark:bg-fuchsia-950/40 dark:text-fuchsia-300 dark:border-fuchsia-900", solid: "bg-fuchsia-500 text-white border-fuchsia-500", text: "text-fuchsia-600 dark:text-fuchsia-400" },
  orange: { pill: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900", solid: "bg-orange-500 text-white border-orange-500",  text: "text-orange-600 dark:text-orange-400" },
  slate:  { pill: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700", solid: "bg-slate-600 text-white border-slate-600",     text: "text-slate-600 dark:text-slate-400" },
} as const;

/**
 * Map legacy / alternate keys to canonical keys so meta lookup is consistent.
 * Canonical keys use the r_, l_, taskN, partN convention.
 */
const KEY_ALIASES: Record<string, string> = {
  // Reading aliases
  multiple_choice: "r_multiple_choice",
  multiple_choice_pick2: "r_multiple_choice_pick2",
  tfng: "r_identifying_information",
  ynng: "r_identifying_views",
  matching_headings: "r_matching_headings",
  matching_information: "r_matching_information",
  matching_features: "r_matching_features",
  matching_sentence_endings: "r_matching_sentence_endings",
  sentence_completion: "r_sentence_completion",
  summary_completion: "r_summary_completion",
  short_answer: "r_short_answer",
  diagram_labeling: "r_diagram_label_completion",

  // Listening aliases
  form_completion: "l_form_note_table_completion",
  note_completion: "l_form_note_table_completion",
  table_completion: "l_form_note_table_completion",
  flow_chart: "l_form_note_table_completion",

  // Legacy SCREAMING_SNAKE
  MULTIPLE_CHOICE_ONE_ANSWER: "r_multiple_choice",
  MULTIPLE_CHOICE_MORE_ANSWERS: "r_multiple_choice_pick2",
  IDENTIFYING_INFORMATION: "r_identifying_information",
  COMPLETION: "r_sentence_completion",
  MATCHING: "r_matching_information",
  TRUE_FALSE_NOT_GIVEN: "r_identifying_information",
  YES_NO_NOT_GIVEN: "r_identifying_views",
  MATCHING_HEADINGS: "r_matching_headings",
  MATCHING_INFORMATION: "r_matching_information",
  MATCHING_FEATURES: "r_matching_features",
  MATCHING_SENTENCE_ENDINGS: "r_matching_sentence_endings",
  SENTENCE_COMPLETION: "r_sentence_completion",
  NOTE_COMPLETION: "l_form_note_table_completion",
  SUMMARY_COMPLETION: "r_summary_completion",
  TABLE_COMPLETION: "l_form_note_table_completion",
  FLOW_CHART_COMPLETION: "l_form_note_table_completion",
  DIAGRAM_LABELLING: "r_diagram_label_completion",
  SHORT_ANSWER: "r_short_answer",
  MAP_LABELLING: "l_plan_map_diagram",
  PLAN_LABELLING: "l_plan_map_diagram",
};

/** Normalize any incoming question-type key to its canonical form. */
export function normalizeTypeKey(type: string): string {
  if (!type) return type;
  return KEY_ALIASES[type] || type;
}

/** Master meta map (keyed by canonical id). */
export const QUESTION_TYPE_META: Record<string, QuestionTypeMeta> = {
  // ── Reading ──────────────────────────────────────────────────
  r_multiple_choice:           { label: "Multiple Choice",         icon: ListChecks,  colors: PALETTE.sky },
  r_multiple_choice_pick2:     { label: "Multiple Choice (Pick 2)", icon: CheckSquare, colors: PALETTE.fuchsia },
  r_identifying_information:   { label: "True / False / Not Given", icon: CheckSquare, colors: PALETTE.emerald },
  r_identifying_views:         { label: "Yes / No / Not Given",     icon: CheckSquare, colors: PALETTE.teal },
  r_matching_information:      { label: "Matching Information",    icon: GitBranch,   colors: PALETTE.violet },
  r_matching_headings:         { label: "Matching Headings",       icon: GitBranch,   colors: PALETTE.indigo },
  r_matching_features:         { label: "Matching Features",       icon: GitBranch,   colors: PALETTE.fuchsia },
  r_matching_sentence_endings: { label: "Matching Sentence Endings", icon: GitBranch, colors: PALETTE.rose },
  r_sentence_completion:       { label: "Sentence Completion",     icon: Pencil,      colors: PALETTE.amber },
  r_summary_completion:        { label: "Summary Completion",      icon: FileText,    colors: PALETTE.orange },
  r_diagram_label_completion:  { label: "Diagram Labelling",       icon: Map,         colors: PALETTE.teal },
  r_short_answer:              { label: "Short Answer",            icon: MessageSquare, colors: PALETTE.slate },

  // ── Listening ────────────────────────────────────────────────
  l_multiple_choice:               { label: "Multiple Choice",       icon: ListChecks, colors: PALETTE.sky },
  l_multiple_choice_pick2:         { label: "Multiple Choice (Pick 2)", icon: CheckSquare, colors: PALETTE.fuchsia },
  l_matching:                      { label: "Matching",              icon: GitBranch,  colors: PALETTE.violet },
  l_plan_map_diagram:              { label: "Plan / Map / Diagram",  icon: Map,        colors: PALETTE.teal },
  l_form_note_table_completion:    { label: "Form / Note / Table Completion", icon: Table2, colors: PALETTE.amber },
  l_sentence_completion:           { label: "Sentence Completion",   icon: Pencil,     colors: PALETTE.orange },
  l_short_answer:                  { label: "Short Answer",          icon: MessageSquare, colors: PALETTE.slate },

  // ── Writing ──────────────────────────────────────────────────
  task1: { label: "Task 1",          icon: ClipboardList, colors: PALETTE.orange },
  task2: { label: "Task 2 (Essay)",  icon: Pencil,        colors: PALETTE.rose },

  // ── Speaking ─────────────────────────────────────────────────
  part1: { label: "Part 1 — Interview", icon: Mic, colors: PALETTE.violet },
  part2: { label: "Part 2 — Cue Card",  icon: Mic, colors: PALETTE.fuchsia },
  part3: { label: "Part 3 — Discussion", icon: Mic, colors: PALETTE.indigo },
};

/** Fallback meta for unknown keys. */
const FALLBACK_META: QuestionTypeMeta = {
  label: "Other",
  icon: HelpCircle,
  colors: PALETTE.slate,
};

/** Lookup meta for any incoming key (normalizes aliases first). */
export function getQuestionTypeMeta(type: string): QuestionTypeMeta {
  const key = normalizeTypeKey(type);
  return QUESTION_TYPE_META[key] || {
    ...FALLBACK_META,
    label: key.replace(/^[rl]_/, "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
  };
}
