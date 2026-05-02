/**
 * ClassPlanEditDialog — F3.6 Tier 2 instance edit (Phase F3 v2 §6.6).
 *
 * Edits study_plans row attached to a class (Tier 2 instance).
 * Opens từ ClassDetail PlanProgressTab "Sửa" button.
 *
 * Features:
 * - Hosts PlanEditor mode="instance"
 * - Loads existing instance row → maps to PlanEditorData
 * - Updates via useUpdateUOP hook (generic study_plans UPDATE — works for any tier)
 *
 * Reverse-sync defer (per F3 v2 OQ8 default OFF + spec §4.4 advanced toggle):
 * - Reverse-sync would propagate instance changes back to parent template
 * - Audit log requirement
 * - Will ship as separate enhancement post-spec confirm Q2 lock
 *
 * Mockup ref: Admin Portal IA §3.2.x (class-level work).
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@shared/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  PlanEditor, EMPTY_PLAN_DATA, type PlanEditorData,
} from "@admin/features/study-plans/components/PlanEditor";
import { useUpdateUOP } from "@admin/features/study-plans/hooks/useUOPMutations";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studyPlanId: string;
  /** Optional: invalidate parent's queries on save success. */
  onUpdated?: () => void;
}

export function ClassPlanEditDialog({ open, onOpenChange, studyPlanId, onUpdated }: Props) {
  const [data, setData] = useState<PlanEditorData>(EMPTY_PLAN_DATA);
  // Note: useUpdateUOP wraps generic study_plans UPDATE. RLS handles authority
  // (instance visible to class members). Naming is historical — semantics generic.
  const updateMutation = useUpdateUOP();

  const fetchQ = useQuery({
    queryKey: ["class-plan-edit", studyPlanId],
    enabled: open && !!studyPlanId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_plans")
        .select("*")
        .eq("id", studyPlanId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Hydrate editor state when fetch completes
  useEffect(() => {
    if (!open || !fetchQ.data) return;
    const row = fetchQ.data;
    setData({
      name: row.plan_name ?? "",
      program: row.program ?? null,
      course_id: row.course_id ?? null,
      cefr_level: row.cefr_level ?? null,
      level_ids: [],
      tags: Array.isArray(row.tags) ? row.tags : [],
      description: row.teacher_notes ?? null,
      sessions: row.total_sessions ?? 0,
      total_hours: row.total_hours ?? 0,
      session_duration_minutes: row.session_duration ?? 60,
      class_id: null, // class_ids jsonb array — not picker'd in F3.6 v1
      parent_template_id: row.parent_template_id ?? null,
      parent_uop_id: row.parent_uop_id ?? null,
    });
  }, [open, fetchQ.data]);

  const handleSave = async (planData: PlanEditorData) => {
    try {
      await updateMutation.mutateAsync({
        id: studyPlanId,
        patch: {
          plan_name: planData.name.trim(),
          program: planData.program,
          course_id: planData.course_id,
          cefr_level: planData.cefr_level,
          tags: planData.tags.length > 0 ? planData.tags : null,
          total_sessions: planData.sessions,
          total_hours: planData.total_hours,
          session_duration: planData.session_duration_minutes,
          teacher_notes: planData.description ?? "",
        },
      });
      toast.success(`Đã cập nhật kế hoạch "${planData.name}"`);
      onOpenChange(false);
      onUpdated?.();
    } catch (err: any) {
      toast.error(err?.message || "Lỗi cập nhật kế hoạch", { duration: 6000 });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sửa Kế hoạch của lớp (Tier 2 Instance)</DialogTitle>
        </DialogHeader>
        {fetchQ.isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Đang tải kế hoạch...
          </div>
        ) : fetchQ.error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Lỗi tải kế hoạch: {(fetchQ.error as Error).message}
          </div>
        ) : (
          <>
            <div className="rounded-lg border bg-emerald-500/5 border-emerald-500/30 p-3 text-xs space-y-1">
              <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                ✏️ Tier 2 Instance — chỉ ảnh hưởng lớp này
              </p>
              <p className="text-muted-foreground">
                Thay đổi không propagate lên parent template (default per F3 v2 §4.4 OQ8 OFF).
                Reverse-sync option sẽ ship enhancement sau.
              </p>
            </div>
            <PlanEditor
              mode="instance"
              value={data}
              onChange={setData}
              onSave={handleSave}
              saving={updateMutation.isPending}
              title=""
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
