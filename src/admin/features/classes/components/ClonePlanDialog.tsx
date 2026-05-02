/**
 * ClonePlanDialog — F3.3 Path B "Sao chép kế hoạch học".
 *
 * Clones a class's existing study_plan into a TARGET class via Lovable RPC
 * `clone_study_plan_to_class(source_plan_id, target_class_id)`.
 *
 * RPC contract (locked per Lovable Q1-Q4):
 * - Args sans p_ prefix: source_plan_id, target_class_id
 * - Returns: uuid (new plan id)
 * - Entries cloned với reset state (entry_date/completed_at/plan_status reset)
 * - Authority: super_admin/admin broad; teacher only own_taught classes
 *
 * UX flow (single-screen):
 * 1. Show source plan summary (read-only)
 * 2. Pick target class — filtered same program by default (per F3 v2 OQ4=A);
 *    user can broaden via toggle
 * 3. Confirm → invoke RPC → toast + redirect to target class detail
 *
 * Reset-state hint: pre-fetch source plan entries count để show post-clone
 * "[N] buổi học cần được sắp lịch lại" message per Lovable spec.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Search, AlertTriangle, BookOpen, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  DialogPop, DialogPopContent, DialogPopHeader, DialogPopTitle, DialogPopDescription,
  DialogPopFooter,
} from "@shared/components/ui/dialog-pop";
import { PopButton } from "@shared/components/ui/pop-button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Switch } from "@shared/components/ui/switch";
import { Skeleton } from "@shared/components/ui/skeleton";
import { Badge } from "@shared/components/ui/badge";
import { cn } from "@shared/lib/utils";
import {
  useCloneStudyPlanToClass, mapClonePlanError,
} from "@admin/features/classes/hooks/useCloneStudyPlanToClass";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceClassId: string;
  sourcePlanId: string;
  sourcePlanName: string | null;
  sourceProgram: string | null;
}

interface TargetClassRow {
  id: string;
  name: string | null;
  class_code: string | null;
  program: string | null;
  lifecycle_status: string | null;
  study_plan_id: string | null;
}

export function ClonePlanDialog({
  open,
  onOpenChange,
  sourceClassId,
  sourcePlanId,
  sourcePlanName,
  sourceProgram,
}: Props) {
  const navigate = useNavigate();
  const cloneMut = useCloneStudyPlanToClass();

  const [search, setSearch] = useState("");
  const [sameProgramOnly, setSameProgramOnly] = useState(true);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  /* ─── Source plan entries count (cho post-clone reschedule hint) ─── */
  const sourceEntriesCountQ = useQuery({
    queryKey: ["clone-plan-source-count", sourcePlanId],
    enabled: open && !!sourcePlanId,
    queryFn: async (): Promise<number> => {
      const { count, error } = await (supabase as any)
        .from("study_plan_entries")
        .select("*", { count: "exact", head: true })
        .eq("plan_id", sourcePlanId);
      if (error) throw error;
      return count ?? 0;
    },
  });

  /* ─── Candidate target classes ─── */
  const targetsQ = useQuery({
    queryKey: ["clone-plan-targets", sourceClassId, sameProgramOnly, sourceProgram],
    enabled: open,
    queryFn: async (): Promise<TargetClassRow[]> => {
      let q = (supabase as any)
        .from("classes" as any)
        .select("id, name, class_code, program, lifecycle_status, study_plan_id")
        .neq("id", sourceClassId)
        .neq("lifecycle_status", "archived")
        .order("name", { ascending: true })
        .limit(200);
      if (sameProgramOnly && sourceProgram) {
        q = q.eq("program", sourceProgram);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as TargetClassRow[];
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return targetsQ.data ?? [];
    return (targetsQ.data ?? []).filter((c) => {
      return (
        (c.name ?? "").toLowerCase().includes(term) ||
        (c.class_code ?? "").toLowerCase().includes(term)
      );
    });
  }, [targetsQ.data, search]);

  const selectedTarget = useMemo(
    () => filtered.find((c) => c.id === selectedTargetId) ?? null,
    [filtered, selectedTargetId],
  );

  const handleSubmit = async () => {
    if (!selectedTargetId) {
      toast.error("Vui lòng chọn lớp đích.");
      return;
    }
    try {
      await cloneMut.mutateAsync({
        sourcePlanId,
        targetClassId: selectedTargetId,
      });
      const n = sourceEntriesCountQ.data ?? 0;
      toast.success(
        `Đã sao chép kế hoạch học. ${n} buổi học cần được sắp lịch lại.`,
        { duration: 7000 },
      );
      onOpenChange(false);
      navigate(`/classes/${selectedTargetId}`);
    } catch (err: any) {
      const friendly = mapClonePlanError(err?.message ?? "");
      toast.error(friendly, { duration: 7000 });
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSearch("");
      setSelectedTargetId(null);
      setSameProgramOnly(true);
    }
    onOpenChange(next);
  };

  return (
    <DialogPop open={open} onOpenChange={handleOpenChange}>
      <DialogPopContent size="lg" className="max-h-[90vh] overflow-y-auto">
        <DialogPopHeader>
          <DialogPopTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-lp-coral" />
            Sao chép kế hoạch học
          </DialogPopTitle>
          <DialogPopDescription>
            Tạo bản sao của kế hoạch hiện tại và gắn vào lớp đích. Buổi học sẽ được copy
            nhưng <strong>reset lịch</strong> — bạn cần sắp xếp lại sau.
          </DialogPopDescription>
        </DialogPopHeader>

        {/* Source plan summary */}
        <div className="rounded-lg border-[1.5px] border-lp-ink/20 bg-lp-yellow/10 p-3 space-y-1">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1.5">
            <BookOpen className="h-3 w-3" /> Kế hoạch nguồn
          </p>
          <p className="font-display text-sm font-bold truncate">
            {sourcePlanName?.trim() || <span className="italic text-muted-foreground">(chưa đặt tên)</span>}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {sourceProgram && (
              <Badge variant="outline" className="text-[10px]">{sourceProgram}</Badge>
            )}
            {sourceEntriesCountQ.data !== undefined && (
              <span className="text-[10px] text-muted-foreground">
                {sourceEntriesCountQ.data} buổi học sẽ được sao chép
              </span>
            )}
          </div>
        </div>

        {/* Target search + same-program toggle */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs font-semibold">Chọn lớp đích</Label>
            {sourceProgram && (
              <div className="flex items-center gap-1.5">
                <Switch
                  id="same-program"
                  checked={sameProgramOnly}
                  onCheckedChange={setSameProgramOnly}
                />
                <Label htmlFor="same-program" className="text-[11px] text-muted-foreground cursor-pointer">
                  Cùng program ({sourceProgram})
                </Label>
              </div>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên hoặc mã lớp..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>

          {/* Target list */}
          <div className="border-[1.5px] border-lp-ink/15 rounded-pop max-h-64 overflow-y-auto">
            {targetsQ.isLoading ? (
              <div className="p-2 space-y-2">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : targetsQ.error ? (
              <div className="p-4 text-xs text-destructive">
                Lỗi tải danh sách lớp: {(targetsQ.error as Error).message}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                {search ? "Không tìm thấy lớp khớp." : "Không có lớp đích phù hợp."}
              </div>
            ) : (
              <ul className="divide-y divide-lp-ink/10">
                {filtered.map((c) => {
                  const isSelected = c.id === selectedTargetId;
                  const hasPlan = !!c.study_plan_id;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedTargetId(c.id)}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2",
                          isSelected
                            ? "bg-lp-coral/10 border-l-[3px] border-lp-coral"
                            : "hover:bg-muted/40 border-l-[3px] border-transparent",
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {c.name ?? c.class_code ?? "(không tên)"}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {c.class_code && <span>{c.class_code} · </span>}
                            {c.program ?? "—"}
                          </p>
                        </div>
                        {hasPlan && (
                          <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-700 dark:text-amber-400 shrink-0">
                            Đã có plan
                          </Badge>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Warn when overwriting */}
        {selectedTarget?.study_plan_id && (
          <div className="rounded-lg border-[1.5px] border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 p-2.5 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-900 dark:text-amber-200 leading-snug">
              Lớp đích đã có kế hoạch học. Sao chép sẽ <strong>thay thế</strong> kế hoạch hiện tại.
              Hành động này được backend xử lý nguyên tử (atomic).
            </p>
          </div>
        )}

        <DialogPopFooter>
          <PopButton
            type="button"
            tone="white"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={cloneMut.isPending}
          >
            Hủy
          </PopButton>
          <PopButton
            type="button"
            tone="coral"
            size="sm"
            onClick={handleSubmit}
            disabled={!selectedTargetId || cloneMut.isPending}
          >
            {cloneMut.isPending ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang sao chép...
              </span>
            ) : (
              "Sao chép kế hoạch"
            )}
          </PopButton>
        </DialogPopFooter>
      </DialogPopContent>
    </DialogPop>
  );
}
