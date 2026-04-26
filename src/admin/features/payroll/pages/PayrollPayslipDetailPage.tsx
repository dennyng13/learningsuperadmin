import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@shared/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@shared/components/ui/table";
import { Textarea } from "@shared/components/ui/textarea";
import {
  AlertCircle, ArrowLeft, Banknote, CheckCircle2, RotateCcw, Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  usePayrollPayslipDetail, confirmPayslip, markPayslipPaid, rebuildPayslipLines,
} from "../hooks/usePayroll";
import PayrollPayslipStatusBadge from "../components/PayrollPayslipStatusBadge";
import PayrollAdjustmentsEditor from "../components/PayrollAdjustmentsEditor";
import StatusTimeline from "@shared/components/StatusTimeline";
import DetailSkeleton from "@shared/components/DetailSkeleton";
import { getPayslipTimeline } from "../utils/statusTimeline";
import { formatDate, formatDateTime, formatHours, formatMonth, formatVnd } from "../utils/format";

export default function PayrollPayslipDetailPage() {
  const { payslipId } = useParams<{ payslipId: string }>();
  const navigate = useNavigate();
  const { data, loading, error, refresh } = usePayrollPayslipDetail(payslipId);

  const [adminMessage, setAdminMessage] = useState("");
  const [showConfirmBox, setShowConfirmBox] = useState(false);
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-5 md:py-8 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/payroll")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Bảng lương
        </Button>
        <DetailSkeleton rows={4} />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/payroll")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại
        </Button>
        <div className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error || "Không tìm thấy payslip"}
        </div>
      </div>
    );
  }

  const { payslip, teacher, lines, adjustments } = data;
  const isDraft = payslip.status === "draft";
  const canConfirm = isDraft;
  const canMarkPaid =
    payslip.status === "confirmed" || payslip.status === "teacher_acknowledged";

  const timeline = getPayslipTimeline(payslip.status);

  const onRebuild = async () => {
    if (!confirm("Tải lại lines từ kỳ bảng công đã khoá? Các adjustments sẽ giữ nguyên.")) return;
    setBusy(true);
    try {
      await rebuildPayslipLines(payslip.id);
      toast.success("Đã tải lại lines");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setBusy(false);
    }
  };

  const onConfirm = async () => {
    setBusy(true);
    try {
      await confirmPayslip(payslip.id, adminMessage.trim() || null);
      toast.success("Đã chốt payslip — email thông báo đã gửi GV");
      setAdminMessage("");
      setShowConfirmBox(false);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setBusy(false);
    }
  };

  const onMarkPaid = async () => {
    const ref = prompt("Mã giao dịch (tuỳ chọn):") ?? null;
    setBusy(true);
    try {
      await markPayslipPaid(payslip.id, ref);
      toast.success("Đã đánh dấu thanh toán");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-5 md:py-8 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/payroll")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Bảng lương
        </Button>
        <PayrollPayslipStatusBadge status={payslip.status} />
      </div>

      {/* Header card */}
      <div className="rounded-2xl bg-card border border-border p-5 shadow-card">
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <Banknote className="h-3.5 w-3.5" />
          <span>Payslip</span>
        </div>
        <h1 className="text-xl font-semibold mt-0.5">
          {teacher.full_name} · Tháng {formatMonth(payslip.month_start)}
        </h1>
        <div className="text-sm text-muted-foreground mt-1">{teacher.email}</div>
        <div className="mt-4">
          <StatusTimeline steps={timeline} />
        </div>
        {payslip.admin_message && payslip.status !== "draft" && (
          <div className="mt-4 rounded-md bg-amber-50 border border-amber-200 text-amber-900 px-3 py-2 text-sm">
            <strong>Ghi chú khi chốt:</strong> {payslip.admin_message}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Totals strip */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-card border border-border px-3 py-3 shadow-sm">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Gross</div>
              <div className="text-lg font-semibold mt-0.5">{formatVnd(payslip.gross_amount_vnd)}</div>
            </div>
            <div className="rounded-xl bg-card border border-border px-3 py-3 shadow-sm">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Điều chỉnh</div>
              <div className={`text-lg font-semibold mt-0.5 ${payslip.adjustments_total_vnd < 0 ? "text-rose-600" : payslip.adjustments_total_vnd > 0 ? "text-emerald-700" : ""}`}>
                {payslip.adjustments_total_vnd === 0 ? "0 VNĐ" : formatVnd(payslip.adjustments_total_vnd)}
              </div>
            </div>
            <div className="rounded-xl bg-primary/5 border border-primary/20 px-3 py-3 shadow-sm">
              <div className="text-[10px] uppercase tracking-wide text-primary/80">Net</div>
              <div className="text-lg font-bold mt-0.5 text-primary">{formatVnd(payslip.net_amount_vnd)}</div>
            </div>
          </div>

          {/* Lines */}
          <div className="rounded-2xl bg-card border border-border p-5 shadow-card">
            <h2 className="font-semibold mb-3 text-sm">Chi tiết buổi dạy ({lines.length})</h2>
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Lớp</TableHead>
                    <TableHead className="text-right">Giờ dạy</TableHead>
                    <TableHead className="text-right">Đơn giá</TableHead>
                    <TableHead className="w-[80px]">Đơn vị</TableHead>
                    <TableHead className="text-right">Thành tiền</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-sm">
                        Chưa có dòng buổi dạy nào.
                      </TableCell>
                    </TableRow>
                  )}
                  {lines.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-mono text-xs">{formatDate(l.entry_date)}</TableCell>
                      <TableCell className="font-medium">{l.class_name_snapshot ?? "—"}</TableCell>
                      <TableCell className="text-right">{formatHours(l.duration_minutes)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatVnd(l.rate_amount_vnd)}</TableCell>
                      <TableCell className="text-xs uppercase text-muted-foreground">{l.rate_unit ?? "—"}</TableCell>
                      <TableCell className="text-right font-medium">{formatVnd(l.line_amount_vnd)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Adjustments */}
          <div className="rounded-2xl bg-card border border-border p-5 shadow-card">
            <h2 className="font-semibold mb-3 text-sm">Khoản điều chỉnh</h2>
            <PayrollAdjustmentsEditor
              payslipId={payslip.id}
              adjustments={adjustments}
              readOnly={!isDraft}
              onMutated={refresh}
            />
            {!isDraft && adjustments.length > 0 && (
              <p className="text-xs text-muted-foreground mt-3">
                Payslip đã rời trạng thái Bản nháp — không thể chỉnh sửa adjustments. Mở lại bằng cách
                tạo payslip mới hoặc rebuild lines (chỉ có với draft).
              </p>
            )}
          </div>
        </div>

        {/* Sticky sidebar */}
        <div className="space-y-4 lg:sticky lg:top-4 self-start">
          <div className="rounded-2xl bg-card border border-border p-4 shadow-card space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">Thao tác</div>
            {isDraft && (
              <Button
                variant="outline" size="sm" className="w-full justify-start"
                disabled={busy} onClick={onRebuild}
              >
                <RotateCcw className="h-4 w-4 mr-1" /> Rebuild lines
              </Button>
            )}
            {canConfirm && (
              <Button
                size="sm" className="w-full justify-start"
                disabled={busy} onClick={() => setShowConfirmBox((v) => !v)}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" /> Chốt payslip
              </Button>
            )}
            {canMarkPaid && (
              <Button size="sm" className="w-full justify-start" disabled={busy} onClick={onMarkPaid}>
                <Wallet className="h-4 w-4 mr-1" /> Đánh dấu đã thanh toán
              </Button>
            )}
            {showConfirmBox && (
              <div className="space-y-2 pt-2">
                <Textarea
                  placeholder="Ghi chú gửi giáo viên (tuỳ chọn)…"
                  value={adminMessage}
                  onChange={(e) => setAdminMessage(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowConfirmBox(false)}>Huỷ</Button>
                  <Button size="sm" disabled={busy} onClick={onConfirm}>Chốt</Button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-card border border-border p-4 shadow-card text-xs space-y-1">
            <div className="font-semibold text-muted-foreground mb-1">Lịch sử</div>
            <div>Chốt: <span className="text-muted-foreground">{formatDateTime(payslip.confirmed_at)}</span></div>
            <div>GV xác nhận: <span className="text-muted-foreground">{formatDateTime(payslip.acknowledged_at)}</span></div>
            <div>Thanh toán: <span className="text-muted-foreground">{formatDateTime(payslip.paid_at)}</span></div>
            {payslip.payment_ref && <div>Mã GD: <span className="font-mono">{payslip.payment_ref}</span></div>}
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
