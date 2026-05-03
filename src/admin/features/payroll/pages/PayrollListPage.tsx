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
import { Progress } from "@shared/components/ui/progress";
import { cn } from "@shared/lib/utils";
import {
  Banknote, FilePlus2, Loader2, Search, Download, Clock, CheckCircle,
  ChevronLeft, ChevronRight, Eye, FileText, Filter, Grid3X3, List,
} from "lucide-react";
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

// Mock data cho enhanced UI
const MOCK_PAYROLL = [
  { name: "Ms. Linh Trần", role: "Senior · IELTS 8.5", color: "rose", hours: 78, rate: 320, classes: 6, attendance: 98, bonus: 2_400_000, deduction: 0, status: "pending", id: "P-026", avatarInit: "L" },
  { name: "Mr. James Park", role: "Native · CELTA", color: "amber", hours: 42, rate: 450, classes: 4, attendance: 100, bonus: 3_200_000, deduction: 0, status: "pending", id: "P-027", avatarInit: "J" },
  { name: "Ms. Dung Phạm", role: "Senior · IELTS 8.0", color: "violet", hours: 84, rate: 280, classes: 7, attendance: 96, bonus: 1_800_000, deduction: 0, status: "pending", id: "P-028", avatarInit: "D" },
  { name: "Mr. Khoa Nguyễn", role: "Mid · IELTS 7.5", color: "teal", hours: 72, rate: 280, classes: 5, attendance: 99, bonus: 1_600_000, deduction: 0, status: "pending", id: "P-029", avatarInit: "K" },
  { name: "Mr. Tuấn Lê", role: "Junior · IELTS 7.0", color: "sky", hours: 36, rate: 250, classes: 3, attendance: 94, bonus: 0, deduction: 200_000, status: "pending", id: "P-030", avatarInit: "T" },
  { name: "Ms. Hà Vũ", role: "Junior · IELTS 7.0", color: "amber", hours: 24, rate: 200, classes: 2, attendance: 92, bonus: 0, deduction: 0, status: "pending", id: "P-031", avatarInit: "H" },
];

const COLOR_MAP: Record<string, string> = {
  rose: "bg-rose-500",
  amber: "bg-amber-400",
  violet: "bg-violet-500",
  teal: "bg-teal-500",
  sky: "bg-sky-500",
};

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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState("current");
  const [view, setView] = useState<"cards" | "table">("cards");

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

  // Enhanced calculations
  const totalBase = MOCK_PAYROLL.reduce((a, p) => a + p.hours * p.rate * 1000, 0);
  const totalBonus = MOCK_PAYROLL.reduce((a, p) => a + p.bonus, 0);
  const totalDed = MOCK_PAYROLL.reduce((a, p) => a + p.deduction, 0);
  const totalNet = totalBase + totalBonus - totalDed;
  const totalHours = MOCK_PAYROLL.reduce((a, p) => a + p.hours, 0);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === MOCK_PAYROLL.length) setSelected(new Set());
    else setSelected(new Set(MOCK_PAYROLL.map(p => p.id)));
  };

  const selectedTotal = MOCK_PAYROLL.filter(p => selected.has(p.id))
    .reduce((a, p) => a + p.hours * p.rate * 1000 + p.bonus - p.deduction, 0);

  return (
    <ListPageLayout
      title="Bảng lương giáo viên"
      subtitle="Chu kỳ 01 → 30 Apr · quản lý lương, thưởng, khấu trừ và trạng thái thanh toán"
      icon={Banknote}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Reload từ Timesheet
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export Excel
          </Button>
          <Button size="sm" onClick={onCreateBatch} disabled={creating || !monthFilter} className="gap-1.5">
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
            Duyệt & chi
          </Button>
        </div>
      }
      filterBar={
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Tìm giáo viên..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-9 w-9">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-display font-bold text-lg">Tháng 4 / 2026</span>
            <Button variant="outline" size="icon" className="h-9 w-9">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      }
    >
      {/* Enhanced Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hero Total Card */}
        <div className="rounded-2xl border-2 border-slate-800 bg-gradient-to-br from-rose-500 via-orange-400 to-amber-400 p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
          <p className="text-[11px] font-bold uppercase tracking-wider opacity-90">Tổng chi kỳ này</p>
          <div className="font-display text-4xl font-extrabold mt-2">{formatVnd(totalNet)}</div>
          <div className="flex gap-6 mt-4 text-sm">
            <div>
              <p className="text-[10px] uppercase opacity-80">So với T3</p>
              <p className="font-mono font-bold">+12.4%</p>
            </div>
            <div>
              <p className="text-[10px] uppercase opacity-80">Rate TB</p>
              <p className="font-mono font-bold">297k/h</p>
            </div>
            <div>
              <p className="text-[10px] uppercase opacity-80">Hạn duyệt</p>
              <p className="font-mono font-bold">2d 4h</p>
            </div>
          </div>
        </div>

        {/* Breakdown Card */}
        <div className="rounded-xl border-2 bg-card p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Cấu trúc lương</p>
          <h3 className="font-display font-bold mb-3">Cơ bản · Thưởng · Trừ</h3>
          {/* Stacked bar */}
          <div className="flex h-7 rounded-lg overflow-hidden border-2 mb-3">
            <div className="bg-rose-500 flex items-center justify-center text-white text-[10px] font-bold" style={{ flex: totalBase }}>
              {Math.round(totalBase/totalNet*100)}%
            </div>
            <div className="bg-teal-500 flex items-center justify-center text-white text-[10px] font-bold" style={{ flex: totalBonus }}>
              {Math.round(totalBonus/totalNet*100)}%
            </div>
            {totalDed > 0 && (
              <div className="bg-slate-800 flex items-center justify-center text-white text-[10px] font-bold" style={{ flex: totalDed * 4 }}>
                −
              </div>
            )}
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-rose-500 border" />
                Lương cơ bản
              </span>
              <span className="font-mono font-bold">{formatVnd(totalBase)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-teal-500 border" />
                Thưởng + phụ cấp
              </span>
              <span className="font-mono font-bold text-teal-600">+{formatVnd(totalBonus)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-slate-800 border" />
                Khấu trừ / phạt
              </span>
              <span className="font-mono font-bold text-rose-600">−{formatVnd(totalDed)}</span>
            </div>
          </div>
        </div>

        {/* Status Pipeline */}
        <div className="rounded-xl border-2 bg-card p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Trạng thái duyệt</p>
          <h3 className="font-display font-bold mb-3">Pipeline tháng 4</h3>
          <div className="space-y-3">
            {[
              { l: "Đã chuẩn bị", n: 6, color: "bg-teal-500", pct: 100 },
              { l: "Chờ duyệt", n: 6, color: "bg-amber-400", pct: 100 },
              { l: "Đã duyệt", n: 0, color: "bg-rose-500", pct: 0 },
              { l: "Đã chi", n: 0, color: "bg-violet-500", pct: 0 },
            ].map(s => (
              <div key={s.l}>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>{s.l}</span>
                  <span className="font-mono">{s.n}/{MOCK_PAYROLL.length}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden border">
                  <div className={cn("h-full", s.color)} style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selection Bar */}
      {selected.size > 0 && (
        <div className="bg-slate-800 text-white rounded-xl p-3 flex items-center gap-3">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm font-bold">
            Đã chọn <span className="font-mono">{selected.size}</span> giáo viên · tổng <span className="font-mono">{formatVnd(selectedTotal)}</span>
          </span>
          <div className="flex-1" />
          <Button variant="outline" size="sm" className="border-white text-white hover:bg-white/10">Tải payslip PDF</Button>
          <Button size="sm" className="bg-amber-400 text-slate-900 hover:bg-amber-300">Duyệt {selected.size} mục</Button>
          <Button variant="ghost" size="icon" className="text-white" onClick={() => setSelected(new Set())}>
            <span className="sr-only">Clear</span>×
          </Button>
        </div>
      )}
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

      {/* Enhanced Payroll Cards Section */}
      <section className="space-y-4">
        {/* Tabs + View Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
            {[
              { id: "current", label: "Kỳ hiện tại", count: 6 },
              { id: "paid", label: "Đã chi", count: 24 },
              { id: "dispute", label: "Khiếu nại", count: 0 },
            ].map(t => (
              <Button
                key={t.id}
                variant={tab === t.id ? "default" : "ghost"}
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => setTab(t.id)}
              >
                {t.label}
                <span className="text-[10px] opacity-70">({t.count})</span>
              </Button>
            ))}
          </div>
          <div className="flex-1" />
          <Button variant="outline" size="sm" className="gap-1.5">
            <Filter className="h-3.5 w-3.5" /> Lọc
          </Button>
          <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
            <Button
              variant={view === "cards" ? "default" : "ghost"}
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setView("cards")}
            >
              <Grid3X3 className="h-3.5 w-3.5" /> Cards
            </Button>
            <Button
              variant={view === "table" ? "default" : "ghost"}
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setView("table")}
            >
              <List className="h-3.5 w-3.5" /> Bảng
            </Button>
          </div>
        </div>

        {/* Payroll Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {MOCK_PAYROLL.map(p => {
            const base = p.hours * p.rate * 1000;
            const total = base + p.bonus - p.deduction;
            const isSel = selected.has(p.id);

            return (
              <div
                key={p.id}
                className={cn(
                  "rounded-xl border-2 bg-card overflow-hidden transition-all",
                  isSel ? "border-rose-500 shadow-md" : "border-slate-200"
                )}
              >
                {/* Header */}
                <div className={cn(
                  "p-4 border-b-2 flex items-center gap-3",
                  isSel ? "bg-rose-50" : "bg-white"
                )}>
                  <input
                    type="checkbox"
                    checked={isSel}
                    onChange={() => toggle(p.id)}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-base font-bold text-white border-2 border-slate-800",
                      COLOR_MAP[p.color] || "bg-slate-500"
                    )}
                  >
                    {p.avatarInit}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-sm truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.role} · <code>{p.id}</code></div>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    {p.status}
                  </span>
                </div>

                {/* Total */}
                <div className="p-4 pb-2">
                  <div className="font-mono text-2xl font-extrabold">{formatVnd(total)}</div>
                  <div className="text-[10px] font-bold uppercase text-muted-foreground">Lương kỳ này</div>
                </div>

                {/* Breakdown */}
                <div className="px-4 py-2 space-y-1 text-xs">
                  <div className="flex justify-between py-1 border-b border-dashed">
                    <span className="font-medium">Giảng dạy ({p.hours}h × {p.rate}k)</span>
                    <span className="font-mono font-bold">{formatVnd(base)}</span>
                  </div>
                  {p.bonus > 0 && (
                    <div className="flex justify-between py-1 border-b border-dashed">
                      <span className="font-medium">Thưởng KPI</span>
                      <span className="font-mono font-bold text-teal-600">+{formatVnd(p.bonus)}</span>
                    </div>
                  )}
                  {p.deduction > 0 && (
                    <div className="flex justify-between py-1 border-b border-dashed">
                      <span className="font-medium">Khấu trừ</span>
                      <span className="font-mono font-bold text-rose-600">−{formatVnd(p.deduction)}</span>
                    </div>
                  )}
                </div>

                {/* Meta strip */}
                <div className="grid grid-cols-3 gap-0 p-4 bg-muted/30 border-t-2">
                  <div className="text-center">
                    <div className="font-mono font-bold text-lg">{p.classes}</div>
                    <div className="text-[9px] font-bold uppercase text-muted-foreground">Lớp</div>
                  </div>
                  <div className="text-center">
                    <div className="font-mono font-bold text-lg">{p.hours}h</div>
                    <div className="text-[9px] font-bold uppercase text-muted-foreground">Đã giảng</div>
                  </div>
                  <div className="text-center">
                    <div className={cn(
                      "font-mono font-bold text-lg",
                      p.attendance >= 98 ? "text-teal-600" : p.attendance >= 95 ? "text-amber-600" : "text-rose-600"
                    )}>
                      {p.attendance}%
                    </div>
                    <div className="text-[9px] font-bold uppercase text-muted-foreground">Att.</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 p-3 border-t">
                  <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs">
                    <Eye className="h-3 w-3" /> Chi tiết
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs">
                    <FileText className="h-3 w-3" /> Payslip
                  </Button>
                  <Button size="sm" className="flex-1 gap-1 text-xs">
                    <CheckCircle className="h-3 w-3" /> Duyệt
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Compact totals */}
        <div className="bg-slate-800 text-white rounded-xl p-4 grid grid-cols-5 gap-4 items-center">
          <div>
            <div className="text-[10px] uppercase opacity-70">Tổng cộng</div>
            <div className="font-display font-bold">{MOCK_PAYROLL.length} giáo viên</div>
          </div>
          <div>
            <div className="text-[10px] uppercase opacity-70">Giờ giảng</div>
            <div className="font-mono font-bold text-lg">{totalHours}h</div>
          </div>
          <div>
            <div className="text-[10px] uppercase opacity-70">Cơ bản</div>
            <div className="font-mono font-bold">{formatVnd(totalBase)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase opacity-70">+/−</div>
            <div className="font-mono font-bold text-amber-400">+{formatVnd(totalBonus - totalDed)}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase opacity-70">Tổng chi</div>
            <div className="font-mono font-bold text-xl text-amber-400">{formatVnd(totalNet)}</div>
          </div>
        </div>
      </section>

      {/* Payslips section - original */}
      <section className="space-y-2 mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Payslips (Data từ hệ thống)
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
