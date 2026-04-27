import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { canonicalizePrograms, getCanonicalProgramPreset, normalizeProgramKey } from "@admin/features/academic/lib/courseCatalog";

/**
 * useCoursesAdmin — CRUD cho Module Quản lý Khóa học (admin portal).
 *
 * UI mới chỉ quản trị 3 chương trình chuẩn (IELTS / WRE / Customized).
 * Bảng `programs` có thể còn dữ liệu legacy; hook này chủ động lọc canonical
 * để các trang admin không hiển thị rows rác trong lúc DB chưa được dọn sạch.
 */

export interface CourseProgram {
  id: string;
  key: string;
  name: string;
  description: string | null;
  color_key: string | null;
  icon_key: string | null;
  sort_order: number;
  status: "active" | "inactive";
  level_ids: string[];
}

export interface CourseProgramInput {
  key: string;
  name: string;
  description: string | null;
  color_key: string | null;
  icon_key: string | null;
  sort_order: number;
  status: "active" | "inactive";
  level_ids: string[];
}

export function useCoursesAdmin() {
  const [programs, setPrograms] = useState<CourseProgram[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      let progRows: any[] = [];
      const res = await (supabase as any)
        .from("programs")
        .select("id, key, name, description, color_key, icon_key, sort_order, status")
        .order("sort_order", { ascending: true });
      if (res.error) {
        console.error("[useCoursesAdmin] programs select failed:", res.error);
      } else {
        progRows = res.data ?? [];
      }

      let linkRows: Array<{ program_id: string; level_id: string; sort_order?: number }> = [];
      const links = await (supabase as any)
        .from("program_levels")
        .select("program_id, level_id, sort_order")
        .order("sort_order", { ascending: true });
      if (!links.error && Array.isArray(links.data)) linkRows = links.data;

      const linksByProgram = new Map<string, string[]>();
      for (const row of linkRows) {
        const arr = linksByProgram.get(row.program_id) ?? [];
        arr.push(row.level_id);
        linksByProgram.set(row.program_id, arr);
      }

      const merged: CourseProgram[] = progRows.map((p) => {
        const normalizedKey = normalizeProgramKey(p.key);
        const preset = getCanonicalProgramPreset(normalizedKey);
        return {
          id: p.id,
          key: normalizedKey,
          name: preset?.name ?? p.name,
          description: p.description ?? preset?.description ?? null,
          color_key: p.color_key ?? preset?.color_key ?? null,
          icon_key: p.icon_key ?? preset?.icon_key ?? null,
          sort_order: preset?.sort_order ?? p.sort_order ?? 0,
          status: (p.status as "active" | "inactive") ?? "active",
          level_ids: linksByProgram.get(p.id) ?? [],
        };
      });

      setPrograms(canonicalizePrograms(merged));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const channelName = `courses-admin-sync-${Math.random().toString(36).slice(2, 10)}`;
    const channel = (supabase as any)
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "programs" }, () => { fetchAll(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "course_levels" }, () => { fetchAll(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "program_levels" }, () => { fetchAll(); })
      .subscribe();
    return () => {
      try { (supabase as any).removeChannel(channel); } catch { /* noop */ }
    };
  }, [fetchAll]);

  const syncLevels = async (programId: string, levelIds: string[]) => {
    await (supabase as any).from("program_levels").delete().eq("program_id", programId);
    if (levelIds.length === 0) return;
    const rows = levelIds.map((level_id, idx) => ({
      program_id: programId,
      level_id,
      sort_order: idx,
    }));
    const { error } = await (supabase as any).from("program_levels").insert(rows);
    if (error) throw error;
  };

  const create = async (input: CourseProgramInput) => {
    const preset = getCanonicalProgramPreset(input.key);
    if (!preset) throw new Error("Chỉ được tạo IELTS, WRE hoặc Customized.");
    const { level_ids, ...payload } = input;
    const { data, error } = await (supabase as any)
      .from("programs")
      .insert({ ...payload, key: preset.key, name: preset.name, sort_order: preset.sort_order, status: "active" })
      .select("id")
      .single();
    if (error) throw error;
    if (data?.id) await syncLevels(data.id, level_ids);
    await fetchAll();
  };

  const update = async (id: string, input: CourseProgramInput) => {
    const preset = getCanonicalProgramPreset(input.key);
    if (!preset) throw new Error("Chỉ được cập nhật IELTS, WRE hoặc Customized.");
    const { level_ids, ...payload } = input;
    const { error } = await (supabase as any)
      .from("programs")
      .update({ ...payload, key: preset.key, name: preset.name, sort_order: preset.sort_order, status: "active" })
      .eq("id", id);
    if (error) throw error;
    await syncLevels(id, level_ids);
    await fetchAll();
  };

  const remove = async (_id?: string) => {
    throw new Error("Không thể xoá chương trình chuẩn. Hãy dùng Chuẩn hóa dữ liệu nếu có dòng rác.");
  };

  const setProgramLevels = async (programId: string, levelIds: string[]) => {
    await syncLevels(programId, levelIds);
    await fetchAll();
  };

  return { programs, loading, refetch: fetchAll, create, update, remove, setProgramLevels };
}
