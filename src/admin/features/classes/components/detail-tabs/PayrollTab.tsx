import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Wallet, Loader2, ExternalLink, Banknote, Clock, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@shared/components/ui/button";
import { Card } from "@shared/components/ui/card";

const fmtVND = (n: number | null | undefined) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 })
    .format(Number(n ?? 0));

type PayrollRow = {
  class_id: string;
  teacher_id: string;
  teacher_name: string | null;
  sessions_taught: number | null;
  hours_taught: number | null;
  hourly_rate_vnd: number | null;
  total_payable_vnd: number | null;
  last_session_at: string | null;
};

export function PayrollTab({ classId }: { classId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["class-payroll", classId],
    queryFn: async (): Promise<PayrollRow[]> => {
      const { data, error } = await (supabase as any)
        .from("v_class_teacher_payroll" as any)
        .select("*")
        .eq("class_id", classId);
      if (error) throw error;
      return (data ?? []) as PayrollRow[];
    },
    enabled: !!classId,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang tải bảng lương…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Không tải được dữ liệu lương: {(error as Error).message}
      </div>
    );
  }

  const rows = data ?? [];

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center space-y-2">
        <Wallet className="h-8 w-8 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Chưa có dữ liệu lương — lớp chưa có buổi học hoàn thành.
        </p>
      </div>
    );
  }

  const total = rows.reduce((s, r) => s + Number(r.total_payable_vnd ?? 0), 0);
  const totalSessions = rows.reduce((s, r) => s + Number(r.sessions_taught ?? 0), 0);
  const totalHours = rows.reduce((s, r) => s + Number(r.hours_taught ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid gap-3 grid-cols-3">
        <Card className="p-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
              <Banknote className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            </span>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Tổng phải trả</p>
          </div>
          <p className="text-lg font-bold tabular-nums">{fmtVND(total)}</p>
        </Card>
        <Card className="p-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 ring-1 ring-blue-500/20">
              <TrendingUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </span>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Sessions</p>
          </div>
          <p className="text-lg font-bold tabular-nums">{totalSessions}</p>
        </Card>
        <Card className="p-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 ring-1 ring-violet-500/20">
              <Clock className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
            </span>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Tổng giờ</p>
          </div>
          <p className="text-lg font-bold tabular-nums">{totalHours.toFixed(1)}h</p>
        </Card>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2.5">Giáo viên</th>
              <th className="text-right px-4 py-2.5">Sessions</th>
              <th className="text-right px-4 py-2.5">Giờ dạy</th>
              <th className="text-right px-4 py-2.5">Hourly rate</th>
              <th className="text-right px-4 py-2.5">Tổng phải trả</th>
              <th className="text-left px-4 py-2.5">Buổi gần nhất</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.teacher_id} className="border-t">
                <td className="px-4 py-2.5 font-medium">{r.teacher_name ?? "(Không tên)"}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.sessions_taught ?? 0}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {Number(r.hours_taught ?? 0).toFixed(1)}h
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {fmtVND(r.hourly_rate_vnd)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums font-semibold">
                  {fmtVND(r.total_payable_vnd)}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  {r.last_session_at
                    ? new Date(r.last_session_at).toLocaleDateString("vi-VN")
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/30 font-semibold">
              <td className="px-4 py-2.5" colSpan={4}>Tổng cộng</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{fmtVND(total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      </div>

      <div className="flex justify-end">
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link to="/payroll/list">
            <ExternalLink className="h-3.5 w-3.5" />
            Mở trang Payroll đầy đủ
          </Link>
        </Button>
      </div>
    </div>
  );
}