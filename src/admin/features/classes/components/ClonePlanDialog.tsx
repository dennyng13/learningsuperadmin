/**
 * ClonePlanDialog — F3.3 Path B "Sao chép kế hoạch học".
 *
 * Clones a study_plan into a TARGET class via Lovable RPC
 * `clone_study_plan_to_class(source_plan_id, target_class_id)`.
 *
 * Two-section flow:
 * 1. Source plan picker — auto-detects current plan attached to source class
 *    (via app_classes.study_plan_id direct OR study_plans.class_ids reverse).
 *    Detected plan auto-selected; user can swap to any candidate plan
 *    matching the same course or program. Removes the empty-state blocker
 *    when detection misses (F3 v2 schema variations).
 * 2. Target class picker — same-program filter on by default, search box,
 *    overwrite warning when target already has a plan.
 *
 * RPC contract (Lovable Q1-Q4 locked):
 * - Args sans p_ prefix: source_plan_id, target_class_id
 * - Returns: uuid (new plan id)
 * - Entries cloned with reset state — caller reschedules
 * - Authority: super_admin/admin broad; teacher only own_taught classes
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2, Search, AlertTriangle, BookOpen, Copy, ListFilter, Check,
  ChevronDown,
} from "lucide-react";
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
  /** Class program (drives plan candidate filter + target same-program toggle). */
  sourceProgram: string | null;
  /** Class course id (drives plan candidate prefer-same-course ranking). */
  sourceCourseId: string | null;
}

interface CandidatePlan {
  id: string;
  plan_name: string | null;
  program: string | null;
  course_id: string | null;
  cefr_level: string | null;
  total_sessions: number | null;
  total_hours: number | null;
  is_user_owned: boolean | null;
  updated_at: string | null;
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
  sourceProgram,
  sourceCourseId,
}: Props) {
  const navigate = useNavigate();
  const cloneMut = useCloneStudyPlanToClass();

  const [planSearch, setPlanSearch] = useState("");
  // Default OFF — plans hiếm khi gắn course_id chuẩn theo Căng buồm/etc; user
  // mong filter program-level (rộng hơn) thấy hết plans cùng program.
  const [sameCourseOnly, setSameCourseOnly] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  // UX: collapse plan picker khi plan đã auto-detect → chỉ cần pick target.
  const [planPickerExpanded, setPlanPickerExpanded] = useState(false);

  const [targetSearch, setTargetSearch] = useState("");
  const [sameProgramOnly, setSameProgramOnly] = useState(true);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  /* ─── Detect class's current plan (auto-select default) ─── */
  const currentPlanQ = useQuery({
    queryKey: ["clone-plan-current", sourceClassId],
    enabled: open && !!sourceClassId,
    queryFn: async (): Promise<string | null> => {
      // Path 1: app_classes.study_plan_id direct.
      const cls = await (supabase as any)
        .from("app_classes")
        .select("study_plan_id")
        .eq("id", sourceClassId)
        .maybeSingle();
      const directId = cls.data?.study_plan_id ?? null;
      if (directId) return directId as string;

      // Path 2: F3 v2 reverse — study_plans.class_ids @> [classId].
      const reverse = await (supabase as any)
        .from("study_plans")
        .select("id")
        .contains("class_ids", [sourceClassId])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return reverse.data?.id ?? null;
    },
  });

  /* ─── Candidate plans — same program, optionally same course ─── */
  const candidatesQ = useQuery({
    queryKey: ["clone-plan-candidates", sourceProgram, sourceCourseId, sameCourseOnly],
    enabled: open,
    queryFn: async (): Promise<CandidatePlan[]> => {
      let q = (supabase as any)
        .from("study_plans")
        .select(
          "id, plan_name, program, course_id, cefr_level, total_sessions, total_hours, is_user_owned, updated_at",
        )
        .order("updated_at", { ascending: false })
        .limit(200);
      if (sourceProgram) q = q.eq("program", sourceProgram);
      if (sameCourseOnly && sourceCourseId) q = q.eq("course_id", sourceCourseId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CandidatePlan[];
    },
  });

  /* ─── Auto-select detected plan when candidates load ─── */
  useEffect(() => {
    if (!currentPlanQ.data) return;
    if (selectedPlanId) return;
    setSelectedPlanId(currentPlanQ.data);
  }, [currentPlanQ.data, selectedPlanId]);

  /* Auto-expand picker khi không detect được plan hiện tại của lớp.
     Nếu detected → giữ collapsed (banner mode), user click "Đổi plan khác"
     để mở picker. */
  useEffect(() => {
    if (currentPlanQ.isLoading) return;
    if (!currentPlanQ.data) {
      setPlanPickerExpanded(true);
    }
  }, [currentPlanQ.isLoading, currentPlanQ.data]);

  /* ─── If detected plan not in candidate list (e.g., other course),
         fetch it once so we can render the row + auto-select. ─── */
  const detectedPlanInCandidates = useMemo(() => {
    if (!currentPlanQ.data) return true;
    return (candidatesQ.data ?? []).some((p) => p.id === currentPlanQ.data);
  }, [currentPlanQ.data, candidatesQ.data]);

  const detectedPlanQ = useQuery({
    queryKey: ["clone-plan-detected-row", currentPlanQ.data],
    enabled: open && !!currentPlanQ.data && !detectedPlanInCandidates,
    queryFn: async (): Promise<CandidatePlan | null> => {
      const { data, error } = await (supabase as any)
        .from("study_plans")
        .select(
          "id, plan_name, program, course_id, cefr_level, total_sessions, total_hours, is_user_owned, updated_at",
        )
        .eq("id", currentPlanQ.data!)
        .maybeSingle();
      if (error) throw error;
      return (data as CandidatePlan | null) ?? null;
    },
  });

  /* Combined plan list: detected plan first (if outside candidate filter),
     then filtered candidates. */
  const allPlans = useMemo<CandidatePlan[]>(() => {
    const out: CandidatePlan[] = [];
    if (detectedPlanQ.data && !detectedPlanInCandidates) out.push(detectedPlanQ.data);
    out.push(...(candidatesQ.data ?? []));
    return out;
  }, [detectedPlanQ.data, detectedPlanInCandidates, candidatesQ.data]);

  const filteredPlans = useMemo(() => {
    const term = planSearch.trim().toLowerCase();
    if (!term) return allPlans;
    return allPlans.filter((p) =>
      (p.plan_name ?? "").toLowerCase().includes(term) ||
      (p.cefr_level ?? "").toLowerCase().includes(term),
    );
  }, [allPlans, planSearch]);

  const selectedPlan = useMemo(
    () => allPlans.find((p) => p.id === selectedPlanId) ?? null,
    [allPlans, selectedPlanId],
  );

  /* ─── Selected plan entries count (post-clone reschedule hint) ─── */
  const entriesCountQ = useQuery({
    queryKey: ["clone-plan-entries-count", selectedPlanId],
    enabled: open && !!selectedPlanId,
    queryFn: async (): Promise<number> => {
      const { count, error } = await (supabase as any)
        .from("study_plan_entries")
        .select("*", { count: "exact", head: true })
        .eq("plan_id", selectedPlanId);
      if (error) throw error;
      return count ?? 0;
    },
  });

  /* ─── Candidate target classes ───
     Note: KHÔNG filter `.neq("lifecycle_status", "archived")` vì DB enum
     class_lifecycle_status hiện không có "archived" — Postgres reject làm
     query lỗi, target list rỗng → submit disabled. Frontend types.ts có
     "archived" nhưng DB chưa có, mismatch chờ Lovable lock enum. */
  const targetsQ = useQuery({
    queryKey: ["clone-plan-targets", sourceClassId, sameProgramOnly, sourceProgram],
    enabled: open,
    queryFn: async (): Promise<TargetClassRow[]> => {
      let q = (supabase as any)
        .from("classes" as any)
        .select("id, name, class_code, program, lifecycle_status, study_plan_id")
        .neq("id", sourceClassId)
        .order("name", { ascending: true })
        .limit(200);
      if (sameProgramOnly && sourceProgram) q = q.eq("program", sourceProgram);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as TargetClassRow[];
    },
  });

  const filteredTargets = useMemo(() => {
    const term = targetSearch.trim().toLowerCase();
    if (!term) return targetsQ.data ?? [];
    return (targetsQ.data ?? []).filter((c) =>
      (c.name ?? "").toLowerCase().includes(term) ||
      (c.class_code ?? "").toLowerCase().includes(term),
    );
  }, [targetsQ.data, targetSearch]);

  const selectedTarget = useMemo(
    () => filteredTargets.find((c) => c.id === selectedTargetId) ?? null,
    [filteredTargets, selectedTargetId],
  );

  const handleSubmit = async () => {
    if (!selectedPlanId) {
      toast.error("Vui lòng chọn kế hoạch nguồn.");
      return;
    }
    if (!selectedTargetId) {
      toast.error("Vui lòng chọn lớp đích.");
      return;
    }
    try {
      await cloneMut.mutateAsync({
        sourcePlanId: selectedPlanId,
        targetClassId: selectedTargetId,
      });
      const n = entriesCountQ.data ?? 0;
      toast.success(
        `Đã sao chép kế hoạch học. ${n} buổi học cần được sắp lịch lại.`,
        { duration: 7000 },
      );
      onOpenChange(false);
      navigate(`/classes/${selectedTargetId}`);
    } catch (err: any) {
      toast.error(mapClonePlanError(err?.message ?? ""), { duration: 7000 });
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setPlanSearch("");
      setTargetSearch("");
      setSelectedPlanId(null);
      setSelectedTargetId(null);
      setSameProgramOnly(true);
      setSameCourseOnly(true);
    }
    onOpenChange(next);
  };

  const isDetected = (planId: string) => currentPlanQ.data === planId;

  return (
    <DialogPop open={open} onOpenChange={handleOpenChange}>
      <DialogPopContent size="lg" className="max-h-[90vh] overflow-y-auto">
        <DialogPopHeader>
          <DialogPopTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-lp-coral" />
            Sao chép kế hoạch học
          </DialogPopTitle>
          <DialogPopDescription>
            Chọn kế hoạch nguồn (mặc định plan hiện tại của lớp này) → chọn lớp đích →
            buổi học sẽ được copy, <strong>reset lịch</strong> để sắp xếp lại sau.
          </DialogPopDescription>
        </DialogPopHeader>

        {/* ═══ Section 1: Source plan picker ═══
            UX: nếu plan đã auto-detect (currentPlanQ.data), hiển thị banner
            "Plan hiện tại + tóm tắt" + nút "Đổi plan khác" để mở picker.
            Nếu không detect được, picker mở sẵn để user pick. */}
        {!planPickerExpanded && selectedPlan ? (
          <div className="rounded-lg border-[1.5px] border-lp-teal/40 bg-lp-teal/5 p-3 flex items-start gap-3">
            <BookOpen className="h-4 w-4 text-lp-teal shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 space-y-0.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Kế hoạch nguồn (plan hiện tại của lớp)
              </p>
              <p className="font-display text-sm font-bold truncate">
                {selectedPlan.plan_name?.trim() || (
                  <span className="italic text-muted-foreground">(chưa đặt tên)</span>
                )}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {selectedPlan.cefr_level && <span>{selectedPlan.cefr_level} · </span>}
                {selectedPlan.total_sessions != null && <span>{selectedPlan.total_sessions} buổi · </span>}
                {entriesCountQ.data !== undefined
                  ? `${entriesCountQ.data} entries sẽ sao chép`
                  : "đang đếm..."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPlanPickerExpanded(true)}
              className="shrink-0 text-[11px] font-semibold text-lp-coral hover:underline inline-flex items-center gap-0.5"
            >
              Đổi plan khác <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs font-semibold inline-flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" /> Chọn kế hoạch nguồn
            </Label>
            {sourceCourseId && (
              <div className="flex items-center gap-1.5">
                <Switch
                  id="same-course"
                  checked={sameCourseOnly}
                  onCheckedChange={setSameCourseOnly}
                />
                <Label htmlFor="same-course" className="text-[11px] text-muted-foreground cursor-pointer">
                  Cùng course
                </Label>
              </div>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên kế hoạch hoặc CEFR..."
              value={planSearch}
              onChange={(e) => setPlanSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <div className="border-[1.5px] border-lp-ink/15 rounded-pop max-h-56 overflow-y-auto">
            {currentPlanQ.isLoading || candidatesQ.isLoading ? (
              <div className="p-2 space-y-2">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : candidatesQ.error ? (
              <div className="p-4 text-xs text-destructive">
                Lỗi tải danh sách kế hoạch: {(candidatesQ.error as Error).message}
              </div>
            ) : filteredPlans.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground space-y-2">
                <ListFilter className="h-6 w-6 mx-auto text-muted-foreground/60" />
                <p>
                  Không có kế hoạch khớp với{" "}
                  {sourceCourseId && sameCourseOnly ? "course này" : sourceProgram ? `program ${sourceProgram}` : "bộ lọc"}.
                </p>
                {sameCourseOnly && (
                  <button
                    type="button"
                    onClick={() => setSameCourseOnly(false)}
                    className="text-lp-coral underline hover:no-underline"
                  >
                    Mở rộng sang toàn program
                  </button>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-lp-ink/10">
                {filteredPlans.map((p) => {
                  const isSelected = p.id === selectedPlanId;
                  const detected = isDetected(p.id);
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedPlanId(p.id)}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2",
                          isSelected
                            ? "bg-lp-teal/10 border-l-[3px] border-lp-teal"
                            : "hover:bg-muted/40 border-l-[3px] border-transparent",
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate inline-flex items-center gap-1.5">
                            {isSelected && <Check className="h-3.5 w-3.5 text-lp-teal shrink-0" />}
                            {p.plan_name?.trim() || <span className="italic text-muted-foreground">(chưa đặt tên)</span>}
                            {detected && (
                              <Badge variant="outline" className="text-[9px] border-lp-teal/40 text-lp-teal shrink-0">
                                Plan hiện tại
                              </Badge>
                            )}
                            {p.is_user_owned && (
                              <Badge variant="outline" className="text-[9px] shrink-0">UOP</Badge>
                            )}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {p.cefr_level && <span>{p.cefr_level} · </span>}
                            {p.total_sessions != null && <span>{p.total_sessions} buổi · </span>}
                            {p.total_hours != null && <span>{p.total_hours}h</span>}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {selectedPlan && (
            <div className="flex items-center justify-between text-[10px] text-muted-foreground pl-1">
              <span>
                {entriesCountQ.data !== undefined
                  ? `${entriesCountQ.data} buổi học sẽ được sao chép (reset lịch).`
                  : "Đang đếm số buổi học..."}
              </span>
              {currentPlanQ.data && (
                <button
                  type="button"
                  onClick={() => {
                    setPlanPickerExpanded(false);
                    setSelectedPlanId(currentPlanQ.data!);
                  }}
                  className="text-lp-teal hover:underline font-semibold"
                >
                  Quay về plan hiện tại
                </button>
              )}
            </div>
          )}
        </div>
        )}

        {/* ═══ Section 2: Target class picker ═══ */}
        <div className="space-y-2 pt-2 border-t-[1.5px] border-lp-ink/15">
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
              value={targetSearch}
              onChange={(e) => setTargetSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <div className="border-[1.5px] border-lp-ink/15 rounded-pop max-h-56 overflow-y-auto">
            {targetsQ.isLoading ? (
              <div className="p-2 space-y-2">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : targetsQ.error ? (
              <div className="p-4 text-xs text-destructive">
                Lỗi tải danh sách lớp: {(targetsQ.error as Error).message}
              </div>
            ) : filteredTargets.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                {targetSearch ? "Không tìm thấy lớp khớp." : "Không có lớp đích phù hợp."}
              </div>
            ) : (
              <ul className="divide-y divide-lp-ink/10">
                {filteredTargets.map((c) => {
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
                          <p className="font-medium truncate inline-flex items-center gap-1.5">
                            {isSelected && <Check className="h-3.5 w-3.5 text-lp-coral shrink-0" />}
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
            disabled={!selectedPlanId || !selectedTargetId || cloneMut.isPending}
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
