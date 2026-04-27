/**
 * useResourceList — Generic filter pipeline cho Practice / Flashcards / Assessments.
 *
 * Tách logic "lọc theo Program → Course (qua pivot resource_courses)" ra khỏi
 * 3 trang danh sách để chúng dùng chung và behave nhất quán.
 *
 * Input:
 *   - kind: 'exercise' | 'flashcard_set' | 'assessment' (để biết bảng pivot)
 *   - resources: mảng raw items (đã fetch sẵn từ Supabase)
 *   - filters: { programIds, courseIds, includeUntagged }
 *
 * Output:
 *   - filtered: items khớp filter
 *   - assignmentMap: resource_id → course_id[] (dùng cho UI badge)
 *   - counts: tiện cho hiển thị "12 khớp khoá / 5 chưa phân loại"
 */
import { useMemo } from "react";
import {
  useAssignmentMapForResources,
  type ResourceKind,
} from "./useResourceCourses";

export interface ResourceListFilters {
  /** Set rỗng = không filter theo program. */
  programIds: Set<string>;
  /** Set rỗng = không filter theo course. */
  courseIds: Set<string>;
  /**
   * Khi courseIds có giá trị: nếu true thì items "chưa gán khoá nào" vẫn được
   * giữ lại (default true — phù hợp "Chưa phân loại" trong picker).
   */
  includeUntagged?: boolean;
}

export interface ResourceListItem {
  id: string;
  /** Cột program text trên row (nếu có) — dùng cho filter program legacy. */
  program?: string | null;
  [key: string]: any;
}

export interface ResourceListResult<T extends ResourceListItem> {
  filtered: T[];
  matched: T[];
  untagged: T[];
  other: T[];
  assignmentMap: Record<string, string[]>;
  /** True khi map còn đang fetch — caller có thể show skeleton. */
  isLoadingAssignments: boolean;
}

export function useResourceList<T extends ResourceListItem>(
  kind: ResourceKind,
  resources: T[],
  filters: ResourceListFilters,
): ResourceListResult<T> {
  const ids = useMemo(() => resources.map((r) => r.id), [resources]);
  const { data: assignmentMap = {}, isLoading: isLoadingAssignments } =
    useAssignmentMapForResources(kind, ids);

  const includeUntagged = filters.includeUntagged ?? true;

  return useMemo(() => {
    const matched: T[] = [];
    const untagged: T[] = [];
    const other: T[] = [];

    const filtered = resources.filter((r) => {
      // Filter by program (text column)
      if (filters.programIds.size > 0) {
        if (!r.program || !filters.programIds.has(r.program)) return false;
      }

      // Filter by course (pivot)
      // Lưu ý: program "other" (Khác) không có khoá học → không thể (và không
      // nên) bị loại bỏ bởi courseIds filter. Coi như luôn match khi program
      // filter đã pass.
      if (filters.courseIds.size > 0 && r.program !== "other") {
        const courses = assignmentMap[r.id] || [];
        const isMatched = courses.some((c) => filters.courseIds.has(c));
        if (isMatched) {
          matched.push(r);
          return true;
        }
        if (courses.length === 0) {
          untagged.push(r);
          return includeUntagged;
        }
        other.push(r);
        return false;
      }

      // No course filter (hoặc row thuộc program "Khác") → split by tag presence (info only)
      const courses = assignmentMap[r.id] || [];
      if (courses.length === 0) untagged.push(r);
      else matched.push(r);
      return true;
    });

    return { filtered, matched, untagged, other, assignmentMap, isLoadingAssignments };
  }, [resources, filters.programIds, filters.courseIds, includeUntagged, assignmentMap, isLoadingAssignments]);
}