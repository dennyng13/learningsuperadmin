import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Wallet, ExternalLink, Banknote, Clock, TrendingUp, CalendarRange, X, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@shared/components/ui/button";
import { Card } from "@shared/components/ui/card";
import { Skeleton } from "@shared/components/ui/skeleton";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

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
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState<number>(0); // 0-indexed

  const { data, isLoading, isFetching, error } = useQuery({
    // classId + date range tham gia queryKey → mỗi lần đổi sẽ refetch.
    // placeholderData = keepPreviousData → giữ rows cũ, hiện skeleton overlay
    // thay vì xoá sạch UI gây nhảy layout.
    queryKey: ["class-payroll", classId, dateFrom, dateTo],
    queryFn: async (): Promise<PayrollRow[]> => {
      let q = (supabase as any)
        .from("v_class_teacher_payroll" as any)
        .select("*")
        .eq("class_id", classId);
      if (dateFrom) q = q.gte("last_session_at", dateFrom);
      if (dateTo) q = q.lte("last_session_at", `${dateTo}T23:59:59`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PayrollRow[];
    },
    enabled: !!classId,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  // Reset về trang 0 khi đổi filter / class — tránh "trang 5 của 1 trang".
  useEffect(() => {
    setPage(0);
  }, [classId, dateFrom, dateTo, pageSize]);

  const hasFilter = !!(dateFrom || dateTo);
  const clearFilter = () => { setDateFrom(""); setDateTo(""); };

  /* ─── Filter bar (luôn render, kể cả khi loading lần đầu) ─── */
  const filterBar = (
    <Card className="p-3">
      <div className="flex items-end gap-2 flex-wrap">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <CalendarRange className="h-3 w-3" /> Từ ngày
          </Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            max={dateTo || undefined}
            disabled={isFetching && !data}
            className="h-8 w-[150px] text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Đến ngày</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            min={dateFrom || undefined}
            disabled={isFetching && !data}
            className="h-8 w-[150px] text-xs"
          />
        </div>
        {hasFilter && (
          <Button variant="ghost" size="sm" onClick={clearFilter} className="h-8 gap-1 text-xs">
            <X className="h-3 w-3" /> Xoá lọc
          </Button>
        )}
        {isFetching && data && (
          <span className="text-[11px] text-muted-foreground ml-auto animate-pulse">
            Đang tải lại…
          </span>
        )}
      </div>
    </Card>
  );

  /* ─── Skeleton results (3 cards + 3 rows) ─── */
  const resultsSkeleton = (
    <>
      <div className="grid gap-3 grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="p-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-7 rounded-lg" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-6 w-24" />
          </Card>
        ))}
      </div>
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="bg-muted/40 px-4 py-2.5 flex gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-3 flex-1" />
          ))}
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="border-t px-4 py-3 flex items-center gap-4">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </>
  );

  // Lần fetch đầu (chưa có data nào) → full skeleton.
  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Đang tải bảng lương">
        {filterBar}
        {resultsSkeleton}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        {filterBar}
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Không tải được dữ liệu lương: {(error as Error).message}
        </div>
      </div>
    );
  }

  const rows = data ?? [];

  if (rows.length === 0) {
    return (
      <div className="space-y-4">
        {filterBar}
        <div className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center space-y-2">
          <Wallet className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {hasFilter
              ? "Không có dữ liệu lương trong khoảng thời gian đã chọn."
              : "Chưa có dữ liệu lương — lớp chưa có buổi học hoàn thành."}
          </p>
        </div>
      </div>
    );
  }

  const total = rows.reduce((s, r) => s + Number(r.total_payable_vnd ?? 0), 0);
  const totalSessions = rows.reduce((s, r) => s + Number(r.sessions_taught ?? 0), 0);
  const totalHours = rows.reduce((s, r) => s + Number(r.hours_taught ?? 0), 0);

  /* ─── Pagination (client-side) ─── */
  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const fromIdx = totalRows === 0 ? 0 : safePage * pageSize + 1;
  const toIdx = Math.min(totalRows, safePage * pageSize + pageSize);
  const pagedRows = useMemo(
    () => rows.slice(safePage * pageSize, safePage * pageSize + pageSize),
    [rows, safePage, pageSize],
  );
  // Reserve chiều cao tbody = pageSize × ~41px để layout không nhảy khi
  // trang cuối thiếu rows hoặc khi đổi pageSize.
  const reservedMinHeight = pageSize * 41;

  return (
    <div className="space-y-4">
      {filterBar}
      {/* Khi đang refetch (đổi filter) — fade nhẹ + pulse để báo hiệu data sắp đổi.
          aria-busy giúp screen reader nhận biết. */}
      <div
        className={`space-y-4 transition-opacity ${isFetching ? "opacity-60 animate-pulse" : "opacity-100"}`}
        aria-busy={isFetching}
      >
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
          <tbody style={{ minHeight: reservedMinHeight }}>
            {pagedRows.map((r) => (
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
            {/* Filler rows giữ chiều cao bảng cố định khi trang cuối ít hơn pageSize. */}
            {pagedRows.length < pageSize &&
              Array.from({ length: pageSize - pagedRows.length }).map((_, i) => (
                <tr key={`filler-${i}`} className="border-t" aria-hidden>
                  <td className="px-4 py-2.5">&nbsp;</td>
                  <td /><td /><td /><td /><td />
                </tr>
              ))}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/30 font-semibold">
              <td className="px-4 py-2.5" colSpan={4}>
                Tổng cộng <span className="font-normal text-muted-foreground">(toàn bộ)</span>
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">{fmtVND(total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      {/* Pagination footer */}
      <div className="border-t bg-muted/20 px-4 py-2 flex items-center justify-between gap-3 text-xs text-muted-foreground flex-wrap">
        <div className="flex items-center gap-2">
          <span className="tabular-nums">
            {fromIdx}–{toIdx} / {totalRows}
          </span>
          <span className="opacity-50">·</span>
          <span>Hiển thị</span>
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="h-7 w-[68px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>dòng / trang</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost" size="sm" className="h-7 px-2"
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Trước
          </Button>
          <span className="px-2 tabular-nums">{safePage + 1} / {totalPages}</span>
          <Button
            variant="ghost" size="sm" className="h-7 px-2"
            disabled={safePage + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
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
    </div>
  );
}