import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * useResourceCourses — single source of truth for the global
 * Resource ↔ Course assignment system (pivot table `resource_courses`).
 *
 * Three resource kinds today: 'exercise' | 'flashcard_set' | 'assessment'.
 * Each can be assigned to N courses.
 *
 * Three primary use cases:
 *  1. List courses assigned to ONE resource (for the assignment panel on a
 *     practice/flashcard/assessment detail page).
 *  2. List resources assigned to ONE course (for filtering in Study Plan
 *     editor — only show resources matching the picked course).
 *  3. Bulk-assign / unassign.
 */
export type ResourceKind = "exercise" | "flashcard_set" | "assessment";

export interface ResourceCourseLink {
  id: string;
  resource_type: ResourceKind;
  resource_id: string;
  course_id: string;
  created_at: string;
}

/** All courses linked to a single resource. */
export function useCoursesForResource(kind: ResourceKind, resourceId: string | null | undefined) {
  return useQuery({
    queryKey: ["resource-courses", "by-resource", kind, resourceId],
    enabled: !!resourceId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("resource_courses")
        .select("id, course_id")
        .eq("resource_type", kind)
        .eq("resource_id", resourceId!);
      if (error) throw error;
      return ((data || []) as Array<{ id: string; course_id: string }>);
    },
  });
}

/** All resources of a given kind assigned to a course (returns Set of resource_id). */
export function useResourcesAssignedToCourse(kind: ResourceKind, courseId: string | null | undefined) {
  return useQuery({
    queryKey: ["resource-courses", "by-course", kind, courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("resource_courses")
        .select("resource_id")
        .eq("resource_type", kind)
        .eq("course_id", courseId!);
      if (error) throw error;
      return new Set((data || []).map((r: any) => r.resource_id as string));
    },
  });
}

/**
 * Map of resource_id → array of course_ids — useful when we have a list of
 * resources and want to know which is assigned to anything at all (so we can
 * separate "matched", "untagged" sections in the picker).
 */
export function useAssignmentMapForResources(kind: ResourceKind, resourceIds: string[]) {
  return useQuery({
    queryKey: ["resource-courses", "map", kind, [...resourceIds].sort().join(",")],
    enabled: resourceIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("resource_courses")
        .select("resource_id, course_id")
        .eq("resource_type", kind)
        .in("resource_id", resourceIds);
      if (error) throw error;
      const map: Record<string, string[]> = {};
      (data || []).forEach((r: any) => {
        (map[r.resource_id] ||= []).push(r.course_id);
      });
      return map;
    },
  });
}

/**
 * Split a resource list into:
 *   - matched:   resource has the given courseId in its assignment array
 *   - untagged:  resource has NO course assignments at all
 *   - other:     resource is assigned to OTHER courses (hidden by default)
 */
export function splitByCourseAssignment<T extends { id: string }>(
  resources: T[],
  assignmentMap: Record<string, string[]>,
  courseId: string | null | undefined,
) {
  const matched: T[] = [];
  const untagged: T[] = [];
  const other: T[] = [];
  resources.forEach((r) => {
    const courses = assignmentMap[r.id] || [];
    if (courses.length === 0) untagged.push(r);
    else if (courseId && courses.includes(courseId)) matched.push(r);
    else other.push(r);
  });
  return { matched, untagged, other };
}

/** Mutations — assign / unassign / bulk-set. */
export function useResourceCourseMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const invalidate = (kind: ResourceKind) => {
    qc.invalidateQueries({ queryKey: ["resource-courses"] });
  };

  const assign = useMutation({
    mutationFn: async ({ kind, resourceId, courseId }: { kind: ResourceKind; resourceId: string; courseId: string }) => {
      const { error } = await (supabase as any).from("resource_courses").insert({
        resource_type: kind,
        resource_id: resourceId,
        course_id: courseId,
        created_by: user?.id,
      });
      if (error && !String(error.message).match(/duplicate key/i)) throw error;
    },
    onSuccess: (_d, v) => invalidate(v.kind),
  });

  const unassign = useMutation({
    mutationFn: async ({ kind, resourceId, courseId }: { kind: ResourceKind; resourceId: string; courseId: string }) => {
      const { error } = await (supabase as any)
        .from("resource_courses")
        .delete()
        .eq("resource_type", kind)
        .eq("resource_id", resourceId)
        .eq("course_id", courseId);
      if (error) throw error;
    },
    onSuccess: (_d, v) => invalidate(v.kind),
  });

  /** Replace the full set of courses for a resource. */
  const setCourses = useMutation({
    mutationFn: async ({ kind, resourceId, courseIds }: { kind: ResourceKind; resourceId: string; courseIds: string[] }) => {
      // Read current
      const { data: current } = await (supabase as any)
        .from("resource_courses")
        .select("id, course_id")
        .eq("resource_type", kind)
        .eq("resource_id", resourceId);
      const currentSet = new Set((current || []).map((r: any) => r.course_id));
      const nextSet = new Set(courseIds);

      const toAdd = courseIds.filter((c) => !currentSet.has(c));
      const toRemoveIds = (current || [])
        .filter((r: any) => !nextSet.has(r.course_id))
        .map((r: any) => r.id);

      if (toAdd.length > 0) {
        const { error } = await (supabase as any).from("resource_courses").insert(
          toAdd.map((c) => ({ resource_type: kind, resource_id: resourceId, course_id: c, created_by: user?.id })),
        );
        if (error) throw error;
      }
      if (toRemoveIds.length > 0) {
        const { error } = await (supabase as any).from("resource_courses").delete().in("id", toRemoveIds);
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => invalidate(v.kind),
  });

  return { assign, unassign, setCourses };
}