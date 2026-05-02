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

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

type StudyPlanInsert = Database["public"]["Tables"]["study_plans"]["Insert"];
type StudyPlanUpdate = Database["public"]["Tables"]["study_plans"]["Update"];

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
    },
  });
}
