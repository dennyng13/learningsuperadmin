import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ListPageLayout } from "@shared/components/layouts";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@shared/components/ui/table";
import { Banknote, FilePlus2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import {
  usePayrollBatchList,
  usePayrollPayslipList,
  createBatchForMonth,
} from "../hooks/usePayroll";
import PayrollBatchStatusBadge from "../components/PayrollBatchStatusBadge";
import PayrollPayslipStatusBadge from "../components/PayrollPayslipStatusBadge";
import {
  PAYROLL_BATCH_STATUS_LABELS,
  PAYROLL_PAYSLIP_STATUS_LABELS,
  type PayrollBatchStatus,
  type PayrollPayslipStatus,
} from "../types";
import { formatDateTime, formatMonth, formatVnd } from "../utils/format";
import EmptyState from "@shared/components/EmptyState";

function currentMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

const BATCH_STATUS_OPTIONS: Array<{ value: PayrollBatchStatus | "all"; label: string }> = [
  { value: "all", label: "Tất cả trạng thái" },
  ...Object.entries(PAYROLL_BATCH_STATUS_LABELS).map(([v, label]) => ({
    value: v as PayrollBatchStatus, label,
  })),
];

const PAYSLIP_STATUS_OPTIONS: Array<{ value: PayrollPayslipStatus | "all"; label: string }> = [
  { value: "all", label: "Tất cả trạng thái" },
  ...Object.entries(PAYROLL_PAYSLIP_STATUS_LABELS).map(([v, label]) => ({
    value: v as PayrollPayslipStatus, label,
  })),
];

export default function PayrollListPage() {
  const navigate = useNavigate();
  const [monthFilter, setMonthFilter] = useState<string>(currentMonthStart());
  const [batchStatus, setBatchStatus] = useState<PayrollBatchStatus | "all">("all");
  const [payslipStatus, setPayslipStatus] = useState<PayrollPayslipStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: batches, loading: batchesLoading, error: batchesErr, refresh: refreshBatches } =
    usePayrollBatchList({ monthStart: monthFilter || null, status: batchStatus });

  const { data: payslips, loading: payslipsLoading, error: payslipsErr } =
    usePayrollPayslipList({ monthStart: monthFilter || null, status: payslipStatus });

  const filteredPayslips = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return payslips;
    return payslips.filter((row) =>
      (row.teacher_full_name ?? "").toLowerCase().includes(q),
    );
  }, [payslips, query]);

  const monthOptions = useMemo(() => {
    const now = new Date();
    const opts: Array<{ value: string; label: string }> = [{ value: "", label: "Tất cả tháng" }];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      opts.push({ value, label: `Tháng ${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}` });
    }
    return opts;
  }, []);

  const onCreateBatch = async () => {
    if (!monthFilter) {
      toast.error("Chọn tháng cụ thể trước khi tạo đợt lương");
      return;
    }
    setCreating(true);
    try {
      const id = await createBatchForMonth(monthFilter);
      toast.success("Đã tạo đợt lương + payslips từ các kỳ đã khoá");
      await refreshBatches();
      navigate(`/payroll/batches/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không tạo được");
    } finally {
      setCreating(false);
    }
  };

  return (
    <ListPageLayout
      title="Bảng lương"
      subtitle="Tạo đợt lương theo tháng từ các kỳ đã khoá, chốt và đánh dấu thanh toán"
      icon={Banknote}
      actions={
        <Button size="sm" onClick={onCreateBatch} disabled={creating || !monthFilter}>
          {creating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FilePlus2 className="h-4 w-4 mr-1" />}
          Tạo đợt lương cho tháng
        </Button>
      }
      filterBar={
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên giáo viên (ở danh sách payslip)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Select value={monthFilter || "__all__"} onValueChange={(v) => setMonthFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-[170px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m.value || "__all__"} value={m.value || "__all__"}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      {/* Batches section */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Đợt lương theo tháng
          </h2>
          <Select value={batchStatus} onValueChange={(v) => setBatchStatus(v as PayrollBatchStatus | "all")}>
            <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {BATCH_STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {batchesLoading && (
          <div className="rounded-md bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 inline animate-spin mr-2" /> Đang tải đợt lương…
          </div>
        )}
        {!batchesLoading && batchesErr && (
          <div className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm">{batchesErr}</div>
        )}
        {!batchesLoading && !batchesErr && batches.length === 0 && (
          <EmptyState
            icon={Banknote}
            title="Chưa có đợt lương nào trong bộ lọc này"
            description="Khoá kỳ ở Bảng công rồi bấm 'Tạo đợt lương cho tháng' để tạo payslips hàng loạt."
          />
        )}
        {!batchesLoading && !batchesErr && batches.length > 0 && (
          <div className="rounded-md border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tháng</TableHead>
                  <TableHead className="text-right">Số payslip</TableHead>
                  <TableHead className="text-right">Tổng net</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Tạo lúc</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((row) => (
                  <TableRow
                    key={row.batch.id}
                    className="cursor-pointer hover:bg-accent/40"
                    onClick={() => navigate(`/payroll/batches/${row.batch.id}`)}
                  >
                    <TableCell className="font-mono text-xs">{formatMonth(row.batch.month_start)}</TableCell>
                    <TableCell className="text-right">{row.payslip_count}</TableCell>
                    <TableCell className="text-right font-medium">{formatVnd(row.total_net_vnd)}</TableCell>
                    <TableCell><PayrollBatchStatusBadge status={row.batch.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(row.batch.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Payslips section */}
      <section className="space-y-2 mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Payslips
          </h2>
          <Select value={payslipStatus} onValueChange={(v) => setPayslipStatus(v as PayrollPayslipStatus | "all")}>
            <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAYSLIP_STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {payslipsLoading && (
          <div className="rounded-md bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 inline animate-spin mr-2" /> Đang tải payslip…
          </div>
        )}
        {!payslipsLoading && payslipsErr && (
          <div className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm">{payslipsErr}</div>
        )}
        {!payslipsLoading && !payslipsErr && filteredPayslips.length === 0 && (
          <EmptyState
            icon={Banknote}
            title="Chưa có payslip nào trong bộ lọc này"
            description="Tạo đợt lương cho tháng đã khoá hoặc tạo payslip lẻ từ trang chi tiết bảng công."
          />
        )}
        {!payslipsLoading && !payslipsErr && filteredPayslips.length > 0 && (
          <div className="rounded-md border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Giáo viên</TableHead>
                  <TableHead>Tháng</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Điều chỉnh</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Cập nhật</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayslips.map((row) => (
                  <TableRow
                    key={row.payslip.id}
                    className="cursor-pointer hover:bg-accent/40"
                    onClick={() => navigate(`/payroll/payslips/${row.payslip.id}`)}
                  >
                    <TableCell className="font-medium">{row.teacher_full_name}</TableCell>
                    <TableCell className="font-mono text-xs">{formatMonth(row.payslip.month_start)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatVnd(row.payslip.gross_amount_vnd)}</TableCell>
                    <TableCell className={`text-right font-mono text-xs ${row.payslip.adjustments_total_vnd < 0 ? "text-rose-600" : row.payslip.adjustments_total_vnd > 0 ? "text-emerald-700" : ""}`}>
                      {row.payslip.adjustments_total_vnd === 0 ? "—" : formatVnd(row.payslip.adjustments_total_vnd)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatVnd(row.payslip.net_amount_vnd)}</TableCell>
                    <TableCell><PayrollPayslipStatusBadge status={row.payslip.status} /></TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatDateTime(row.payslip.updated_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </ListPageLayout>
  );
}
