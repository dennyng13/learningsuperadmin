/**
 * UOPCreateDialog — F3.4 wire entry point cho Tier 3 UOP create flow.
 *
 * Hosts PlanEditor (mode="uop") + wires onSave to useCreateUOP mutation.
 * Schema-aware after F3.1 deliver — uses Database["public"]["Tables"]["study_plans"]
 * type from auto-gen types.ts.
 *
 * Public toggle (is_public) defaults to false on create. Marketplace publish flow
 * deferred to F3.5 (Sprint 3).
 *
 * Field mapping PlanEditorData → study_plans Insert:
 * - data.name           → plan_name
 * - data.sessions       → total_sessions
 * - data.total_hours    → total_hours (NEW UOP column)
 * - data.session_duration_minutes → session_duration
 * - data.cefr_level     → cefr_level (NEW UOP column)
 * - data.tags           → tags (NEW UOP column, text[])
 * - data.is_public      → is_public (NEW UOP column, default false)
 * - is_user_owned, created_by_user_id auto-set bởi useCreateUOP hook
 *
 * Usage (Sprint 2+ integration):
 *   <UOPCreateDialog
 *     open={open}
 *     onOpenChange={setOpen}
 *     onCreated={(id) => router.push(`/my-plans/${id}`)}
 *   />
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@shared/components/ui/dialog";
import { PlanEditor, EMPTY_PLAN_DATA, type PlanEditorData } from "./PlanEditor";
import { useCreateUOP } from "../hooks/useUOPMutations";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called sau khi UOP created với new id. */
  onCreated?: (id: string) => void;
}

export function UOPCreateDialog({ open, onOpenChange, onCreated }: Props) {
  const [data, setData] = useState<PlanEditorData>(EMPTY_PLAN_DATA);
  const createMutation = useCreateUOP();

  // Reset form khi dialog mở.
  useEffect(() => {
    if (open) setData(EMPTY_PLAN_DATA);
  }, [open]);

  const handleSave = async (planData: PlanEditorData) => {
    try {
      const id = await createMutation.mutateAsync({
        plan_name: planData.name.trim(),
        program: planData.program,
        course_id: planData.course_id,
        cefr_level: planData.cefr_level,
        tags: planData.tags.length > 0 ? planData.tags : null,
        plan_type: "structured",
        total_sessions: planData.sessions,
        total_hours: planData.total_hours,
        session_duration: planData.session_duration_minutes,
        is_public: planData.is_public ?? false,
        // Other fields rely on DB defaults (status, progress, current_score, target_score, etc.)
      });
      toast.success(`Đã tạo UOP "${planData.name}"`);
      onOpenChange(false);
      onCreated?.(id);
    } catch (err: any) {
      toast.error(err?.message || "Lỗi tạo UOP", { duration: 6000 });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo Kế hoạch của bạn (UOP)</DialogTitle>
        </DialogHeader>
        <PlanEditor
          mode="uop"
          value={data}
          onChange={setData}
          onSave={handleSave}
          saving={createMutation.isPending}
          title=""
        />
      </DialogContent>
    </Dialog>
  );
}
