export type CanonicalProgramKey = "ielts" | "wre" | "customized";

export interface CanonicalProgramPreset {
  key: CanonicalProgramKey;
  name: string;
  description: string;
  color_key: string;
  icon_key: string;
  sort_order: number;
}

export const CANONICAL_PROGRAMS: CanonicalProgramPreset[] = [
  {
    key: "ielts",
    name: "IELTS",
    description: "Lộ trình luyện thi IELTS Academic.",
    color_key: "blue",
    icon_key: "trophy",
    sort_order: 1,
  },
  {
    key: "wre",
    name: "WRE",
    description: "Chương trình Writing & Reading Excellence.",
    color_key: "emerald",
    icon_key: "graduation-cap",
    sort_order: 2,
  },
  {
    key: "customized",
    name: "Customized",
    description: "Lộ trình thiết kế riêng theo nhu cầu học viên.",
    color_key: "violet",
    icon_key: "sparkles",
    sort_order: 3,
  },
];

export const CANONICAL_PROGRAM_KEYS = CANONICAL_PROGRAMS.map((p) => p.key) as CanonicalProgramKey[];

export function normalizeProgramKey(key?: string | null) {
  return (key ?? "").trim().toLowerCase();
}

export function isCanonicalProgramKey(key?: string | null): key is CanonicalProgramKey {
  return CANONICAL_PROGRAM_KEYS.includes(normalizeProgramKey(key) as CanonicalProgramKey);
}

export function getCanonicalProgramPreset(key?: string | null) {
  const normalized = normalizeProgramKey(key);
  return CANONICAL_PROGRAMS.find((p) => p.key === normalized) ?? null;
}

export function canonicalProgramOrder(key?: string | null) {
  return getCanonicalProgramPreset(key)?.sort_order ?? 999;
}

export function canonicalizePrograms<T extends { key: string; sort_order: number }>(programs: T[]): T[] {
  const byKey = new Map<CanonicalProgramKey, T>();
  for (const program of programs) {
    const key = normalizeProgramKey(program.key) as CanonicalProgramKey;
    if (!isCanonicalProgramKey(key)) continue;
    if (!byKey.has(key)) byKey.set(key, program);
  }
  return CANONICAL_PROGRAMS
    .map((preset) => byKey.get(preset.key))
    .filter((program): program is T => Boolean(program))
    .sort((a, b) => canonicalProgramOrder(a.key) - canonicalProgramOrder(b.key));
}
