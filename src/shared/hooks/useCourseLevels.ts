import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CourseLevel {
  id: string;
  name: string;
  sort_order: number;
  color_key: string | null;
}

/**
 * useCourseLevels — danh sách Cấp độ (course_levels) dùng chung khắp UI.
 *
 * Mặc định CHỈ trả về các level có liên kết với ít nhất 1 program ACTIVE
 * (qua bảng `program_levels` ↔ `programs.status='active'`). Các level mồ côi
 * (không thuộc program nào) hoặc thuộc program đã ẩn sẽ bị lọc bỏ — tránh
 * lộ dữ liệu cũ trong wizard tạo lớp, study plan, flashcard, v.v.
 *
 * Truyền `{ includeOrphans: true }` cho các trang QUẢN LÝ (Course Levels,
 * Course Level Manager) — nơi admin cần thấy mọi level để dọn dẹp / gán lại.
 */
export function useCourseLevels(opts: { includeOrphans?: boolean } = {}) {
  const { includeOrphans = false } = opts;
  const [levels, setLevels] = useState<CourseLevel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLevels = useCallback(async () => {
    const { data } = await supabase
      .from("course_levels")
      .select("*")
      .order("sort_order", { ascending: true });
    const all = (data as unknown as CourseLevel[] | null) ?? [];

    if (includeOrphans) {
      setLevels(all);
      setLoading(false);
      return;
    }

    // Lọc: chỉ giữ level có ít nhất 1 link tới program active.
    const [{ data: progRows }, { data: linkRows }] = await Promise.all([
      (supabase as any).from("programs").select("id, status").eq("status", "active"),
      (supabase as any).from("program_levels").select("level_id, program_id"),
    ]);

    const activeProgramIds = new Set<string>(
      Array.isArray(progRows) ? progRows.map((p: any) => p.id) : [],
    );
    const allowedLevelIds = new Set<string>();
    if (Array.isArray(linkRows)) {
      for (const row of linkRows) {
        if (activeProgramIds.has(row.program_id)) allowedLevelIds.add(row.level_id);
      }
    }

    setLevels(all.filter((l) => allowedLevelIds.has(l.id)));
    setLoading(false);
  }, [includeOrphans]);

  useEffect(() => { fetchLevels(); }, [fetchLevels]);

  return { levels, loading, refetch: fetchLevels };
}
