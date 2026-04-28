/**
 * P5d — Admin AttendanceMonitorPage
 *
 * Surface for /admin/attendance: lists sessions where attendance has not been
 * locked, bucketed by `lock_status` ∈ {upcoming, pending, overdue}, plus an
 * action to force-unlock any session (admin only).
 *
 * Data source: views v_sessions_pending_lock + v_class_attendance_health
 * (added by 20260504_stage_p5d_attendance_monitor.sql).
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ListPageLayout } from "@shared/components/layouts/ListPageLayout";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Input } from "@shared/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@shared/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@shared/components/ui/alert-dialog";
import { Textarea } from "@shared/components/ui/textarea";
import {
  ClipboardCheck, AlertTriangle, Clock, Search, RotateCw, Unlock, Loader2,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";

type LockStatus = "upcoming" | "pending" | "overdue";

interface PendingRow {
  session_id: string;
  class_id: string;
  class_name: string | null;
  class_code: string | null;
  session_number: number | null;
  session_date: string;
  start_time: string;
  end_time: string;
  status: string;
  teacher_id: string | null;
  teacher_name: string | null;
  is_late_locked: boolean;
  lock_status: LockStatus;
  hours_since_start: number | null;
  expected_count: number;
  marked_count: number;
}

const STATUS_FILTER_OPTIONS: Array<{ value: "all" | LockStatus; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "overdue", label: "Quá 24h (overdue)" },
  { value: "pending", label: "Đang chờ (≤24h)" },
  { value: "upcoming", label: "Sắp tới" },
];

function formatTime(t: string): string {
  if (!t) return "";
  const m = /^(\d{2}):(\d{2})/.exec(t);
  return m ? `${m[1]}:${m[2]}` : t;
}

function StatusBadge({ status }: { status: LockStatus }) {
  if (status === "overdue") {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" /> Quá 24h
      </Badge>
    );
  }
  if (status === "pending") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Clock className="h-3 w-3" /> Đang chờ
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      Sắp tới
    </Badge>
  );
}

export default function AttendanceMonitorPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<"all" | LockStatus>("all");
  const [search, setSearch] = useState("");
  const [unlockTarget, setUnlockTarget] = useState<PendingRow | null>(null);
  const [unlockReason, setUnlockReason] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["v_sessions_pending_lock"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("v_sessions_pending_lock")
        .select("*")
        .order("session_date", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data as PendingRow[]) ?? [];
    },
    refetchOnWindowFocus: false,
  });

  const filtered = useMemo(() => {
    const rows = data ?? [];
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.lock_status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [r.class_name, r.class_code, r.teacher_name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, statusFilter, search]);

  const counts = useMemo(() => {
    const rows = data ?? [];
    return {
      total: rows.length,
      overdue: rows.filter((r) => r.lock_status === "overdue").length,
      pending: rows.filter((r) => r.lock_status === "pending").length,
      upcoming: rows.filter((r) => r.lock_status === "upcoming").length,
      late_lock: rows.filter((r) => r.is_late_locked).length,
    };
  }, [data]);

  const submitUnlock = async () => {
    if (!unlockTarget) return;
    if (unlockReason.trim().length < 3) {
      toast.error("Lý do tối thiểu 3 ký tự.");
      return;
    }
    setUnlocking(true);
    const { error } = await (supabase as any).rpc("admin_force_unlock_session", {
      _session_id: unlockTarget.session_id,
      _reason: unlockReason.trim(),
    });
    setUnlocking(false);
    if (error) {
      toast.error("Force unlock thất bại: " + error.message);
      return;
    }
    toast.success("Đã mở khoá điểm danh — giáo viên có thể chỉnh lại.");
    setUnlockTarget(null);
    setUnlockReason("");
    void refetch();
  };

  return (
    <ListPageLayout
      title="Theo dõi điểm danh"
      subtitle="Các buổi học chưa khoá điểm danh, gom theo upcoming / pending / overdue."
      icon={ClipboardCheck}
      backRoute="/dashboard"
      backLabel="Dashboard"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2"
        >
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
          Làm mới
        </Button>
      }
    >
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <KpiCard label="Tổng" value={counts.total} />
        <KpiCard label="Quá 24h" value={counts.overdue} tone="destructive" />
        <KpiCard label="Đang chờ" value={counts.pending} tone="warning" />
        <KpiCard label="Sắp tới" value={counts.upcoming} tone="muted" />
        <KpiCard label="Đã đánh trễ" value={counts.late_lock} tone="destructive" />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo lớp / mã lớp / giáo viên"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lớp</TableHead>
              <TableHead>Buổi</TableHead>
              <TableHead>Giáo viên</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-center">Đã điểm</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Đang tải…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  Không có buổi nào phù hợp với bộ lọc.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.session_id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{r.class_name || "—"}</span>
                      {r.class_code && (
                        <span className="text-[11px] text-muted-foreground">{r.class_code}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-xs">
                      <span>Buổi {r.session_number ?? "?"} · {r.session_date}</span>
                      <span className="text-muted-foreground">
                        {formatTime(r.start_time)}–{formatTime(r.end_time)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{r.teacher_name || "—"}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={r.lock_status} />
                      {r.is_late_locked && (
                        <Badge variant="destructive" className="text-[9px] gap-1">
                          <AlertTriangle className="h-2.5 w-2.5" /> Đã đánh trễ
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {r.marked_count}/{r.expected_count}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/classes/${r.class_id}`)}
                        className="gap-1.5 text-xs"
                      >
                        Mở lớp <ArrowUpRight className="h-3 w-3" />
                      </Button>
                      {/* admin_force_unlock_session only meaningful when locked;
                          v_sessions_pending_lock filters out locked rows already.
                          But we still expose unlock for the rare race-condition
                          where a row was locked between fetches. */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setUnlockTarget(r)}
                        className="gap-1.5 text-xs text-muted-foreground"
                        title="Force unlock — chỉ dành cho admin"
                      >
                        <Unlock className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={!!unlockTarget}
        onOpenChange={(o) => {
          if (!o) {
            setUnlockTarget(null);
            setUnlockReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Force unlock điểm danh</AlertDialogTitle>
            <AlertDialogDescription>
              {unlockTarget && (
                <>
                  Bạn sắp mở khoá lớp <b>{unlockTarget.class_name}</b>, buổi{" "}
                  {unlockTarget.session_number} ngày {unlockTarget.session_date}. Hành động
                  được ghi vào <code>attendance_audit_log</code>.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Lý do (bắt buộc, ≥ 3 ký tự) — vd. giáo viên đã rời tổ chức, xác nhận lại."
            value={unlockReason}
            onChange={(e) => setUnlockReason(e.target.value)}
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unlocking}>Huỷ</AlertDialogCancel>
            <AlertDialogAction onClick={submitUnlock} disabled={unlocking}>
              {unlocking && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Mở khoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ListPageLayout>
  );
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "muted" | "destructive" | "warning";
}) {
  const valueClass =
    tone === "destructive" ? "text-destructive" :
    tone === "warning" ? "text-status-pending" :
    tone === "muted" ? "text-muted-foreground" :
    "text-foreground";
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}
