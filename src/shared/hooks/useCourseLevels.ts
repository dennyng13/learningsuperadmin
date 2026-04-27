import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CourseLevel {
  id: string;
  name: string;
  sort_order: number;
  color_key: string | null;
  /** Điểm mục tiêu free-text (vd. "IELTS 6.5", "WRE 80/100") — col mới sau migration. */
  target_score?: string | null;
  /** Mô tả chi tiết. */
  long_description?: string | null;
  /** Danh sách đầu ra. */
  outcomes?: string[];
  /** Study Plan Template mặc định cho cấp độ này. */
  study_plan_template_id?: string | null;
}

/**
 * useCourseLevels — danh sách Cấp độ (course_levels) dùng chung khắp UI.
 *
 * Mặc định CHỈ trả về các level có liên kết với ít nhất 1 program ACTIVE
 * (qua bảng `program_levels` ↔ `programs.status='active'`). Các level mồ côi
 * (không thuộc program nào) hoặc thuộc program đã ẩn sẽ bị lọc bỏ — tránh
 * lộ dữ liệu cũ trong wizard tạo lớp, study plan, flashcard, v.v.
 *
 * Truyền `{ includeOrphans: true }` cho các trang QUẢN LÝ — nơi admin cần
 * thấy mọi level để dọn dẹp / gán lại.
 *
 * Caching: Dùng module-scoped cache + pub/sub (giống usePrograms) — nhiều
 * component cùng gọi hook này sẽ chia sẻ 1 lần fetch duy nhất, không phụ
 * thuộc react-query để tránh xung đột phiên bản observer.
 */

let cachedAll: CourseLevel[] = [];
let cachedActiveIds: Set<string> = new Set();
let fetchPromise: Promise<void> | null = null;
let hasLoaded = false;
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((cb) => {
    try { cb(); } catch { /* ignore */ }
  });
}

async function doFetch(): Promise<void> {
  // 2 query song song: tất cả levels + danh sách level_id thuộc program active
  const [allRes, activeRes] = await Promise.all([
    supabase
      .from("course_levels")
      .select("*")
      .order("sort_order", { ascending: true }),
    (supabase as any)
      .from("program_levels")
      .select("level_id, program:programs!inner(status)")
      .eq("program.status", "active"),
  ]);

  cachedAll = (allRes.data as unknown as CourseLevel[] | null) ?? [];
  const set = new Set<string>();
  if (Array.isArray(activeRes.data)) {
    for (const row of activeRes.data as Array<{ level_id: string }>) {
      set.add(row.level_id);
    }
  }
  cachedActiveIds = set;
  hasLoaded = true;
  notify();
}

function ensureFetched(): Promise<void> {
  if (!fetchPromise) fetchPromise = doFetch();
  return fetchPromise;
}

export async function refreshCourseLevels(): Promise<void> {
  fetchPromise = doFetch();
  return fetchPromise;
}

// ---- Realtime sync (browser only) ----------------------------------------
// Khi admin gán/đổi level↔program ở bất kỳ trang nào, mọi component dùng
// hook này (CoursesPage, study-plan editor, flashcards, wizard…) sẽ thấy
// thay đổi ngay nhờ realtime trên 3 bảng liên quan.
if (typeof window !== "undefined") {
  const channel = (supabase as any)
    .channel("course-levels-sync")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "course_levels" },
      () => { refreshCourseLevels(); },
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "program_levels" },
      () => { refreshCourseLevels(); },
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "programs" },
      () => { refreshCourseLevels(); },
    )
    .subscribe();
  window.addEventListener("beforeunload", () => {
    try { (supabase as any).removeChannel(channel); } catch { /* noop */ }
  });
}

export function useCourseLevels(opts: { includeOrphans?: boolean } = {}) {
  const { includeOrphans = false } = opts;
  const [, setTick] = useState(0);
  const [loading, setLoading] = useState(!hasLoaded);

  useEffect(() => {
    let mounted = true;
    const onChange = () => { if (mounted) setTick((t) => t + 1); };
    subscribers.add(onChange);
    ensureFetched().then(() => {
      if (!mounted) return;
      setLoading(false);
      setTick((t) => t + 1);
    });
    return () => {
      mounted = false;
      subscribers.delete(onChange);
    };
  }, []);

  const levels = includeOrphans
    ? cachedAll
    : cachedAll.filter((l) => cachedActiveIds.has(l.id));

  const refetch = useCallback(async () => {
    await refreshCourseLevels();
  }, []);

  return { levels, loading, refetch };
}
