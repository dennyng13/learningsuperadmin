import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@shared/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@shared/components/ui/table";
import { Textarea } from "@shared/components/ui/textarea";
import {
  AlertCircle, ArrowLeft, CalendarClock, CheckCircle2, FileX, Lock, RotateCcw, Send,
} from "lucide-react";
import { toast } from "sonner";
import {
  useTimesheetPeriodDetail,
  approvePeriod,
  requestPeriodRevision,
  lockPeriod,
  reopenPeriod,
  getOrCreatePeriod,
} from "../hooks/useTimesheet";
import TimesheetPeriodStatusBadge from "../components/TimesheetPeriodStatusBadge";
import TimesheetEntryStatusBadge from "../components/TimesheetEntryStatusBadge";
import StatusTimeline from "@shared/components/StatusTimeline";
import DetailSkeleton from "@shared/components/DetailSkeleton";
import EmptyState from "@shared/components/EmptyState";
import { getTimesheetTimeline } from "../utils/statusTimeline";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function formatTime(t: string | null) {
  if (!t) return "—";
  return t.slice(0, 5);
}
function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${formatDate(iso)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function formatHours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}p`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}
function formatMonth(iso: string) {
  const [y, m] = iso.split("-");
  return `${m}/${y}`;
}

export default function TimesheetPeriodDetailPage() {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useTimesheetPeriodDetail(periodId);

  const [revisionMessage, setRevisionMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showRevisionBox, setShowRevisionBox] = useState(false);

  const totalsByStatus = useMemo(() => {
    if (!data) return { planned: 0, taught: 0, cancelled: 0, teacher_absent: 0, substituted: 0 };
    const tally = { planned: 0, taught: 0, cancelled: 0, teacher_absent: 0, substituted: 0 };
    for (const e of data.entries) tally[e.status] += 1;
    return tally;
  }, [data]);

  const entriesByDay = useMemo(() => {
    if (!data) return [] as Array<{ date: string; rows: typeof data.entries }>;
    const groups = new Map<string, typeof data.entries>();
    for (const e of data.entries) {
      if (!groups.has(e.entry_date)) groups.set(e.entry_date, []);
      groups.get(e.entry_date)!.push(e);
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, rows]) => ({ date, rows }));
  }, [data]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-5 md:py-8 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/timesheet")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Danh sách bảng công
        </Button>
        <DetailSkeleton rows={4} />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/timesheet")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại
        </Button>
        <div className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error || "Không tìm thấy bảng công"}
        </div>
      </div>
    );
  }

  const period = data.period;
  const isEditableState = period.status === "open" || period.status === "revision_requested";
  const canApprove = period.status === "submitted";
  const canRequestRevision = period.status === "submitted" || period.status === "approved";
  const canLock = period.status === "approved";
  const canReopen =
    period.status === "approved" ||
    period.status === "locked" ||
    period.status === "submitted" ||
    period.status === "revision_requested";

  const timeline = getTimesheetTimeline(period.status);

  const onSync = async () => {
    setBusy(true);
    try {
      await getOrCreatePeriod(period.teacher_id, period.month_start);
      toast.success("Đã đồng bộ buổi mới từ lịch dạy");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không đồng bộ được");
    } finally {
      setBusy(false);
    }
  };

  const onApprove = async () => {
    setBusy(true);
    try {
      await approvePeriod(period.id);
      toast.success("Đã duyệt bảng công");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không duyệt được");
    } finally {
      setBusy(false);
    }
  };

  const onRequestRevision = async () => {
    if (revisionMessage.trim().length === 0) {
      toast.error("Vui lòng ghi lý do yêu cầu sửa");
      return;
    }
    setBusy(true);
    try {
      await requestPeriodRevision(period.id, revisionMessage.trim());
      toast.success("Đã gửi yêu cầu sửa");
      setRevisionMessage("");
      setShowRevisionBox(false);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không gửi được");
    } finally {
      setBusy(false);
    }
  };

  const onLock = async () => {
    setBusy(true);
    try {
      await lockPeriod(period.id);
      toast.success("Đã khoá kỳ lương");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không khoá được");
    } finally {
      setBusy(false);
    }
  };

  const onReopen = async () => {
    setBusy(true);
    try {
      await reopenPeriod(period.id);
      toast.success("Đã mở lại kỳ");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không mở được");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-5 md:py-8 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/timesheet")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Danh sách bảng công
        </Button>
        <TimesheetPeriodStatusBadge status={period.status} />
      </div>

      {/* Header card */}
      <div className="rounded-2xl bg-card border border-border p-5 shadow-card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <CalendarClock className="h-3.5 w-3.5" />
              <span>Bảng công tháng</span>
            </div>
            <h1 className="text-xl font-semibold mt-0.5">
              {period.teacher_full_name ?? "—"} · Tháng {formatMonth(period.month_start)}
            </h1>
            <div className="text-sm text-muted-foreground mt-1">
              {period.total_taught_count} buổi đã dạy · Tổng {formatHours(period.total_minutes)}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <StatusTimeline steps={timeline} />
        </div>

        {period.admin_message && period.status === "revision_requested" && (
          <div className="mt-4 rounded-md bg-rose-50 text-rose-900 border border-rose-200 px-3 py-2 text-sm">
            <strong>Yêu cầu sửa:</strong> {period.admin_message}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Status totals strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(["planned", "taught", "cancelled", "teacher_absent", "substituted"] as const).map((k) => (
              <div
                key={k}
                className="rounded-xl bg-card border border-border px-3 py-2 shadow-sm"
              >
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  <TimesheetEntryStatusBadge status={k} />
                </div>
                <div className="text-xl font-semibold mt-1">{totalsByStatus[k]}</div>
              </div>
            ))}
          </div>

          {/* Entries grouped by day */}
          <div className="rounded-2xl bg-card border border-border p-5 shadow-card">
            <h2 className="font-semibold mb-3">Chi tiết buổi dạy</h2>
            {data.entries.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="Chưa có buổi dạy nào trong tháng này"
                description="Bấm Đồng bộ buổi mới để kéo dữ liệu từ lịch dạy."
              />
            ) : (
              <div className="space-y-4">
                {entriesByDay.map(({ date, rows }) => (
                  <div key={date}>
                    <div className="text-xs font-semibold text-muted-foreground mb-1">
                      {formatDate(date)}
                    </div>
                    <div className="rounded-md border border-border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Lớp</TableHead>
                            <TableHead>Kế hoạch</TableHead>
                            <TableHead>Thực tế</TableHead>
                            <TableHead className="text-right">Phút</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead>Ghi chú</TableHead>
                            <TableHead className="text-right">Xác nhận</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.map((e) => (
                            <TableRow key={e.id}>
                              <TableCell className="font-medium">
                                {e.class_name_snapshot ?? "—"}
                              </TableCell>
                              <TableCell className="text-xs">
                                {formatTime(e.planned_start)} – {formatTime(e.planned_end)}
                              </TableCell>
                              <TableCell className="text-xs">
                                {e.actual_start
                                  ? `${formatTime(e.actual_start)} – ${formatTime(e.actual_end)}`
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                {e.status === "taught" ? formatHours(e.duration_minutes) : "—"}
                              </TableCell>
                              <TableCell>
                                <TimesheetEntryStatusBadge status={e.status} />
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[280px]">
                                {e.status === "substituted" && e.substitute_teacher_name && (
                                  <div>Người dạy thay: <strong>{e.substitute_teacher_name}</strong></div>
                                )}
                                {e.notes && <div>{e.notes}</div>}
                                {e.reason && <div className="italic">{e.reason}</div>}
                                {!e.notes && !e.reason && e.status !== "substituted" && "—"}
                              </TableCell>
                              <TableCell className="text-right text-xs text-muted-foreground">
                                {formatDateTime(e.confirmed_at)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sticky sidebar */}
        <div className="space-y-4 lg:sticky lg:top-4 self-start">
          <div className="rounded-2xl bg-card border border-border p-4 shadow-card space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">Thao tác</div>
            <Button
              variant="outline" size="sm" className="w-full justify-start"
              disabled={busy || !isEditableState}
              onClick={onSync}
            >
              <RotateCcw className="h-4 w-4 mr-1" /> Đồng bộ buổi mới
            </Button>
            {canApprove && (
              <Button size="sm" className="w-full justify-start" disabled={busy} onClick={onApprove}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Duyệt
              </Button>
            )}
            {canRequestRevision && (
              <Button
                variant="outline" size="sm" className="w-full justify-start"
                disabled={busy} onClick={() => setShowRevisionBox((v) => !v)}
              >
                <Send className="h-4 w-4 mr-1" /> Yêu cầu sửa
              </Button>
            )}
            {canLock && (
              <Button size="sm" className="w-full justify-start" disabled={busy} onClick={onLock}>
                <Lock className="h-4 w-4 mr-1" /> Khoá kỳ
              </Button>
            )}
            {canReopen && (
              <Button
                variant="ghost" size="sm" className="w-full justify-start"
                disabled={busy} onClick={onReopen}
              >
                <FileX className="h-4 w-4 mr-1" /> Mở lại
              </Button>
            )}
            {showRevisionBox && (
              <div className="space-y-2 pt-2">
                <Textarea
                  placeholder="Mô tả lý do yêu cầu sửa (giáo viên sẽ thấy)…"
                  value={revisionMessage}
                  onChange={(e) => setRevisionMessage(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowRevisionBox(false)}>
                    Huỷ
                  </Button>
                  <Button size="sm" disabled={busy} onClick={onRequestRevision}>
                    Gửi
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-card border border-border p-4 shadow-card">
            <div className="text-xs font-semibold text-muted-foreground mb-2">Tiến trình</div>
            <StatusTimeline steps={timeline} vertical />
          </div>
        </div>
      </div>
    </div>
  );
}
