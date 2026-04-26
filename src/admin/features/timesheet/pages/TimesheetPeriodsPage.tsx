import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ListPageLayout } from "@shared/components/layouts";
import { Input } from "@shared/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@shared/components/ui/table";
import { CalendarClock, Loader2, Search } from "lucide-react";
import { useTimesheetPeriodList } from "../hooks/useTimesheet";
import TimesheetPeriodStatusBadge from "../components/TimesheetPeriodStatusBadge";
import {
  TIMESHEET_PERIOD_STATUS_LABELS,
  type TimesheetPeriodStatus,
} from "../types";

const STATUS_OPTIONS: Array<{ value: TimesheetPeriodStatus | "all"; label: string }> = [
  { value: "all", label: "Tất cả trạng thái" },
  ...Object.entries(TIMESHEET_PERIOD_STATUS_LABELS).map(([v, label]) => ({
    value: v as TimesheetPeriodStatus,
    label,
  })),
];

function currentMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function formatMonth(iso: string) {
  const [y, m] = iso.split("-");
  return `${m}/${y}`;
}

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatHours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}p`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export default function TimesheetPeriodsPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<TimesheetPeriodStatus | "all">("all");
  const [monthFilter, setMonthFilter] = useState<string>(currentMonthStart());
  const [query, setQuery] = useState("");

  const { data, loading, error } = useTimesheetPeriodList({
    status: statusFilter,
    monthStart: monthFilter || null,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((row) =>
      (row.teacher_full_name ?? "").toLowerCase().includes(q),
    );
  }, [data, query]);

  // Build last 12 month options
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

  return (
    <ListPageLayout
      title="Bảng công"
      subtitle="Duyệt giờ dạy theo tháng và khoá kỳ chuyển sang Payroll"
      icon={CalendarClock}
      filterBar={
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên giáo viên"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Select value={monthFilter || "__all__"} onValueChange={(v) => setMonthFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-[170px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m.value || "__all__"} value={m.value || "__all__"}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as TimesheetPeriodStatus | "all")}
          >
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      {loading && (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Đang tải bảng công…
        </div>
      )}
      {!loading && error && (
        <div className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm">
          {error}
        </div>
      )}
      {!loading && !error && (
        <div className="rounded-md border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Giáo viên</TableHead>
                <TableHead>Tháng</TableHead>
                <TableHead className="text-right">Đã dạy</TableHead>
                <TableHead className="text-right">Tổng giờ</TableHead>
                <TableHead className="text-right">Chưa xác nhận</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Đã gửi</TableHead>
                <TableHead className="text-right">Cập nhật</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Chưa có bảng công nào trong bộ lọc này.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-accent/40"
                  onClick={() => navigate(`/timesheet/${row.id}`)}
                >
                  <TableCell className="font-medium">{row.teacher_full_name}</TableCell>
                  <TableCell className="font-mono text-xs">{formatMonth(row.month_start)}</TableCell>
                  <TableCell className="text-right">{row.total_taught_count}</TableCell>
                  <TableCell className="text-right">{formatHours(row.total_minutes)}</TableCell>
                  <TableCell className={`text-right ${row.pending_count > 0 ? "text-amber-600 font-semibold" : ""}`}>
                    {row.pending_count}
                  </TableCell>
                  <TableCell>
                    <TimesheetPeriodStatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(row.submitted_at)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {formatDateTime(row.updated_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </ListPageLayout>
  );
}
