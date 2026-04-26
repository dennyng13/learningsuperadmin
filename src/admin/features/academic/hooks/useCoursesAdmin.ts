import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * useCoursesAdmin — CRUD cho Module Quản lý Khóa học (admin portal).
 *
 * Đọc/ghi 3 nguồn:
 *   • `programs`        — metadata chương trình (key/name/desc/color/icon/outcomes)
 *   • `course_levels`   — danh sách level toàn hệ
 *   • `program_levels`  — bảng nối (program_id ↔ level_id)
 *
 * Frontend pattern: ép `as any` cho các bảng/cột chưa nằm trong types
 * generated (programs.outcomes, program_levels). Migration kèm trong
 * `docs/migrations/2026-04-26-courses-module.sql`.
 */

export interface CourseProgram {
  id: string;
  key: string;
  name: string;
  description: string | null;
  long_description: string | null;
  outcomes: string[];
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
  long_description: string | null;
  outcomes: string[];
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

    const [{ data: progRows }, { data: linkRows }] = await Promise.all([
      (supabase as any)
        .from("programs")
        .select(
          "id, key, name, description, long_description, outcomes, color_key, icon_key, sort_order, status",
        )
        .order("sort_order", { ascending: true }),
      (supabase as any)
        .from("program_levels")
        .select("program_id, level_id, sort_order")
        .order("sort_order", { ascending: true }),
    ]);

    const linksByProgram = new Map<string, string[]>();
    for (const row of (linkRows ?? []) as Array<{ program_id: string; level_id: string }>) {
      const arr = linksByProgram.get(row.program_id) ?? [];
      arr.push(row.level_id);
      linksByProgram.set(row.program_id, arr);
    }

    const merged: CourseProgram[] = ((progRows ?? []) as any[]).map((p) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      description: p.description ?? null,
      long_description: p.long_description ?? null,
      outcomes: Array.isArray(p.outcomes) ? (p.outcomes as string[]) : [],
      color_key: p.color_key ?? null,
      icon_key: p.icon_key ?? null,
      sort_order: p.sort_order ?? 0,
      status: (p.status as "active" | "inactive") ?? "active",
      level_ids: linksByProgram.get(p.id) ?? [],
    }));

    setPrograms(merged);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /** Sync `program_levels` cho 1 program — xóa hết rồi insert lại theo thứ tự. */
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
    const { level_ids, ...payload } = input;
    const { data, error } = await (supabase as any)
      .from("programs")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    if (data?.id) await syncLevels(data.id, level_ids);
    await fetchAll();
  };

  const update = async (id: string, input: CourseProgramInput) => {
    const { level_ids, ...payload } = input;
    const { error } = await (supabase as any)
      .from("programs")
      .update(payload)
      .eq("id", id);
    if (error) throw error;
    await syncLevels(id, level_ids);
    await fetchAll();
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("programs").delete().eq("id", id);
    if (error) throw error;
    await fetchAll();
  };

  return { programs, loading, refetch: fetchAll, create, update, remove };
}