import { useMemo, useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ListPageLayout } from "@shared/components/layouts/ListPageLayout";
import { Input } from "@shared/components/ui/input";
import { Button } from "@shared/components/ui/button";
import { Checkbox } from "@shared/components/ui/checkbox";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@shared/components/ui/popover";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@shared/components/ui/table";
import { ScrollArea } from "@shared/components/ui/scroll-area";
import {
  GraduationCap, Search, Filter, RotateCw, LayoutGrid, List as ListIcon,
  Plus, ArrowUpDown, Inbox, User, Users, Calendar, Loader2, MoreHorizontal,
  Archive, ArchiveRestore,
} from "lucide-react";
import ClassStatusBadge, {
  CLASS_STATUS_META, CLASS_STATUS_OPTIONS, type ClassLifecycleStatus,
} from "@shared/components/admin/ClassStatusBadge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@shared/components/ui/alert-dialog";
import { Textarea } from "@shared/components/ui/textarea";
import { useArchiveClass } from "@admin/features/classes/hooks/useArchiveClass";
import { cn } from "@shared/lib/utils";
import { getLevelColor } from "@shared/utils/levelColors";

/* ─────────── Types ─────────── */

interface ClassRow {
  id: string;
  name: string | null;
  /** Hệ thống cũ: trước khi migration backbone backfill `name`, vẫn còn `class_name`. */
  class_name?: string | null;
  class_code: string | null;
  program: string | null;
  level: string | null;
  branch: string | null;
  mode: string | null;
  start_date: string | null;
  end_date: string | null;
  schedule: string | null;
  room: string | null;
  teacher_name: string | null;
  student_count: number | null;
  data_source: string | null;
  lifecycle_status: ClassLifecycleStatus | null;
  cancellation_reason: string | null;
  status_changed_at: string | null;
}

/** Lấy tên hiển thị an toàn — fallback sang cột cũ để UI không trắng
 *  khi migration backbone chưa backfill xong. */
function displayName(cls: ClassRow): string {
  return cls.name ?? cls.class_name ?? "(không tên)";
}

type SortKey = "start_date" | "name" | "status_changed_at";
type SortDir = "asc" | "desc";
type ViewMode = "table" | "grid";

/** Status hiển thị mặc định khi filter "Tất cả". `archived` tách riêng để
 *  tránh làm rối list — admin phải chủ động click chip để xem lớp đã lưu trữ. */
const DEFAULT_VISIBLE_STATUSES: ClassLifecycleStatus[] =
  CLASS_STATUS_OPTIONS.filter((s) => s !== "archived");

/* ─────────── URL state helpers ─────────── */

function parseStatuses(raw: string | null): ClassLifecycleStatus[] {
  if (!raw) return DEFAULT_VISIBLE_STATUSES;
  const set = new Set<ClassLifecycleStatus>();
  raw.split(",").forEach((s) => {
    const v = s.trim() as ClassLifecycleStatus;
    if (v in CLASS_STATUS_META) set.add(v);
  });
  return set.size === 0 ? DEFAULT_VISIBLE_STATUSES : Array.from(set);
}

/* ─────────── Page ─────────── */

export default function ClassesListPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [search, setSearch] = useState(params.get("q") ?? "");
  const [statuses, setStatuses] = useState<ClassLifecycleStatus[]>(parseStatuses(params.get("status")));
  const [sortKey, setSortKey] = useState<SortKey>((params.get("sort") as SortKey) || "start_date");
  const [sortDir, setSortDir] = useState<SortDir>((params.get("dir") as SortDir) || "desc");
  const [view, setView] = useState<ViewMode>((params.get("view") as ViewMode) || "table");

  /* ─── Persist to URL ─── */
  useEffect(() => {
    const next = new URLSearchParams();
    if (search.trim()) next.set("q", search.trim());
    if (
      statuses.length !== DEFAULT_VISIBLE_STATUSES.length ||
      statuses.some((s) => !DEFAULT_VISIBLE_STATUSES.includes(s))
    ) {
      next.set("status", statuses.join(","));
    }
    if (sortKey !== "start_date") next.set("sort", sortKey);
    if (sortDir !== "desc") next.set("dir", sortDir);
    if (view !== "table") next.set("view", view);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statuses, sortKey, sortDir, view]);

  /* ─── Query ─── */
  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["admin-classes-list", { search, statuses, sortKey, sortDir }],
    queryFn: async (): Promise<ClassRow[]> => {
      let q = (supabase as any).from("teachngo_classes").select("*");

      if (statuses.length > 0 && statuses.length < CLASS_STATUS_OPTIONS.length) {
        q = q.in("lifecycle_status", statuses);
      }

      const term = search.trim();
      if (term) {
        const safe = term.replace(/[%,]/g, "");
        q = q.or(`name.ilike.%${safe}%,class_code.ilike.%${safe}%`);
      }

      q = q.order(sortKey, { ascending: sortDir === "asc", nullsFirst: false });

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ClassRow[];
    },
    staleTime: 30_000,
  });

  /* ─── Counts (theo data hiện hữu — không depend filter) ─── */
  const { data: countRows = [] } = useQuery({
    queryKey: ["admin-classes-counts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("teachngo_classes")
        .select("lifecycle_status");
      if (error) throw error;
      return (data ?? []) as { lifecycle_status: ClassLifecycleStatus | null }[];
    },
    staleTime: 60_000,
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    countRows.forEach((r) => {
      const k = r.lifecycle_status ?? "planning";
      c[k] = (c[k] ?? 0) + 1;
    });
    return c;
  }, [countRows]);

  /** "Tất cả" = đang hiện đúng default (mọi status trừ archived). */
  const isDefaultStatuses =
    statuses.length === DEFAULT_VISIBLE_STATUSES.length &&
    DEFAULT_VISIBLE_STATUSES.every((s) => statuses.includes(s));
  const allSelected = statuses.length === CLASS_STATUS_OPTIONS.length;
  const filterActive = !isDefaultStatuses || search.trim().length > 0;

  const toggleStatus = (s: ClassLifecycleStatus) => {
    setStatuses((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  const resetFilters = useCallback(() => {
    setSearch("");
    setStatuses(DEFAULT_VISIBLE_STATUSES);
  }, []);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  /* ─── Archive dialog state ─── */
  const archiveMut = useArchiveClass();
  const [archiveTarget, setArchiveTarget] = useState<ClassRow | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<ClassRow | null>(null);
  const [archiveReason, setArchiveReason] = useState("");

  const openArchive = (cls: ClassRow) => {
    setArchiveTarget(cls);
    setArchiveReason("");
  };

  const confirmArchive = () => {
    if (!archiveTarget) return;
    archiveMut.mutate(
      { id: archiveTarget.id, action: "archive", reason: archiveReason },
      { onSettled: () => setArchiveTarget(null) },
    );
  };

  const confirmRestore = () => {
    if (!restoreTarget) return;
    archiveMut.mutate(
      { id: restoreTarget.id, action: "restore" },
      { onSettled: () => setRestoreTarget(null) },
    );
  };

  /* ─────────── Render ─────────── */

  return (
    <ListPageLayout
      title="Quản lý lớp học"
      subtitle="Danh sách lớp với bộ lọc theo trạng thái lifecycle."
      icon={GraduationCap}
      actions={
        <Button onClick={() => navigate("/classes/new")} className="gap-1.5" size="sm">
          <Plus className="h-4 w-4" /> Tạo lớp mới
        </Button>
      }
      filterBar={
        <div className="space-y-2 pt-2">
          {/* Counter chips */}
          <ScrollArea className="w-full whitespace-nowrap -mx-1 px-1">
            <div className="flex gap-1 pb-1">
              <button
                type="button"
                onClick={() => setStatuses(DEFAULT_VISIBLE_STATUSES)}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium transition-colors",
                  isDefaultStatuses
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card hover:bg-muted/50",
                )}
              >
                Tất cả
                <span className="font-bold tabular-nums">
                  {countRows.filter((r) => r.lifecycle_status !== "archived").length}
                </span>
              </button>
              {CLASS_STATUS_OPTIONS.map((s) => {
                const active = statuses.length === 1 && statuses[0] === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatuses([s])}
                    className={cn(
                      "shrink-0 inline-flex items-center gap-1 rounded-full border pl-0.5 pr-1.5 py-0.5 transition-shadow",
                      active ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : "hover:shadow-sm",
                    )}
                  >
                    <ClassStatusBadge status={s} size="sm" compact />
                    <span className="text-[10.5px] font-bold tabular-nums">{counts[s] ?? 0}</span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          {/* Toolbar: search + multi-status + view + reset (compact 1 dòng) */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên / mã lớp…"
                className="pl-7 h-8 text-xs"
              />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 h-8 px-2 text-xs">
                  <Filter className="h-3.5 w-3.5" />
                  Trạng thái
                  {!allSelected && (
                    <span className="ml-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5 leading-4 tabular-nums">
                      {statuses.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 p-2">
                <div className="flex items-center justify-between px-2 pb-2 border-b mb-1">
                  <span className="text-xs font-semibold">Lifecycle status</span>
                  <button
                    type="button"
                    onClick={() => setStatuses(allSelected ? [] : CLASS_STATUS_OPTIONS)}
                    className="text-[11px] text-primary hover:underline"
                  >
                    {allSelected ? "Bỏ hết" : "Chọn hết"}
                  </button>
                </div>
                <div className="space-y-0.5 max-h-72 overflow-y-auto">
                  {CLASS_STATUS_OPTIONS.map((s) => {
                    const checked = statuses.includes(s);
                    return (
                      <label
                        key={s}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox checked={checked} onCheckedChange={() => toggleStatus(s)} />
                        <ClassStatusBadge status={s} size="sm" />
                        <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                          {counts[s] ?? 0}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>

            <div className="ml-auto flex items-center gap-1">
              {filterActive && (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1 h-8 px-2 text-xs">
                  <RotateCw className="h-3 w-3" /> Reset
                </Button>
              )}
              <div className="flex items-center rounded-md border bg-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setView("table")}
                  className={cn(
                    "px-2 py-1.5 transition-colors",
                    view === "table" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50",
                  )}
                  aria-label="Bảng"
                >
                  <ListIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setView("grid")}
                  className={cn(
                    "px-2 py-1.5 transition-colors",
                    view === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50",
                  )}
                  aria-label="Lưới"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    >
      {/* ─── States ─── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Lỗi tải lớp: {(error as Error).message}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState onReset={resetFilters} hasFilter={filterActive} />
      ) : view === "table" ? (
        <TableView
          rows={rows}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={toggleSort}
          onOpen={(id) => navigate(`/classes/${id}`)}
          onArchive={openArchive}
          onRestore={setRestoreTarget}
        />
      ) : (
        <GridView
          rows={rows}
          onOpen={(id) => navigate(`/classes/${id}`)}
          onArchive={openArchive}
          onRestore={setRestoreTarget}
        />
      )}

      {/* ─── Archive confirmation dialog ─── */}
      <AlertDialog open={!!archiveTarget} onOpenChange={(o) => !o && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lưu trữ lớp học?</AlertDialogTitle>
            <AlertDialogDescription>
              Lớp <span className="font-semibold text-foreground">{archiveTarget?.name ?? "—"}</span>{" "}
              sẽ bị ẩn khỏi danh sách thường nhưng giữ lại toàn bộ thông tin và lịch sử.
              Bạn có thể khôi phục bất kỳ lúc nào trong filter "Đã lưu trữ".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Lý do lưu trữ (tuỳ chọn)</label>
            <Textarea
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              placeholder="VD: Lớp đã kết thúc chu kỳ, lưu trữ để tham khảo về sau…"
              rows={3}
              className="text-sm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveMut.isPending}>Huỷ</AlertDialogCancel>
            <AlertDialogAction onClick={confirmArchive} disabled={archiveMut.isPending}>
              {archiveMut.isPending ? "Đang lưu trữ…" : "Lưu trữ"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Restore confirmation dialog ─── */}
      <AlertDialog open={!!restoreTarget} onOpenChange={(o) => !o && setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Khôi phục lớp học?</AlertDialogTitle>
            <AlertDialogDescription>
              Lớp <span className="font-semibold text-foreground">{restoreTarget?.name ?? "—"}</span>{" "}
              sẽ chuyển về trạng thái "Lên kế hoạch". Bạn có thể chỉnh lại trạng thái phù hợp sau.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveMut.isPending}>Huỷ</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore} disabled={archiveMut.isPending}>
              {archiveMut.isPending ? "Đang khôi phục…" : "Khôi phục"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ListPageLayout>
  );
}

/* ─────────── Subviews ─────────── */

function EmptyState({ onReset, hasFilter }: { onReset: () => void; hasFilter: boolean }) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/20 py-16 text-center space-y-3">
      <Inbox className="h-10 w-10 mx-auto text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        {hasFilter ? "Không có lớp nào khớp bộ lọc" : "Chưa có lớp học nào trong hệ thống"}
      </p>
      {hasFilter && (
        <Button variant="outline" size="sm" onClick={onReset}>
          Xoá bộ lọc
        </Button>
      )}
    </div>
  );
}

function SortableHead({
  label, sortKey, currentKey, currentDir, onClick,
}: { label: string; sortKey: SortKey; currentKey: SortKey; currentDir: SortDir; onClick: (k: SortKey) => void }) {
  const active = currentKey === sortKey;
  return (
    <button
      type="button"
      onClick={() => onClick(sortKey)}
      className={cn(
        "inline-flex items-center gap-1 hover:text-foreground transition-colors",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {label}
      <ArrowUpDown className={cn("h-3 w-3", active && (currentDir === "asc" ? "rotate-180" : ""))} />
    </button>
  );
}

function TableView({
  rows, sortKey, sortDir, onSort, onOpen, onArchive, onRestore,
}: {
  rows: ClassRow[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  onOpen: (id: string) => void;
  onArchive: (cls: ClassRow) => void;
  onRestore: (cls: ClassRow) => void;
}) {
  return (
    <div className="rounded-xl border overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-[120px]">Mã lớp</TableHead>
            <TableHead>
              <SortableHead label="Tên lớp" sortKey="name" currentKey={sortKey} currentDir={sortDir} onClick={onSort} />
            </TableHead>
            <TableHead>Program / Level</TableHead>
            <TableHead>Giáo viên</TableHead>
            <TableHead>
              <SortableHead label="Lịch học" sortKey="start_date" currentKey={sortKey} currentDir={sortDir} onClick={onSort} />
            </TableHead>
            <TableHead className="text-center">HV</TableHead>
            <TableHead>
              <SortableHead label="Trạng thái" sortKey="status_changed_at" currentKey={sortKey} currentDir={sortDir} onClick={onSort} />
            </TableHead>
            <TableHead className="w-[40px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((cls) => (
            <TableRow
              key={cls.id}
              className="cursor-pointer"
              onClick={() => onOpen(cls.id)}
            >
              <TableCell className="font-mono text-xs text-muted-foreground">
                {cls.class_code ?? "—"}
              </TableCell>
              <TableCell className="font-semibold">{cls.name ?? "(không tên)"}</TableCell>
              <TableCell className="text-xs">
                {cls.program ?? "—"}
                {cls.level && <span className="text-muted-foreground"> · {cls.level}</span>}
              </TableCell>
              <TableCell className="text-xs">{cls.teacher_name ?? "—"}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {formatRange(cls.start_date, cls.end_date)}
              </TableCell>
              <TableCell className="text-center text-xs">{cls.student_count ?? 0}</TableCell>
              <TableCell>
                <ClassStatusBadge
                  status={cls.lifecycle_status}
                  reason={cls.cancellation_reason}
                  size="sm"
                />
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()} className="w-[40px]">
                <RowActions cls={cls} onArchive={onArchive} onRestore={onRestore} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function GridView({
  rows, onOpen, onArchive, onRestore,
}: {
  rows: ClassRow[];
  onOpen: (id: string) => void;
  onArchive: (cls: ClassRow) => void;
  onRestore: (cls: ClassRow) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {rows.map((cls) => (
        <div
          key={cls.id}
          className="group relative rounded-xl border bg-card text-left p-4 hover:border-primary/40 hover:shadow-md transition-all space-y-2.5"
        >
          <button
            type="button"
            onClick={() => onOpen(cls.id)}
            aria-label={`Mở lớp ${cls.name ?? ""}`}
            className="absolute inset-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
            <ClassStatusBadge
              status={cls.lifecycle_status}
              reason={cls.cancellation_reason}
              size="sm"
            />
            <div onClick={(e) => e.stopPropagation()}>
              <RowActions cls={cls} onArchive={onArchive} onRestore={onRestore} />
            </div>
          </div>
          <div className="relative pr-32 pointer-events-none">
            <p className="font-mono text-[10px] text-muted-foreground">{cls.class_code ?? "—"}</p>
            <h3 className="font-display font-bold text-base leading-tight mt-0.5">
              {cls.name ?? "(không tên)"}
            </h3>
            {(cls.program || cls.level) && (
              <p className="text-xs text-muted-foreground mt-1">
                {cls.program ?? ""}{cls.program && cls.level ? " · " : ""}{cls.level ?? ""}
              </p>
            )}
          </div>
          <div className="relative flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground pointer-events-none">
            {cls.teacher_name && (
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3" />
                {cls.teacher_name}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {cls.student_count ?? 0} HV
            </span>
            {cls.start_date && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatRange(cls.start_date, cls.end_date)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────── Row actions (archive / restore) ─────────── */

function RowActions({
  cls, onArchive, onRestore,
}: {
  cls: ClassRow;
  onArchive: (cls: ClassRow) => void;
  onRestore: (cls: ClassRow) => void;
}) {
  const isArchived = cls.lifecycle_status === "archived";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Thao tác"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {isArchived ? (
          <DropdownMenuItem onClick={() => onRestore(cls)} className="gap-2 text-xs">
            <ArchiveRestore className="h-3.5 w-3.5" /> Khôi phục lớp
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onArchive(cls)} className="gap-2 text-xs">
            <Archive className="h-3.5 w-3.5" /> Lưu trữ lớp
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ─────────── Helpers ─────────── */

function formatRange(start: string | null, end: string | null): string {
  if (!start && !end) return "—";
  const fmt = (d: string) => new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "2-digit" });
  if (start && end) return `${fmt(start)} → ${fmt(end)}`;
  if (start) return `Từ ${fmt(start)}`;
  return `Đến ${fmt(end!)}`;
}
