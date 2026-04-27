// Stage P3 admin — TeacherDetailPage "Lương" tab.
// Replaces the mock TeacherIncomeTab with real data from
// public.payroll_payslips. Same KPI cards (YTD gross/tax/net + monthly
// chart) but driven by the actual rows.

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FileText, Loader2, Receipt, TrendingUp } from "lucide-react";

interface Payslip {
  id: string;
  teacher_id: string;
  month_start: string;
  status: "draft" | "confirmed" | "teacher_acknowledged" | "paid";
  gross_amount_vnd: number;
  net_amount_vnd: number;
  adjustments_total_vnd: number;
  paid_at: string | null;
  confirmed_at: string | null;
  acknowledged_at: string | null;
}

interface Props { teacherId: string }

const VND_FMT = new Intl.NumberFormat("vi-VN", {
  style: "currency", currency: "VND", maximumFractionDigits: 0,
});
const fmtVND = (n: number) => VND_FMT.format(n);

const STATUS_LABEL: Record<Payslip["status"], string> = {
  draft: "Nháp",
  confirmed: "Đã chốt",
  teacher_acknowledged: "GV xác nhận",
  paid: "Đã thanh toán",
};

const STATUS_TONE: Record<Payslip["status"], string> = {
  draft: "bg-muted text-muted-foreground",
  confirmed: "bg-info/10 text-info",
  teacher_acknowledged: "bg-secondary text-secondary-foreground",
  paid: "bg-primary/10 text-primary",
};

export default function TabIncome({ teacherId }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["teacher-payslips", teacherId],
    queryFn: async (): Promise<Payslip[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from as any)("payroll_payslips")
        .select("id, teacher_id, month_start, status, gross_amount_vnd, net_amount_vnd, adjustments_total_vnd, paid_at, confirmed_at, acknowledged_at")
        .eq("teacher_id", teacherId)
        .order("month_start", { ascending: false })
        .limit(24);
      if (error) throw error;
      return (data as Payslip[]) ?? [];
    },
  });

  const stats = useMemo(() => {
    const rows = (data ?? []).filter((p) =>
      ["confirmed", "teacher_acknowledged", "paid"].includes(p.status),
    );
    const ytdGross = rows.reduce((s, p) => s + Number(p.gross_amount_vnd ?? 0), 0);
    const ytdNet = rows.reduce((s, p) => s + Number(p.net_amount_vnd ?? 0), 0);
    const ytdAdj = rows.reduce((s, p) => s + Number(p.adjustments_total_vnd ?? 0), 0);
    const last6 = rows
      .slice(0, 6)
      .reverse()
      .map((p) => ({
        month: p.month_start.slice(0, 7),
        amount: Number(p.gross_amount_vnd ?? 0),
      }));
    return { ytdGross, ytdNet, ytdAdj, last6 };
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
      </div>
    );
  }
  if (error) return <p className="text-sm text-destructive">Lỗi: {(error as Error).message}</p>;

  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground p-4 rounded-xl border bg-card">
        Chưa có bảng lương nào cho giáo viên này.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <KpiCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Tổng gross (đã chốt)"
          value={fmtVND(stats.ytdGross)}
          hint="Tính trên các bảng lương status confirmed/acknowledged/paid"
          gradient
        />
        <KpiCard
          icon={<Receipt className="h-5 w-5" />}
          label="Tổng điều chỉnh"
          value={fmtVND(stats.ytdAdj)}
          hint="Bonus / khấu trừ"
        />
        <KpiCard
          icon={<FileText className="h-5 w-5" />}
          label="Tổng net"
          value={fmtVND(stats.ytdNet)}
          hint="Số thực nhận"
          accent
        />
      </div>

      {stats.last6.length > 0 && (
        <section className="rounded-2xl bg-card border border-border p-6 shadow-card">
          <h3 className="font-semibold mb-2">Lương 6 tháng gần nhất (gross)</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.last6}>
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${v / 1_000_000}tr`} />
                <Tooltip
                  formatter={(v: unknown) => fmtVND(typeof v === "number" ? v : Number(v))}
                  cursor={{ fill: "hsl(var(--muted))" }}
                />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="rounded-2xl bg-card border border-border shadow-card overflow-hidden">
        <header className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold">Bảng lương ({data.length} kỳ)</h3>
        </header>
        <div className="divide-y divide-border">
          {data.map((p) => (
            <div key={p.id} className="px-4 py-3 grid grid-cols-2 md:grid-cols-5 gap-2 text-sm items-center">
              <div className="font-medium">{p.month_start.slice(0, 7)}</div>
              <div>
                <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${STATUS_TONE[p.status]}`}>
                  {STATUS_LABEL[p.status]}
                </span>
              </div>
              <div className="tabular-nums">{fmtVND(Number(p.gross_amount_vnd ?? 0))}</div>
              <div className="tabular-nums text-muted-foreground">
                {Number(p.adjustments_total_vnd ?? 0) > 0 ? `+ ${fmtVND(Number(p.adjustments_total_vnd))}` : fmtVND(Number(p.adjustments_total_vnd ?? 0))}
              </div>
              <div className="tabular-nums font-semibold text-primary">{fmtVND(Number(p.net_amount_vnd ?? 0))}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function KpiCard({
  icon, label, value, hint, gradient = false, accent = false,
}: {
  icon: React.ReactNode; label: string; value: string; hint?: string; gradient?: boolean; accent?: boolean;
}) {
  if (gradient) {
    return (
      <div className="rounded-2xl p-6 bg-gradient-primary text-primary-foreground shadow-elevated">
        <div className="flex items-center justify-between">
          {icon}
          <span className="text-xs uppercase tracking-wider opacity-80">{label}</span>
        </div>
        <div className="font-display text-3xl font-bold mt-3">{value}</div>
        {hint && <div className="text-xs opacity-90 mt-1">{hint}</div>}
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-card border border-border p-6 shadow-card">
      <div className="flex items-center justify-between">
        {icon}
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className={`font-display text-3xl font-bold mt-3 ${accent ? "text-primary" : ""}`}>{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}
