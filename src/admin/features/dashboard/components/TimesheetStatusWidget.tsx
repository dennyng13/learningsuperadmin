import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, CheckCircle2, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import WidgetRefreshButton from "./WidgetRefreshButton";

// Lightweight widgets for timesheet period lifecycle counts (Stage 2).
// Uses timesheet_period_list RPC; counts computed client-side via array length.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (name: string, args?: Record<string, unknown>) => supabase.rpc(name as any, args as any);

interface TimesheetCounts {
  pendingApproval: number;
  approvedReadyToLock: number;
  lockedThisMonth: number;
}

function currentMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function TimesheetStatusWidget() {
  const navigate = useNavigate();
  const { data: state, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["dashboard-timesheet-status"],
    queryFn: async (): Promise<TimesheetCounts> => {
      const [allPeriods, lockedThisMonthRes] = await Promise.all([
        rpc("timesheet_period_list", { p_teacher_id: null, p_month_start: null, p_status: null }),
        rpc("timesheet_period_list", {
          p_teacher_id: null,
          p_month_start: currentMonthStart(),
          p_status: "locked",
        }),
      ]);
      const firstErr = allPeriods.error || lockedThisMonthRes.error;
      if (firstErr) throw firstErr;
      const periods = (allPeriods.data ?? []) as Array<{ status: string }>;
      return {
        pendingApproval: periods.filter((p) => p.status === "submitted").length,
        approvedReadyToLock: periods.filter((p) => p.status === "approved").length,
        lockedThisMonth: ((lockedThisMonthRes.data ?? []) as unknown[]).length,
      };
    },
    staleTime: 60_000,
  });

  const cards = useMemo(() => [
    {
      key: "timesheet-pending",
      icon: CalendarClock,
      label: "Bảng công chờ duyệt",
      hint: "Giáo viên đã gửi tháng",
      value: state?.pendingApproval ?? 0,
      tone: "amber",
      onClick: () => navigate("/timesheet?status=submitted"),
    },
    {
      key: "timesheet-ready-lock",
      icon: CheckCircle2,
      label: "Đã duyệt, chờ khoá",
      hint: "Sẵn sàng chuyển sang Payroll",
      value: state?.approvedReadyToLock ?? 0,
      tone: "blue",
      onClick: () => navigate("/timesheet?status=approved"),
    },
    {
      key: "timesheet-locked",
      icon: Lock,
      label: "Đã khoá tháng này",
      hint: "Kỳ chốt cho lương",
      value: state?.lockedThisMonth ?? 0,
      tone: "emerald",
      onClick: () => navigate("/timesheet?status=locked"),
    },
  ] as const, [state, navigate]);

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-4 flex items-center text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Đang tải số liệu bảng công…
      </div>
    );
  }
  if (error) {
    return null;
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-display font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Bảng công
        </h3>
        <WidgetRefreshButton
          onClick={() => refetch()}
          refreshing={isFetching}
          title="Tải lại số liệu bảng công"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {cards.map(({ key, icon: Icon, label, hint, value, tone, onClick }) => (
        <button
          key={key}
          onClick={onClick}
          className="text-left rounded-xl border bg-card p-4 hover:bg-muted/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                tone === "amber"
                  ? "bg-amber-500/10 text-amber-600"
                  : tone === "blue"
                    ? "bg-blue-500/10 text-blue-600"
                    : "bg-emerald-500/10 text-emerald-600"
              }`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">{label}</p>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-extrabold">{value}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{hint}</p>
            </div>
          </div>
        </button>
      ))}
      </div>
    </section>
  );
}
