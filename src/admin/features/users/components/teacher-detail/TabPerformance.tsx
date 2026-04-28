// Stage P5e admin — TeacherDetailPage "Hiệu quả" tab.
// Reads from v_teacher_performance and renders 3 KPI cards (active classes,
// avg revenue 6mo, on-time attendance % + late count) with month/year toggle.
// Admin can edit targets via the inline target-editor cards.

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle, BookOpen, CheckCircle2, Loader2, Pencil, Save, TrendingUp, X,
} from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Badge } from "@shared/components/ui/badge";
import { toast } from "sonner";

interface Props { teacherId: string }

type KpiKey = "active_classes" | "avg_revenue_6mo" | "on_time_pct" | "max_late_count";

interface PerfRow {
  teacher_id: string;
  full_name: string | null;
  active_classes_count: number;
  avg_gross_vnd_6mo: number | null;
  locked_on_time_month: number;
  locked_total_month: number;
  on_time_pct_month: number | null;
  late_count_month: number;
  locked_on_time_year: number;
  locked_total_year: number;
  on_time_pct_year: number | null;
  late_count_year: number;
  target_active_classes: number | null;
  target_avg_revenue_6mo: number | null;
  target_on_time_pct: number | null;
  target_max_late_count: number | null;
}

const VND_FMT = new Intl.NumberFormat("vi-VN", {
  style: "currency", currency: "VND", maximumFractionDigits: 0,
});
const fmtVND = (n: number | null | undefined) => (n == null ? "—" : VND_FMT.format(n));
const fmtPct = (n: number | null | undefined) =>
  n == null ? "—" : `${n.toFixed(1)}%`;

export default function TabPerformance({ teacherId }: Props) {
  const qc = useQueryClient();
  const [period, setPeriod] = useState<"month" | "year">("month");

  const { data, isLoading, error } = useQuery({
    queryKey: ["teacher-performance", teacherId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from as any)("v_teacher_performance")
        .select("*")
        .eq("teacher_id", teacherId)
        .maybeSingle();
      if (error) throw error;
      return (data as PerfRow | null) ?? null;
    },
  });

  const upsertTarget = useMutation({
    mutationFn: async (input: { kpi: KpiKey; value: number; note?: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc("admin_upsert_teacher_target", {
        _teacher_id: teacherId,
        _kpi_key: input.kpi,
        _target_value: input.value,
        _effective_from: null,
        _note: input.note ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã cập nhật chỉ tiêu");
      qc.invalidateQueries({ queryKey: ["teacher-performance", teacherId] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Không thể cập nhật chỉ tiêu";
      toast.error(msg);
    },
  });

  const onTimePct = period === "month" ? data?.on_time_pct_month : data?.on_time_pct_year;
  const lateCount = period === "month" ? data?.late_count_month : data?.late_count_year;
  const lockedTotal = period === "month" ? data?.locked_total_month : data?.locked_total_year;
  const lockedOnTime = period === "month" ? data?.locked_on_time_month : data?.locked_on_time_year;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Không tải được dữ liệu hiệu quả: {(error as Error).message}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Chưa có dữ liệu hiệu quả cho giáo viên này.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">Hiệu quả công tác</h3>
          <p className="text-sm text-muted-foreground">
            3 chỉ tiêu chính. Doanh thu trung bình tính 6 tháng gần nhất (không tính tháng hiện tại).
          </p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as "month" | "year")}>
          <TabsList>
            <TabsTrigger value="month">Tháng này</TabsTrigger>
            <TabsTrigger value="year">Cả năm</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          icon={BookOpen}
          label="Số lớp đang dạy"
          actual={data.active_classes_count}
          target={data.target_active_classes}
          formatter={(n) => `${n} lớp`}
          tone="primary"
          onSave={(v) => upsertTarget.mutate({ kpi: "active_classes", value: v })}
          saving={upsertTarget.isPending}
        />
        <KpiCard
          icon={TrendingUp}
          label="Doanh thu TB / tháng (6 tháng gần nhất)"
          actual={data.avg_gross_vnd_6mo}
          target={data.target_avg_revenue_6mo}
          formatter={fmtVND}
          tone="primary"
          onSave={(v) => upsertTarget.mutate({ kpi: "avg_revenue_6mo", value: v })}
          saving={upsertTarget.isPending}
        />
        <KpiCard
          icon={CheckCircle2}
          label={period === "month" ? "Tỷ lệ điểm danh đúng hạn (tháng)" : "Tỷ lệ điểm danh đúng hạn (năm)"}
          actual={onTimePct ?? null}
          target={data.target_on_time_pct}
          formatter={fmtPct}
          subtext={
            lockedTotal == null || lockedTotal === 0
              ? "Chưa có buổi nào được khoá điểm danh."
              : `${lockedOnTime}/${lockedTotal} buổi đúng hạn`
          }
          tone={
            data.target_on_time_pct != null && onTimePct != null && onTimePct < data.target_on_time_pct
              ? "warning"
              : "success"
          }
          onSave={(v) => upsertTarget.mutate({ kpi: "on_time_pct", value: v })}
          saving={upsertTarget.isPending}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Số lần trễ điểm danh
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-3xl font-bold tabular-nums">
              {lateCount ?? 0}
              <span className="text-base font-normal text-muted-foreground ml-2">
                {period === "month" ? "lần / tháng" : "lần / năm"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tự động cộng dồn khi quá 24h kể từ giờ bắt đầu mà giáo viên chưa khoá điểm danh.
            </p>
          </div>
          <TargetInline
            label="Ngưỡng tối đa"
            current={data.target_max_late_count}
            formatter={(n) => `${n} lần`}
            onSave={(v) => upsertTarget.mutate({ kpi: "max_late_count", value: v })}
            saving={upsertTarget.isPending}
          />
          {data.target_max_late_count != null && (lateCount ?? 0) > data.target_max_late_count && (
            <Badge variant="destructive">Vượt ngưỡng</Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

interface KpiCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  actual: number | null;
  target: number | null;
  formatter: (n: number) => string;
  subtext?: string;
  tone?: "primary" | "success" | "warning";
  onSave: (value: number) => void;
  saving: boolean;
}

function KpiCard({ icon: Icon, label, actual, target, formatter, subtext, tone = "primary", onSave, saving }: KpiCardProps) {
  const headerTone =
    tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-primary";

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center gap-2">
        <Icon className={`h-4 w-4 ${headerTone}`} />
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-3xl font-bold tabular-nums">
          {actual == null ? "—" : formatter(actual)}
        </div>
        {subtext && (
          <p className="text-xs text-muted-foreground">{subtext}</p>
        )}
        <TargetInline
          label="Chỉ tiêu"
          current={target}
          formatter={formatter}
          onSave={onSave}
          saving={saving}
        />
      </CardContent>
    </Card>
  );
}

interface TargetInlineProps {
  label: string;
  current: number | null;
  formatter: (n: number) => string;
  onSave: (value: number) => void;
  saving: boolean;
}

function TargetInline({ label, current, formatter, onSave, saving }: TargetInlineProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(current?.toString() ?? "");

  const startEdit = () => {
    setDraft(current?.toString() ?? "");
    setEditing(true);
  };

  const handleSave = () => {
    const n = Number(draft);
    if (!Number.isFinite(n) || n < 0) {
      toast.error("Giá trị không hợp lệ");
      return;
    }
    onSave(n);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-medium tabular-nums">
            {current == null ? "Chưa đặt" : formatter(current)}
          </span>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={startEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="h-9"
          autoFocus
          disabled={saving}
        />
        <Button size="sm" onClick={handleSave} disabled={saving} className="h-9">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving} className="h-9">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
