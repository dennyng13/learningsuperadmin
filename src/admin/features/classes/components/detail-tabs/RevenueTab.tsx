import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@shared/components/ui/card";
import { Skeleton } from "@shared/components/ui/skeleton";
import { Wallet, TrendingUp, TrendingDown, Receipt, AlertCircle } from "lucide-react";

interface RevenueRow {
  class_id: string;
  effective_price_vnd: number | null;
  active_student_count: number | null;
  expected_revenue_vnd: number | null;
  collected_revenue_vnd: number | null;
  outstanding_revenue_vnd: number | null;
  paid_transaction_count: number | null;
  last_payment_date: string | null;
}

interface PaymentRow {
  id: string;
  student_id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  description: string | null;
  invoice_number: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

/**
 * Tab "Doanh thu" — admin-only.
 * Đọc từ view `v_class_revenue` (P4a) + bảng `student_payments` filter theo
 * class_id để liệt kê transactions thực tế đã thu.
 *
 * RLS phía DB chỉ admin SELECT student_payments → tab này tự nhiên ẩn data
 * khỏi non-admin. Gating ở UI là phụ.
 */
export function RevenueTab({ classId }: { classId: string }) {
  const revenueQ = useQuery({
    queryKey: ["admin-class-revenue", classId],
    queryFn: async (): Promise<RevenueRow | null> => {
      const { data, error } = await (supabase as any)
        .from("v_class_revenue")
        .select("*")
        .eq("class_id", classId)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    enabled: !!classId,
    staleTime: 30_000,
  });

  const paymentsQ = useQuery({
    queryKey: ["admin-class-payments", classId],
    queryFn: async (): Promise<PaymentRow[]> => {
      const { data, error } = await (supabase as any)
        .from("student_payments")
        .select("id, student_id, amount, payment_date, payment_method, description, invoice_number, status, notes, created_at")
        .eq("class_id", classId)
        .order("payment_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as PaymentRow[]) ?? [];
    },
    enabled: !!classId,
    staleTime: 30_000,
  });

  if (revenueQ.isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const r = revenueQ.data;
  if (!r) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        Chưa có dữ liệu doanh thu cho lớp này.
      </Card>
    );
  }

  const expected = Number(r.expected_revenue_vnd ?? 0);
  const collected = Number(r.collected_revenue_vnd ?? 0);
  const outstanding = Number(r.outstanding_revenue_vnd ?? 0);
  const collectedPct = expected > 0 ? Math.min(100, (collected / expected) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={Wallet}
          label="Giá lớp hiệu lực"
          value={fmt(r.effective_price_vnd)}
          subtext={`${r.active_student_count ?? 0} HV active`}
        />
        <Kpi
          icon={TrendingUp}
          label="Doanh thu kỳ vọng"
          value={fmt(expected)}
          subtext="giá × HV active"
          tone="primary"
        />
        <Kpi
          icon={Receipt}
          label="Đã thu"
          value={fmt(collected)}
          subtext={`${r.paid_transaction_count ?? 0} giao dịch · ${collectedPct.toFixed(0)}%`}
          tone="success"
        />
        <Kpi
          icon={outstanding > 0 ? AlertCircle : TrendingDown}
          label={outstanding > 0 ? "Còn phải thu" : "Đã thu đủ"}
          value={fmt(Math.abs(outstanding))}
          subtext={
            r.last_payment_date
              ? `Lần thu cuối: ${new Date(r.last_payment_date).toLocaleDateString("vi-VN")}`
              : "Chưa có giao dịch"
          }
          tone={outstanding > 0 ? "warning" : "success"}
        />
      </div>

      {/* Transactions table */}
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 px-4 py-2.5">
          <h3 className="text-sm font-semibold">Giao dịch ({paymentsQ.data?.length ?? 0})</h3>
        </div>
        {paymentsQ.isLoading ? (
          <div className="p-4 space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        ) : paymentsQ.data && paymentsQ.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-muted-foreground bg-muted/20 border-b">
                <tr>
                  <th className="px-4 py-2 font-medium">Ngày</th>
                  <th className="px-4 py-2 font-medium">Số tiền</th>
                  <th className="px-4 py-2 font-medium">PT thanh toán</th>
                  <th className="px-4 py-2 font-medium">Hoá đơn</th>
                  <th className="px-4 py-2 font-medium">Trạng thái</th>
                  <th className="px-4 py-2 font-medium">Mô tả</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paymentsQ.data.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2 tabular-nums">
                      {new Date(p.payment_date).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-4 py-2 font-semibold tabular-nums">{fmt(p.amount)}</td>
                    <td className="px-4 py-2 text-muted-foreground">{p.payment_method ?? "—"}</td>
                    <td className="px-4 py-2 font-mono text-[11px]">{p.invoice_number ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          p.status === "paid"
                            ? "rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-600"
                            : "rounded-full border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                        }
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground line-clamp-1 max-w-xs">
                      {p.description ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Chưa có giao dịch nào được ghi nhận cho lớp này.
          </div>
        )}
      </Card>
    </div>
  );
}

function fmt(amount?: number | null): string {
  if (amount == null) return "—";
  return Number(amount).toLocaleString("vi-VN") + "₫";
}

function Kpi({
  icon: Icon,
  label,
  value,
  subtext,
  tone,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  subtext?: string;
  tone?: "primary" | "success" | "warning";
}) {
  const toneCls =
    tone === "primary"
      ? "text-primary"
      : tone === "success"
        ? "text-emerald-600 dark:text-emerald-400"
        : tone === "warning"
          ? "text-amber-600 dark:text-amber-400"
          : "";
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${toneCls || "text-muted-foreground"}`} />
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <p className={`text-base font-bold tabular-nums ${toneCls}`}>{value}</p>
      {subtext && <p className="text-[10px] text-muted-foreground">{subtext}</p>}
    </Card>
  );
}
