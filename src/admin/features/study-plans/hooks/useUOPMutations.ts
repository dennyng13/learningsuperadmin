/**
 * F3.4 wire — UOP create/update mutations (post F3.1 schema deliver).
 *
 * Wraps `study_plans` INSERT/UPDATE for User-Owned Plan (UOP) tier per F3 v2 §4.1.
 * Auto-sets is_user_owned=true + created_by_user_id from auth.uid() on create.
 *
 * Schema reference (Lovable F3.1):
 * - is_user_owned   (default false; UOP forces true)
 * - is_public       (default false; UOP marketplace toggle Sprint 3)
 * - created_by_user_id  (FK auth.users, ON DELETE SET NULL)
 * - cefr_level      (A1-C2 enum check)
 * - tags            (text[])
 * - total_hours     (numeric — bidirectional with sessions/duration)
 * - parent_template_id  (FK study_plan_templates.id — separate table)
 * - parent_uop_id   (FK study_plans.id — copy lineage)
 *
 * Cache invalidation: ["admin-study-plans"], ["teacher-study-plans"], ["uops-of-mine"]
 * (last key reserved for F3.5 marketplace UI).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

type StudyPlanRow = Database["public"]["Tables"]["study_plans"]["Row"];
type StudyPlanInsert = Database["public"]["Tables"]["study_plans"]["Insert"];
type StudyPlanUpdate = Database["public"]["Tables"]["study_plans"]["Update"];

/** UOP row subset cho list/marketplace display. */
export type UOPListRow = Pick<
  StudyPlanRow,
  "id" | "plan_name" | "program" | "course_id" | "cefr_level" | "tags"
  | "total_hours" | "total_sessions" | "session_duration"
  | "is_public" | "created_by_user_id" | "parent_uop_id"
  | "created_at" | "updated_at" | "plan_type"
>;

/** Subset cho UOP create — em strip auto-set fields (is_user_owned, created_by_user_id). */
export type UOPCreateInput = Omit<
  StudyPlanInsert,
  "is_user_owned" | "created_by_user_id" | "id" | "created_at" | "updated_at"
>;

export function useCreateUOP() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: UOPCreateInput) => {
      if (!user?.id) throw new Error("Phải đăng nhập để tạo UOP");
      const payload: StudyPlanInsert = {
        ...input,
        is_user_owned: true,
        created_by_user_id: user.id,
        is_public: input.is_public ?? false,
      };
      const { data, error } = await supabase
        .from("study_plans")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-study-plans"] });
      qc.invalidateQueries({ queryKey: ["teacher-study-plans"] });
      qc.invalidateQueries({ queryKey: ["uops-of-mine"] });
    },
  });
}

export function useUpdateUOP() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (args: { id: string; patch: StudyPlanUpdate }) => {
      // Note: RLS policy "UOPs owner full access" enforces created_by_user_id = auth.uid()
      // No need để re-verify ownership client-side.
      const { error } = await supabase
        .from("study_plans")
        .update(args.patch)
        .eq("id", args.id);
      if (error) throw error;
      return args.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-study-plans"] });
      qc.invalidateQueries({ queryKey: ["teacher-study-plans"] });
      qc.invalidateQueries({ queryKey: ["uops-of-mine"] });
      qc.invalidateQueries({ queryKey: ["uops-public"] });
    },
  });
}

export function useDeleteUOP() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("study_plans").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["uops-of-mine"] });
      qc.invalidateQueries({ queryKey: ["uops-public"] });
      qc.invalidateQueries({ queryKey: ["admin-study-plans"] });
    },
  });
}

/** Copy public UOP → new UOP với current user as owner.
 *  Sets parent_uop_id = source UOP id, is_public = false (private copy by default). */
export function useCopyPublicUOP() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (sourceUOPId: string) => {
      if (!user?.id) throw new Error("Phải đăng nhập để copy UOP");
      // Fetch source UOP
      const { data: source, error: fetchErr } = await supabase
        .from("study_plans")
        .select("*")
        .eq("id", sourceUOPId)
        .eq("is_user_owned", true)
        .eq("is_public", true)
        .single();
      if (fetchErr) throw fetchErr;
      if (!source) throw new Error("UOP nguồn không tồn tại hoặc không công khai");

      // Build copy payload — strip auto-set fields, mark as private copy
      const { id, created_at, updated_at, ...rest } = source;
      void id; void created_at; void updated_at;
      const copyPayload: StudyPlanInsert = {
        ...rest,
        plan_name: `${source.plan_name ?? "Plan"} (sao chép)`,
        is_user_owned: true,
        is_public: false,
        created_by_user_id: user.id,
        parent_uop_id: sourceUOPId,
      };
      const { data, error } = await supabase
        .from("study_plans")
        .insert(copyPayload)
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["uops-of-mine"] });
    },
  });
}

/** Query: own UOPs (created_by_user_id = current user). */
export function useMyUOPs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["uops-of-mine", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<UOPListRow[]> => {
      const { data, error } = await supabase
        .from("study_plans")
        .select(
          "id, plan_name, program, course_id, cefr_level, tags, total_hours, total_sessions, session_duration, is_public, created_by_user_id, parent_uop_id, created_at, updated_at, plan_type",
        )
        .eq("is_user_owned", true)
        .eq("created_by_user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as UOPListRow[];
    },
  });
}

/** Query: public UOPs marketplace (excluding own UOPs by default). */
export function usePublicUOPs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["uops-public", user?.id],
    queryFn: async (): Promise<UOPListRow[]> => {
      let q = supabase
        .from("study_plans")
        .select(
          "id, plan_name, program, course_id, cefr_level, tags, total_hours, total_sessions, session_duration, is_public, created_by_user_id, parent_uop_id, created_at, updated_at, plan_type",
        )
        .eq("is_user_owned", true)
        .eq("is_public", true)
        .order("updated_at", { ascending: false });
      // Exclude own UOPs from public marketplace (admin sees own ở "My UOPs" tab).
      if (user?.id) q = q.neq("created_by_user_id", user.id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as UOPListRow[];
    },
  });
}
