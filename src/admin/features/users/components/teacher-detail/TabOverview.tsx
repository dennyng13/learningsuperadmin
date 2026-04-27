// Stage P3 admin — TeacherDetailPage "Tổng quan" tab.
// Renders KPI snapshot from public.v_teacher_kpi_snapshot.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Briefcase, Calendar, Loader2, Mail, MessageSquare, Sparkles, TrendingUp, Wallet,
} from "lucide-react";

interface KpiRow {
  teacher_id: string;
  full_name: string | null;
  email: string | null;
  status: string | null;
  employment_status: string | null;
  hired_at: string | null;
  terminated_at: string | null;
  bank_account_last_confirmed_at: string | null;
  active_classes_count: number;
  sessions_next_28d: number;
  sessions_completed_30d: number;
  avg_gross_vnd_6mo: number | string | null;
  last_payslip_month: string | null;
  total_payslips_paid: number;
  pending_invitation_count: number;
  pending_negotiation_count: number;
  pending_capability_drafts: number;
  pending_availability_drafts: number;
}

const VND_FMT = new Intl.NumberFormat("vi-VN");
function fmtVND(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(n)) return "—";
  return `${VND_FMT.format(Math.round(n))} ₫`;
}

interface Props { teacherId: string }

export default function TabOverview({ teacherId }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["teacher-kpi-snapshot", teacherId],
    queryFn: async (): Promise<KpiRow | null> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from as any)("v_teacher_kpi_snapshot")
        .select("*")
        .eq("teacher_id", teacherId)
        .maybeSingle();
      if (error) throw error;
      return (data as KpiRow) ?? null;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải KPI…
      </div>
    );
  }
  if (error) {
    return <p className="text-sm text-destructive">Lỗi tải KPI: {(error as Error).message}</p>;
  }
  if (!data) {
    return <p className="text-sm text-muted-foreground">Chưa có KPI snapshot. Migration Stage P3 đã apply chưa?</p>;
  }

  const bankConfirmedDays = data.bank_account_last_confirmed_at
    ? Math.floor((Date.now() - new Date(data.bank_account_last_confirmed_at).getTime()) / 86400000)
    : null;

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card icon={<Sparkles className="h-4 w-4" />} label="Lớp đang dạy" value={String(data.active_classes_count)} hint="Cửa sổ −14d → +60d" />
        <Card icon={<Calendar className="h-4 w-4" />} label="Buổi 28 ngày tới" value={String(data.sessions_next_28d)} />
        <Card icon={<TrendingUp className="h-4 w-4" />} label="Buổi đã dạy 30d" value={String(data.sessions_completed_30d)} />
        <Card
          icon={<Wallet className="h-4 w-4" />}
          label="Avg lương 6 tháng"
          value={fmtVND(data.avg_gross_vnd_6mo)}
          hint={data.last_payslip_month ? `Lương gần nhất: ${data.last_payslip_month}` : "Chưa có bảng lương"}
        />
      </div>

      {/* Pending work */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Stat
          icon={<Mail className="h-4 w-4" />}
          label="Lời mời đang chờ"
          value={data.pending_invitation_count}
          sub={data.pending_negotiation_count > 0 ? `${data.pending_negotiation_count} đang thương lượng` : undefined}
          tone={data.pending_invitation_count > 0 ? "warning" : "neutral"}
        />
        <Stat
          icon={<MessageSquare className="h-4 w-4" />}
          label="Đề xuất chờ duyệt"
          value={data.pending_capability_drafts + data.pending_availability_drafts}
          sub={
            data.pending_capability_drafts + data.pending_availability_drafts > 0
              ? `Năng lực: ${data.pending_capability_drafts} · Lịch rảnh: ${data.pending_availability_drafts}`
              : "Không có gì cần duyệt"
          }
          tone={(data.pending_capability_drafts + data.pending_availability_drafts) > 0 ? "warning" : "neutral"}
        />
      </div>

      {/* Employment & banking confirmation row */}
      <div className="rounded-xl border bg-card p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1 inline-flex items-center gap-1">
            <Briefcase className="h-3 w-3" /> HR
          </div>
          <dl className="space-y-0.5">
            <Row label="Loại công việc" value={data.employment_status ?? "—"} />
            <Row label="Vào làm" value={data.hired_at ?? "—"} />
            {data.terminated_at && <Row label="Nghỉ việc" value={data.terminated_at} />}
            <Row label="Trạng thái" value={data.status ?? "—"} />
            <Row label="Tổng bảng lương đã chốt" value={String(data.total_payslips_paid)} />
          </dl>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1 inline-flex items-center gap-1">
            <Wallet className="h-3 w-3" /> Banking confirmation
          </div>
          {data.bank_account_last_confirmed_at ? (
            <p className="text-sm">
              Lần xác nhận gần nhất:{" "}
              <strong className="text-foreground">{new Date(data.bank_account_last_confirmed_at).toLocaleString("vi-VN")}</strong>
              {bankConfirmedDays !== null && (
                <span className={bankConfirmedDays > 30 ? "text-warning ml-2" : "text-muted-foreground ml-2"}>
                  ({bankConfirmedDays} ngày trước)
                </span>
              )}
            </p>
          ) : (
            <p className="text-warning text-sm">Giáo viên chưa xác nhận thông tin ngân hàng — họ sẽ được nhắc khi mở bảng lương lần tới.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1">
        {icon} {label}
      </div>
      <div className="font-display text-2xl font-bold mt-1 tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

function Stat({
  icon, label, value, sub, tone,
}: {
  icon: React.ReactNode; label: string; value: number; sub?: string; tone: "warning" | "neutral";
}) {
  return (
    <div className={`rounded-xl border p-3 ${tone === "warning" ? "bg-warning/5 border-warning/30" : "bg-card"}`}>
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1">
          {icon} {label}
        </div>
        <div className={`tabular-nums font-bold text-xl ${tone === "warning" && value > 0 ? "text-warning" : ""}`}>{value}</div>
      </div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
