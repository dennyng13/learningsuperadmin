import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen, ClipboardList, ExternalLink, AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Skeleton } from "@shared/components/ui/skeleton";
import { cn } from "@shared/lib/utils";

/* /classes/:id Tab "Tiến độ" — read-only Study Plan instance display.
   Replace placeholder BackendPendingTab. Scope: Bug #5 fix.

   Edge: nếu app_classes.study_plan_id trỏ template UUID (Bug #2 backend bug
   chưa fix), planQ trả null → render hint state để admin biết debug. */

interface Props {
  classId: string;
  studyPlanId: string | null;
}

interface StudyPlanRow {
  id: string;
  plan_name: string | null;
  total_sessions: number | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
}

interface PlanEntryRow {
  id: string;
  plan_id: string;
  session_number: number | null;
  session_title: string | null;
  session_type: string | null;
  entry_date: string;
  plan_status: string | null;
  completed_at: string | null;
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  done:    { label: "Hoàn thành", cls: "border-emerald-500/30 text-emerald-700 dark:text-emerald-400" },
  delayed: { label: "Trễ",         cls: "border-amber-500/30 text-amber-700 dark:text-amber-400" },
  skipped: { label: "Bỏ qua",      cls: "border-muted-foreground/30 text-muted-foreground" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("vi-VN");
}

export function PlanProgressTab({ classId, studyPlanId }: Props) {
  if (!studyPlanId) {
    return (
      <div className="rounded-2xl border border-dashed bg-muted/20 p-10 text-center space-y-3">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <ClipboardList className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="font-display text-base font-semibold">Lớp chưa gắn Study Plan</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Vào tab Cấu hình để gán study plan, hoặc quản lý plan ở trang riêng.
        </p>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link to="/study-plans">
            <ExternalLink className="h-3.5 w-3.5" /> Quản lý Study Plans
          </Link>
        </Button>
      </div>
    );
  }

  const planQ = useQuery({
    queryKey: ["plan-progress-plan", studyPlanId],
    queryFn: async (): Promise<StudyPlanRow | null> => {
      const { data, error } = await (supabase as any)
        .from("study_plans")
        .select("id, plan_name, total_sessions, status, start_date, end_date")
        .eq("id", studyPlanId)
        .maybeSingle();
      if (error) throw error;
      return (data as StudyPlanRow | null) ?? null;
    },
    enabled: !!studyPlanId,
  });

  const entriesQ = useQuery({
    queryKey: ["plan-progress-entries", studyPlanId],
    queryFn: async (): Promise<PlanEntryRow[]> => {
      const { data, error } = await (supabase as any)
        .from("study_plan_entries")
        .select("id, plan_id, session_number, session_title, session_type, entry_date, plan_status, completed_at")
        .eq("plan_id", studyPlanId)
        .order("session_number", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PlanEntryRow[];
    },
    enabled: !!studyPlanId,
  });

  const sessionsCountQ = useQuery({
    queryKey: ["plan-progress-sessions-count", classId],
    queryFn: async (): Promise<number> => {
      const { count, error } = await (supabase as any)
        .from("class_sessions")
        .select("*", { count: "exact", head: true })
        .eq("class_id", classId);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const progressInfo = useMemo(() => {
    const total = planQ.data?.total_sessions ?? 0;
    const actual = sessionsCountQ.data ?? 0;
    const pct = total > 0 ? Math.min(100, Math.round((actual / total) * 100)) : 0;
    return { total, actual, pct };
  }, [planQ.data, sessionsCountQ.data]);

  if (planQ.isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
      </div>
    );
  }

  if (planQ.error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Lỗi tải Study Plan: {(planQ.error as Error).message}
      </div>
    );
  }

  if (!planQ.data) {
    // study_plan_id set but no row found — likely points to template id (Bug #2)
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <h3 className="font-display text-base font-semibold text-amber-900 dark:text-amber-300">
              Plan instance không tìm thấy
            </h3>
            <p className="text-sm text-muted-foreground">
              Lớp có <code className="font-mono text-xs">study_plan_id</code> nhưng plan instance không tồn tại
              trong DB. Nguyên nhân khả dĩ: backend RPC <code className="font-mono text-xs">create_class_with_template_atomic</code>
              chưa clone template thành plan instance khi tạo lớp.
            </p>
            <p className="text-xs text-muted-foreground">
              ID hiện tại: <code className="font-mono">{studyPlanId.slice(0, 8)}…</code>
            </p>
            <Button asChild variant="outline" size="sm" className="gap-1.5 mt-2">
              <Link to="/study-plans">
                <ExternalLink className="h-3.5 w-3.5" /> Mở /study-plans để debug
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const plan = planQ.data;
  const entries = entriesQ.data ?? [];

  return (
    <div className="space-y-4">
      {/* Header card — plan info + progress */}
      <div className="rounded-2xl border bg-card p-5 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" /> Study Plan
            </p>
            <h3 className="font-display text-lg font-bold truncate">
              {plan.plan_name ?? "(Plan không tên)"}
            </h3>
          </div>
          {plan.status && (
            <Badge variant="outline" className="text-[10px]">{plan.status}</Badge>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Tiến độ buổi học</span>
            <span className="font-medium tabular-nums">
              <strong className="text-foreground">{progressInfo.actual}</strong>
              <span className="text-muted-foreground"> / {progressInfo.total} buổi · </span>
              <strong className="text-primary">{progressInfo.pct}%</strong>
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full transition-all rounded-full",
                progressInfo.pct >= 100 ? "bg-emerald-500" : "bg-primary",
              )}
              style={{ width: `${progressInfo.pct}%` }}
            />
          </div>
          {(plan.start_date || plan.end_date) && (
            <p className="text-[11px] text-muted-foreground">
              {formatDate(plan.start_date)} → {formatDate(plan.end_date)}
            </p>
          )}
        </div>
      </div>

      {/* Entries list */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="p-3 border-b bg-muted/20">
          <h4 className="text-sm font-semibold">
            Buổi học theo plan
            <span className="text-muted-foreground font-normal ml-1">({entries.length})</span>
          </h4>
        </div>
        {entriesQ.isLoading ? (
          <div className="p-3 space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : entries.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Plan chưa có buổi học nào.
          </p>
        ) : (
          <ul className="divide-y">
            {entries.map((e) => {
              const meta = e.plan_status ? STATUS_META[e.plan_status] : null;
              return (
                <li key={e.id} className="flex items-center gap-3 p-3 text-sm hover:bg-muted/30 transition-colors">
                  <span className="shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {e.session_number ?? "?"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      {e.session_title ?? "(Buổi không tên)"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {formatDate(e.entry_date)}
                      {e.session_type && <span> · {e.session_type}</span>}
                    </p>
                  </div>
                  {meta && (
                    <Badge variant="outline" className={cn("text-[10px] shrink-0", meta.cls)}>
                      {meta.label}
                    </Badge>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer link */}
      <div className="text-right">
        <Button asChild variant="link" size="sm" className="gap-1">
          <Link to="/study-plans">
            Quản lý chi tiết Study Plan <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
