import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@shared/hooks/useAuth";
import type { StudentFieldGroup } from "@shared/types/student";

export interface StudentFieldAccessRow {
  id: string;
  role: string;
  field_group: string;
  can_view: boolean;
  can_edit: boolean;
}

export const STUDENT_FIELD_ACCESS_QUERY_KEY = ["student-field-access"] as const;

async function fetchAccess(): Promise<StudentFieldAccessRow[]> {
  const { data, error } = await supabase
    .from("student_field_access")
    .select("id, role, field_group, can_view, can_edit");
  if (error) throw error;
  return (data as any[]) ?? [];
}

/**
 * Quản lý quyền **xem/sửa từng nhóm field** trong hồ sơ học viên.
 *
 * - `rows`: toàn bộ access entries (admin UI cần).
 * - `canView` / `canEdit`: guard helper — super_admin luôn full quyền.
 * - `setAccess`: upsert (role, field_group, can_view, can_edit).
 *   Tự enforce: tắt `can_view` → tắt `can_edit`.
 *
 * Pattern song song với `useModuleAccess` (React Query, cache chia sẻ).
 */
export function useStudentFieldAccess() {
  const qc = useQueryClient();

  const { data: rows = [], isLoading: loading, refetch } = useQuery({
    queryKey: STUDENT_FIELD_ACCESS_QUERY_KEY,
    queryFn: fetchAccess,
    staleTime: 60_000,
  });

  const getEntry = useCallback(
    (role: string, group: string) =>
      rows.find((r) => r.role === role && r.field_group === group),
    [rows],
  );

  const canView = useCallback(
    (role: AppRole | null, group: StudentFieldGroup | string): boolean => {
      if (!role) return false;
      if (role === "super_admin") return true;
      return getEntry(role, group)?.can_view ?? false;
    },
    [getEntry],
  );

  const canEdit = useCallback(
    (role: AppRole | null, group: StudentFieldGroup | string): boolean => {
      if (!role) return false;
      if (role === "super_admin") return true;
      const entry = getEntry(role, group);
      return (entry?.can_view && entry?.can_edit) ?? false;
    },
    [getEntry],
  );

  const setMutation = useMutation({
    mutationFn: async (input: {
      role: string;
      group: string;
      can_view?: boolean;
      can_edit?: boolean;
    }) => {
      const existing = getEntry(input.role, input.group);
      // Enforce: tắt view → tắt edit
      const next_view = input.can_view ?? existing?.can_view ?? false;
      const next_edit = next_view ? (input.can_edit ?? existing?.can_edit ?? false) : false;

      if (existing?.id) {
        const { error } = await supabase
          .from("student_field_access")
          .update({ can_view: next_view, can_edit: next_edit })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("student_field_access")
          .insert({
            role: input.role,
            field_group: input.group,
            can_view: next_view,
            can_edit: next_edit,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: STUDENT_FIELD_ACCESS_QUERY_KEY }),
  });

  /** Toggle 1 field (`can_view` hoặc `can_edit`) cho 1 (role, group). */
  const toggleAccess = useCallback(
    async (
      role: string,
      group: string,
      field: "can_view" | "can_edit",
      nextValue: boolean,
    ) => {
      try {
        await setMutation.mutateAsync({ role, group, [field]: nextValue });
        return { error: null };
      } catch (error) {
        return { error };
      }
    },
    [setMutation],
  );

  return { rows, loading, canView, canEdit, toggleAccess, refetch };
}
