import { supabase } from "@/integrations/supabase/client";
import { CANONICAL_PROGRAMS, normalizeProgramKey } from "@admin/features/academic/lib/courseCatalog";

interface ProgramRow {
  id: string;
  key: string;
  name: string | null;
  description: string | null;
  color_key: string | null;
  icon_key: string | null;
  sort_order: number | null;
  status: "active" | "inactive" | null;
}

interface ProgramLevelRow {
  id: string;
  program_id: string;
  level_id: string;
  sort_order: number | null;
}

export interface CourseCatalogRepairResult {
  createdPrograms: number;
  updatedPrograms: number;
  movedLevelLinks: number;
  deletedDuplicateLinks: number;
  deletedPrograms: number;
}

export async function repairCanonicalCourseCatalog(): Promise<CourseCatalogRepairResult> {
  const result: CourseCatalogRepairResult = {
    createdPrograms: 0,
    updatedPrograms: 0,
    movedLevelLinks: 0,
    deletedDuplicateLinks: 0,
    deletedPrograms: 0,
  };

  const { data: programsData, error: programsError } = await (supabase as any)
    .from("programs")
    .select("id, key, name, description, color_key, icon_key, sort_order, status")
    .order("sort_order", { ascending: true });
  if (programsError) throw programsError;

  const allPrograms = ((programsData ?? []) as ProgramRow[]).filter((p) => p.id);
  const canonicalIds = new Map<string, string>();

  for (const preset of CANONICAL_PROGRAMS) {
    const existing = allPrograms.find((p) => normalizeProgramKey(p.key) === preset.key);
    const payload = {
      key: preset.key,
      name: preset.name,
      description: existing?.description?.trim() || preset.description,
      color_key: existing?.color_key || preset.color_key,
      icon_key: existing?.icon_key || preset.icon_key,
      sort_order: preset.sort_order,
      status: "active" as const,
    };

    if (existing) {
      const { error } = await (supabase as any).from("programs").update(payload).eq("id", existing.id);
      if (error) throw error;
      canonicalIds.set(preset.key, existing.id);
      result.updatedPrograms += 1;
    } else {
      const { data, error } = await (supabase as any)
        .from("programs")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      canonicalIds.set(preset.key, data.id);
      result.createdPrograms += 1;
    }
  }

  const keepIds = new Set(canonicalIds.values());
  const ieltsId = canonicalIds.get("ielts");
  if (!ieltsId) throw new Error("Không thể xác định chương trình IELTS chuẩn.");

  const { data: linksData, error: linksError } = await (supabase as any)
    .from("program_levels")
    .select("id, program_id, level_id, sort_order")
    .order("sort_order", { ascending: true });
  if (linksError) throw linksError;

  const links = ((linksData ?? []) as ProgramLevelRow[]).filter((row) => row.id && row.level_id);
  const ieltsLevelIds = new Set(links.filter((row) => row.program_id === ieltsId).map((row) => row.level_id));
  const staleLinks = links.filter((row) => !keepIds.has(row.program_id));
  const idsToDelete = new Set<string>();
  const idsToMove: string[] = [];
  const seenMovingLevels = new Set<string>();

  for (const link of staleLinks) {
    if (ieltsLevelIds.has(link.level_id) || seenMovingLevels.has(link.level_id)) {
      idsToDelete.add(link.id);
      continue;
    }
    idsToMove.push(link.id);
    seenMovingLevels.add(link.level_id);
  }

  if (idsToDelete.size > 0) {
    const { error } = await (supabase as any).from("program_levels").delete().in("id", [...idsToDelete]);
    if (error) throw error;
    result.deletedDuplicateLinks = idsToDelete.size;
  }

  if (idsToMove.length > 0) {
    const { error } = await (supabase as any)
      .from("program_levels")
      .update({ program_id: ieltsId })
      .in("id", idsToMove);
    if (error) throw error;
    result.movedLevelLinks = idsToMove.length;
  }

  const keepIdList = [...keepIds];
  if (keepIdList.length > 0) {
    const { error, count } = await (supabase as any)
      .from("programs")
      .delete({ count: "exact" })
      .not("id", "in", `(${keepIdList.join(",")})`);
    if (error) throw error;
    result.deletedPrograms = count ?? 0;
  }

  return result;
}
