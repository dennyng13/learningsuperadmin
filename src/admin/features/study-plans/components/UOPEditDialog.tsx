/**
 * UOPEditDialog — F3.5 edit existing UOP (Tier 3 User-Owned Plan).
 *
 * Mirrors UOPCreateDialog but loads existing UOP data + UPDATE on save.
 * Owner-only via RLS policy "UOPs owner full access".
 *
 * Used từ MyPlansPage "Plans của tôi" tab — Edit button per row.
 *
 * Field mapping (study_plans Row → PlanEditorData → study_plans Update):
 * - plan_name ↔ data.name
 * - total_sessions ↔ data.sessions
 * - total_hours ↔ data.total_hours
 * - session_duration ↔ data.session_duration_minutes
 * - cefr_level ↔ data.cefr_level
 * - tags ↔ data.tags
 * - is_public ↔ data.is_public
 * - program ↔ data.program
 * - course_id ↔ data.course_id
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@shared/components/ui/dialog";
import { PlanEditor, EMPTY_PLAN_DATA, type PlanEditorData } from "./PlanEditor";
import { useUpdateUOP, type UOPListRow } from "../hooks/useUOPMutations";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uopId: string | null;
  /** Optional preview data to seed editor before full fetch. */
  preview?: UOPListRow | null;
  onUpdated?: (id: string) => void;
}

export function UOPEditDialog({ open, onOpenChange, uopId, preview, onUpdated }: Props) {
  const [data, setData] = useState<PlanEditorData>(EMPTY_PLAN_DATA);
  const updateMutation = useUpdateUOP();

  // Fetch full UOP record when dialog opens
  const fetchQ = useQuery({
    queryKey: ["uop-edit", uopId],
    enabled: open && !!uopId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_plans")
        .select("*")
        .eq("id", uopId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Hydrate editor state when fetch completes
  useEffect(() => {
    if (!open) return;
    if (fetchQ.data) {
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
        is_public: row.is_public ?? false,
        created_by_user_id: row.created_by_user_id ?? null,
        parent_uop_id: row.parent_uop_id ?? null,
      });
    } else if (preview) {
      // Seed với preview while fetch in flight
      setData({
        ...EMPTY_PLAN_DATA,
        name: preview.plan_name ?? "",
        program: preview.program ?? null,
        course_id: preview.course_id ?? null,
        cefr_level: preview.cefr_level ?? null,
        tags: Array.isArray(preview.tags) ? preview.tags : [],
        sessions: preview.total_sessions ?? 0,
        total_hours: preview.total_hours ?? 0,
        session_duration_minutes: preview.session_duration ?? 60,
        is_public: preview.is_public ?? false,
      });
    }
  }, [open, fetchQ.data, preview]);

  const handleSave = async (planData: PlanEditorData) => {
    if (!uopId) return;
    try {
      await updateMutation.mutateAsync({
        id: uopId,
        patch: {
          plan_name: planData.name.trim(),
          program: planData.program,
          course_id: planData.course_id,
          cefr_level: planData.cefr_level,
          tags: planData.tags.length > 0 ? planData.tags : null,
          total_sessions: planData.sessions,
          total_hours: planData.total_hours,
          session_duration: planData.session_duration_minutes,
          is_public: planData.is_public ?? false,
          teacher_notes: planData.description ?? "",
        },
      });
      toast.success(`Đã cập nhật UOP "${planData.name}"`);
      onOpenChange(false);
      onUpdated?.(uopId);
    } catch (err: any) {
      toast.error(err?.message || "Lỗi cập nhật UOP", { duration: 6000 });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sửa Kế hoạch (UOP)</DialogTitle>
        </DialogHeader>
        {fetchQ.isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Đang tải UOP...
          </div>
        ) : fetchQ.error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Lỗi tải UOP: {(fetchQ.error as Error).message}
          </div>
        ) : (
          <PlanEditor
            mode="uop"
            value={data}
            onChange={setData}
            onSave={handleSave}
            saving={updateMutation.isPending}
            title=""
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
