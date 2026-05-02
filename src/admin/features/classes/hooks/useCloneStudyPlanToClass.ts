/**
 * F3.3 Path B — Clone study plan to target class.
 *
 * Wraps Lovable RPC `clone_study_plan_to_class(source_plan_id, target_class_id)`.
 * RPC contract (locked per Lovable):
 * - Args: source_plan_id (uuid), target_class_id (uuid)  — NO p_ prefix
 * - Returns: uuid (new study_plans.id)
 * - Authority: super_admin/admin broad; teacher only own_taught classes (has_role helper)
 * - Side effects: target_class.study_plan_id updated; entries cloned with reset state
 *   (entry_date / completed_at / plan_status reset — caller must reschedule)
 *
 * Cast `(supabase.rpc as any)` matches existing convention for RPCs not yet
 * present in regenerated types.ts (see useStudyPlanTemplates.cloneTemplate
 * for prior art).
 *
 * Cache invalidation:
 * - ["admin-study-plans"]                        — global plan list
 * - ["admin-class-detail", target_class_id]      — refresh new owner
 * - ["plan-progress-plan", *]                    — PlanProgressTab plan
 * - ["plan-progress-entries", *]                 — PlanProgressTab entries
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CloneArgs {
  sourcePlanId: string;
  targetClassId: string;
}

export function useCloneStudyPlanToClass() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (args: CloneArgs): Promise<string> => {
      const { data, error } = await (supabase.rpc as any)(
        "clone_study_plan_to_class",
        {
          source_plan_id: args.sourcePlanId,
          target_class_id: args.targetClassId,
        },
      );
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_newPlanId, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-study-plans"] });
      qc.invalidateQueries({ queryKey: ["admin-class-detail", vars.targetClassId] });
      qc.invalidateQueries({ queryKey: ["plan-progress-plan"] });
      qc.invalidateQueries({ queryKey: ["plan-progress-entries"] });
    },
  });
}

/** Map Lovable RPC error messages → user-friendly Vietnamese copy. */
export function mapClonePlanError(rawMessage: string): string {
  if (/Source plan not accessible/i.test(rawMessage)) {
    return "Không có quyền truy cập kế hoạch nguồn.";
  }
  if (/Not authorized to clone to target class/i.test(rawMessage)) {
    return "Không có quyền sao chép vào lớp này.";
  }
  if (/function .* does not exist|404/i.test(rawMessage)) {
    return "Backend RPC chưa sẵn sàng. Vui lòng liên hệ admin Lovable.";
  }
  return rawMessage || "Lỗi sao chép kế hoạch";
}
