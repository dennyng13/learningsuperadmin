import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Banknote, CheckCircle2, Wallet, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import WidgetRefreshButton from "./WidgetRefreshButton";

// Lightweight widgets for payroll lifecycle counts (Stage 3).
// Uses payroll_payslip_list RPC; counts computed client-side via array length.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (name: string, args?: Record<string, unknown>) => supabase.rpc(name as any, args as any);

interface PayrollCounts {
  draft: number;
  awaitingPayment: number;
  paidThisMonth: number;
}

function currentMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function PayrollStatusWidget() {
  const navigate = useNavigate();
  const { data: state, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["dashboard-payroll-status"],
    queryFn: async (): Promise<PayrollCounts> => {
      const [draftRes, confirmedRes, ackRes, paidRes] = await Promise.all([
        rpc("payroll_payslip_list", { p_teacher_id: null, p_month_start: null, p_status: "draft", p_batch_id: null }),
        rpc("payroll_payslip_list", { p_teacher_id: null, p_month_start: null, p_status: "confirmed", p_batch_id: null }),
        rpc("payroll_payslip_list", { p_teacher_id: null, p_month_start: null, p_status: "teacher_acknowledged", p_batch_id: null }),
        rpc("payroll_payslip_list", { p_teacher_id: null, p_month_start: currentMonthStart(), p_status: "paid", p_batch_id: null }),
      ]);
      const firstErr = draftRes.error || confirmedRes.error || ackRes.error || paidRes.error;
      if (firstErr) throw firstErr;
      return {
        draft: ((draftRes.data ?? []) as unknown[]).length,
        awaitingPayment:
          ((confirmedRes.data ?? []) as unknown[]).length +
          ((ackRes.data ?? []) as unknown[]).length,
        paidThisMonth: ((paidRes.data ?? []) as unknown[]).length,
      };
    },
    staleTime: 60_000,
  });

  const cards = useMemo(() => [
    {
      key: "payroll-draft", icon: Banknote, label: "Payslip bản nháp",
      hint: "Cần kiểm tra & chốt", value: state?.draft ?? 0, tone: "slate",
      onClick: () => navigate("/payroll"),
    },
    {
      key: "payroll-awaiting-payment", icon: CheckCircle2,
      label: "Đã chốt, chờ thanh toán",
      hint: "Bao gồm cả GV đã xác nhận", value: state?.awaitingPayment ?? 0, tone: "amber",
      onClick: () => navigate("/payroll"),
    },
    {
      key: "payroll-paid-this-month", icon: Wallet, label: "Đã thanh toán tháng này",
      hint: "Trong tháng hiện tại", value: state?.paidThisMonth ?? 0, tone: "emerald",
      onClick: () => navigate("/payroll"),
    },
  ] as const, [state, navigate]);

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-4 flex items-center text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Đang tải số liệu bảng lương…
      </div>
    );
  }
  if (error) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-display font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Bảng lương
        </h3>
        <WidgetRefreshButton
          onClick={() => refetch()}
          refreshing={isFetching}
          title="Tải lại số liệu bảng lương"
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
                tone === "slate"
                  ? "bg-slate-500/10 text-slate-600"
                  : tone === "amber"
                    ? "bg-amber-500/10 text-amber-600"
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
