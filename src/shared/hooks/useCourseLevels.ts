import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
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
 *
 * Caching: Dùng React Query với staleTime 5 phút — nhiều component cùng
 * gọi hook này sẽ chia sẻ cache, không refetch trùng lặp. Gọi `refetch()`
 * sau khi mutate (insert/update/delete) để invalidate cả 2 biến thể.
 */
const COURSE_LEVELS_KEY = ["course-levels"] as const;

async function fetchAllLevels(): Promise<CourseLevel[]> {
  const { data } = await supabase
    .from("course_levels")
    .select("*")
    .order("sort_order", { ascending: true });
  return (data as unknown as CourseLevel[] | null) ?? [];
}

/**
 * Lấy set level_id thuộc về ít nhất 1 program ACTIVE — dùng nested select
 * của PostgREST để gộp 2 query thành 1 round-trip.
 */
async function fetchActiveLevelIds(): Promise<Set<string>> {
  const { data } = await (supabase as any)
    .from("program_levels")
    .select("level_id, program:programs!inner(status)")
    .eq("program.status", "active");
  const set = new Set<string>();
  if (Array.isArray(data)) {
    for (const row of data) set.add(row.level_id);
  }
  return set;
}

export function useCourseLevels(opts: { includeOrphans?: boolean } = {}) {
  const { includeOrphans = false } = opts;
  const qc = useQueryClient();

  const allQ = useQuery({
    queryKey: [...COURSE_LEVELS_KEY, "all"],
    queryFn: fetchAllLevels,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });

  const activeIdsQ = useQuery({
    queryKey: [...COURSE_LEVELS_KEY, "active-ids"],
    queryFn: fetchActiveLevelIds,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    enabled: !includeOrphans,
  });

  const all = allQ.data ?? [];
  const levels = includeOrphans
    ? all
    : activeIdsQ.data
      ? all.filter((l) => activeIdsQ.data!.has(l.id))
      : [];

  const loading = allQ.isLoading || (!includeOrphans && activeIdsQ.isLoading);

  const refetch = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: COURSE_LEVELS_KEY });
  }, [qc]);

  return { levels, loading, refetch };
}
