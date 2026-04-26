import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@shared/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@shared/components/ui/table";
import {
  AlertCircle, ArrowLeft, Banknote, CheckCircle2, ChevronRight, Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  usePayrollBatchDetail, confirmBatch, markBatchPaid,
} from "../hooks/usePayroll";
import PayrollBatchStatusBadge from "../components/PayrollBatchStatusBadge";
import PayrollPayslipStatusBadge from "../components/PayrollPayslipStatusBadge";
import DetailSkeleton from "@shared/components/DetailSkeleton";
import EmptyState from "@shared/components/EmptyState";
import { formatDateTime, formatMonth, formatVnd } from "../utils/format";

export default function PayrollBatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const { data, loading, error, refresh } = usePayrollBatchDetail(batchId);
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
          {error || "Không tìm thấy đợt lương"}
        </div>
      </div>
    );
  }

  const batch = data.batch;
  const totalNet = data.payslips.reduce((sum, p) => sum + p.payslip.net_amount_vnd, 0);
  const draftCount = data.payslips.filter((p) => p.payslip.status === "draft").length;
  const readyToPayCount = data.payslips.filter(
    (p) => p.payslip.status === "confirmed" || p.payslip.status === "teacher_acknowledged",
  ).length;
  const canConfirm = draftCount > 0 && batch.status === "draft";
  const canMarkPaid =
    readyToPayCount > 0 && (batch.status === "confirmed" || batch.status === "draft");

  const onConfirm = async () => {
    if (!confirm(`Chốt ${draftCount} payslip ở trạng thái Bản nháp?`)) return;
    setBusy(true);
    try {
      const n = await confirmBatch(batch.id);
      toast.success(`Đã chốt ${n} payslip`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setBusy(false);
    }
  };

  const onMarkPaid = async () => {
    const ref = prompt("Mã giao dịch (tuỳ chọn, áp dụng cho tất cả payslip còn lại):") ?? null;
    setBusy(true);
    try {
      const n = await markBatchPaid(batch.id, ref);
      toast.success(`Đã đánh dấu ${n} payslip là đã thanh toán`);
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
        <PayrollBatchStatusBadge status={batch.status} />
      </div>

      {/* Header card */}
      <div className="rounded-2xl bg-card border border-border p-5 shadow-card">
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <Banknote className="h-3.5 w-3.5" />
          <span>Đợt lương tháng</span>
        </div>
        <h1 className="text-xl font-semibold mt-0.5">
          Tháng {formatMonth(batch.month_start)}
        </h1>
        <div className="text-sm text-muted-foreground mt-1">
          {data.payslips.length} payslip · Tổng net{" "}
          <strong className="text-foreground">{formatVnd(totalNet)}</strong>
        </div>
        {batch.admin_notes && (
          <div className="mt-3 rounded-md bg-muted/40 px-3 py-2 text-sm">{batch.admin_notes}</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">
          {data.payslips.length === 0 ? (
            <EmptyState
              icon={Banknote}
              title="Đợt lương này chưa có payslip"
              description="Đợt được tạo nhưng chưa có kỳ bảng công nào ở trạng thái 'Đã khoá' để generate."
            />
          ) : (
            <div className="rounded-md border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Giáo viên</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Điều chỉnh</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.payslips.map((row) => (
                    <TableRow
                      key={row.payslip.id}
                      className="cursor-pointer hover:bg-accent/40"
                      onClick={() => navigate(`/payroll/payslips/${row.payslip.id}`)}
                    >
                      <TableCell className="font-medium">{row.teacher_full_name}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatVnd(row.payslip.gross_amount_vnd)}</TableCell>
                      <TableCell className={`text-right font-mono text-xs ${row.payslip.adjustments_total_vnd < 0 ? "text-rose-600" : row.payslip.adjustments_total_vnd > 0 ? "text-emerald-700" : ""}`}>
                        {row.payslip.adjustments_total_vnd === 0 ? "—" : formatVnd(row.payslip.adjustments_total_vnd)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatVnd(row.payslip.net_amount_vnd)}</TableCell>
                      <TableCell><PayrollPayslipStatusBadge status={row.payslip.status} /></TableCell>
                      <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Sticky sidebar */}
        <div className="space-y-4 lg:sticky lg:top-4 self-start">
          <div className="rounded-2xl bg-card border border-border p-4 shadow-card space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">Thao tác hàng loạt</div>
            <Button
              size="sm" className="w-full justify-start"
              disabled={busy || !canConfirm}
              onClick={onConfirm}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Chốt tất cả nháp ({draftCount})
            </Button>
            <Button
              variant={canMarkPaid ? "default" : "outline"}
              size="sm" className="w-full justify-start"
              disabled={busy || !canMarkPaid}
              onClick={onMarkPaid}
            >
              <Wallet className="h-4 w-4 mr-1" />
              Đánh dấu đã thanh toán ({readyToPayCount})
            </Button>
          </div>

          <div className="rounded-2xl bg-card border border-border p-4 shadow-card text-xs space-y-1">
            <div className="font-semibold text-muted-foreground mb-1">Lịch sử</div>
            <div>Tạo: <span className="text-muted-foreground">{formatDateTime(batch.created_at)}</span></div>
            <div>Chốt: <span className="text-muted-foreground">{formatDateTime(batch.confirmed_at)}</span></div>
            <div>TT: <span className="text-muted-foreground">{formatDateTime(batch.paid_at)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
