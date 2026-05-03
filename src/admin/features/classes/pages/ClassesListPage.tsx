import { useMemo, useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@shared/components/ui/checkbox";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@shared/components/ui/popover";
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
import { HeroBoard } from "@shared/components/ui/hero-board";
import { PopCard } from "@shared/components/ui/pop-card";
import { PopButton } from "@shared/components/ui/pop-button";
import { PopChip } from "@shared/components/ui/pop-chip";
import { TableWrap } from "@shared/components/ui/table-wrap";
import { Table } from "@shared/components/ui/pop-table";
import { EmptyMascot } from "@shared/components/ui/empty-mascot";
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
  /** Sĩ số tối đa — driver cho CapacityBar trong GridView card. */
  max_students: number | null;
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
  /* View preference: URL param (sharable) → localStorage (per-user default)
     → "table" (factory default). Day 7: localStorage layer added cho UX
     persistence khi user prefer cards mode. */
  const [view, setView] = useState<ViewMode>(() => {
    const fromUrl = params.get("view") as ViewMode | null;
    if (fromUrl === "table" || fromUrl === "grid") return fromUrl;
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("admin-classes-view");
      if (stored === "table" || stored === "grid") return stored;
    }
    return "table";
  });

  /* Persist view to localStorage on change. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem("admin-classes-view", view); } catch { /* ignore quota */ }
  }, [view]);

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
      let q = (supabase as any).from("classes" as any).select("*");

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
        .from("classes" as any)
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

  const totalActive = countRows.filter((r) => r.lifecycle_status !== "archived").length;
  const totalCount = countRows.length;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <HeroBoard
        tone="teal"
        title="Quản lý lớp học"
        subtitle={
          isLoading
            ? "Đang tải…"
            : `${totalActive} lớp đang hoạt động · ${totalCount} tổng (gồm đã lưu trữ)`
        }
        action={
          <PopButton tone="white" onClick={() => navigate("/classes/new")}>
            <Plus className="size-4" />
            <span>Tạo lớp mới</span>
          </PopButton>
        }
        illustration={<GraduationCap className="size-28 text-white/85 animate-bob" strokeWidth={1.5} />}
      />

      {/* Filter bar */}
      <div className="space-y-3">
        {/* Counter chips */}
        <ScrollArea className="w-full whitespace-nowrap -mx-1 px-1">
          <div className="flex gap-1.5 pb-1">
            <button
              type="button"
              onClick={() => setStatuses(DEFAULT_VISIBLE_STATUSES)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1 rounded-full border-[2px] px-2.5 py-0.5 text-[10.5px] font-display font-bold transition-all",
                isDefaultStatuses
                  ? "bg-lp-ink text-white border-lp-ink shadow-pop-xs"
                  : "bg-white text-lp-ink border-lp-ink hover:bg-lp-yellow/20",
              )}
            >
              Tất cả
              <span className="font-extrabold tabular-nums">
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
                    "shrink-0 inline-flex items-center gap-1 rounded-full border-[2px] border-lp-ink pl-0.5 pr-1.5 py-0.5 transition-all",
                    active ? "shadow-pop-xs bg-lp-yellow/30" : "bg-white hover:bg-lp-yellow/10",
                  )}
                >
                  <ClassStatusBadge status={s} size="sm" compact />
                  <span className="text-[10.5px] font-display font-extrabold tabular-nums text-lp-ink">{counts[s] ?? 0}</span>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {/* Toolbar: search + multi-status + view + reset */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-lp-body" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên / mã lớp…"
              className="w-full h-10 pl-9 pr-3 text-sm font-body bg-white border-[2px] border-lp-ink rounded-pop placeholder:text-lp-body/70 focus:outline-none focus:shadow-pop-xs transition-shadow"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 h-10 px-3 text-sm font-display font-bold bg-white text-lp-ink border-[2px] border-lp-ink rounded-pop transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pop-xs"
              >
                <Filter className="h-4 w-4" />
                Trạng thái
                {!allSelected && (
                  <span className="ml-0.5 inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-lp-coral text-white border-[1.5px] border-lp-ink text-[10px] font-bold tabular-nums px-1.5">
                    {statuses.length}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-2 border-[2px] border-lp-ink rounded-pop shadow-pop">
              <div className="flex items-center justify-between px-2 pb-2 border-b-[2px] border-lp-ink/15 mb-1">
                <span className="text-xs font-display font-extrabold uppercase tracking-wider text-lp-body">Lifecycle status</span>
                <button
                  type="button"
                  onClick={() => setStatuses(allSelected ? [] : CLASS_STATUS_OPTIONS)}
                  className="text-[11px] font-display font-bold text-lp-teal hover:text-lp-teal-deep hover:underline"
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
                      className="flex items-center gap-2 px-2 py-1.5 rounded-pop hover:bg-lp-yellow/20 cursor-pointer"
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggleStatus(s)} />
                      <ClassStatusBadge status={s} size="sm" />
                      <span className="ml-auto text-[10px] text-lp-body font-display font-bold tabular-nums">
                        {counts[s] ?? 0}
                      </span>
                    </label>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          <div className="ml-auto flex items-center gap-2">
            {filterActive && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 h-9 px-3 text-xs font-display font-bold text-lp-coral hover:text-lp-coral-deep hover:bg-lp-coral/10 rounded-pop transition-colors"
              >
                <RotateCw className="h-3 w-3" /> Reset
              </button>
            )}
            <div
              role="tablist"
              aria-label="Chế độ hiển thị danh sách"
              className="flex items-center rounded-pop border-[2px] border-lp-ink bg-white overflow-hidden"
            >
              <button
                type="button"
                role="tab"
                aria-selected={view === "table"}
                onClick={() => setView("table")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-2 transition-colors font-display text-xs font-bold",
                  view === "table" ? "bg-lp-yellow text-lp-ink" : "text-lp-body hover:bg-lp-yellow/20",
                )}
                aria-label="View bảng (List)"
              >
                <ListIcon className="h-4 w-4" />
                <span className="hidden sm:inline">List</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === "grid"}
                onClick={() => setView("grid")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-2 transition-colors border-l-[2px] border-lp-ink font-display text-xs font-bold",
                  view === "grid" ? "bg-lp-yellow text-lp-ink" : "text-lp-body hover:bg-lp-yellow/20",
                )}
                aria-label="View thẻ (Cards)"
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Cards</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* States */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-lp-teal" />
        </div>
      ) : error ? (
        <PopCard tone="white" shadow="sm" className="p-6 text-sm text-lp-coral border-lp-coral">
          Lỗi tải lớp: {(error as Error).message}
        </PopCard>
      ) : rows.length === 0 ? (
        <ClassesEmptyState onReset={resetFilters} hasFilter={filterActive} />
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

      {/* Archive confirmation dialog */}
      <AlertDialog open={!!archiveTarget} onOpenChange={(o) => !o && setArchiveTarget(null)}>
        <AlertDialogContent className="border-[2.5px] border-lp-ink rounded-pop-lg shadow-pop-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-lp-ink">Lưu trữ lớp học?</AlertDialogTitle>
            <AlertDialogDescription className="text-lp-body">
              Lớp <span className="font-display font-bold text-lp-ink">{archiveTarget?.name ?? "—"}</span>{" "}
              sẽ bị ẩn khỏi danh sách thường nhưng giữ lại toàn bộ thông tin và lịch sử.
              Bạn có thể khôi phục bất kỳ lúc nào trong filter "Đã lưu trữ".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <label className="text-xs font-display font-bold text-lp-ink">Lý do lưu trữ (tuỳ chọn)</label>
            <Textarea
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              placeholder="VD: Lớp đã kết thúc chu kỳ, lưu trữ để tham khảo về sau…"
              rows={3}
              className="text-sm border-[2px] border-lp-ink rounded-pop focus-visible:shadow-pop-xs"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveMut.isPending}>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmArchive}
              disabled={archiveMut.isPending}
              className="bg-lp-coral text-white border-[2px] border-lp-ink hover:bg-lp-coral-deep"
            >
              {archiveMut.isPending ? "Đang lưu trữ…" : "Lưu trữ"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore confirmation dialog */}
      <AlertDialog open={!!restoreTarget} onOpenChange={(o) => !o && setRestoreTarget(null)}>
        <AlertDialogContent className="border-[2.5px] border-lp-ink rounded-pop-lg shadow-pop-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-lp-ink">Khôi phục lớp học?</AlertDialogTitle>
            <AlertDialogDescription className="text-lp-body">
              Lớp <span className="font-display font-bold text-lp-ink">{restoreTarget?.name ?? "—"}</span>{" "}
              sẽ chuyển về trạng thái "Lên kế hoạch". Bạn có thể chỉnh lại trạng thái phù hợp sau.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveMut.isPending}>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRestore}
              disabled={archiveMut.isPending}
              className="bg-lp-teal text-white border-[2px] border-lp-ink hover:bg-lp-teal-deep"
            >
              {archiveMut.isPending ? "Đang khôi phục…" : "Khôi phục"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ─────────── Subviews ─────────── */

function ClassesEmptyState({ onReset, hasFilter }: { onReset: () => void; hasFilter: boolean }) {
  return (
    <EmptyMascot
      icon={Inbox}
      title={hasFilter ? "Không có lớp nào khớp bộ lọc" : "Chưa có lớp học nào"}
      description={
        hasFilter
          ? "Thử bỏ filter hoặc tìm với từ khoá khác."
          : "Tạo lớp đầu tiên để bắt đầu quản lý."
      }
      action={
        hasFilter ? (
          <PopButton tone="white" size="sm" onClick={onReset}>
            <span>Xoá bộ lọc</span>
          </PopButton>
        ) : undefined
      }
    />
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
        "inline-flex items-center gap-1 transition-colors",
        active ? "text-lp-ink" : "text-lp-body hover:text-lp-ink",
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
    <TableWrap tone="white" shadow="md">
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.HeadCell className="w-[110px]">Mã lớp</Table.HeadCell>
            <Table.HeadCell>
              <SortableHead label="Tên lớp" sortKey="name" currentKey={sortKey} currentDir={sortDir} onClick={onSort} />
            </Table.HeadCell>
            <Table.HeadCell>Chương trình / Level</Table.HeadCell>
            <Table.HeadCell>Cơ sở · Hình thức</Table.HeadCell>
            <Table.HeadCell>Giáo viên</Table.HeadCell>
            <Table.HeadCell>
              <SortableHead label="Lịch học" sortKey="start_date" currentKey={sortKey} currentDir={sortDir} onClick={onSort} />
            </Table.HeadCell>
            <Table.HeadCell className="text-center">HV</Table.HeadCell>
            <Table.HeadCell>
              <SortableHead label="Trạng thái" sortKey="status_changed_at" currentKey={sortKey} currentDir={sortDir} onClick={onSort} />
            </Table.HeadCell>
            <Table.HeadCell className="w-[40px]" />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rows.map((cls) => (
            <Table.Row
              key={cls.id}
              className="cursor-pointer"
              onClick={() => onOpen(cls.id)}
            >
              <Table.Cell className="font-mono text-[11px] text-lp-body py-2">
                {cls.class_code ?? "—"}
              </Table.Cell>
              <Table.Cell className="font-display font-bold text-[13px] text-lp-ink py-2">{displayName(cls)}</Table.Cell>
              <Table.Cell className="text-xs py-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-lp-ink">{cls.program ?? "—"}</span>
                  {cls.level && <LevelChip level={cls.level} />}
                </div>
              </Table.Cell>
              <Table.Cell className="text-[11px] text-lp-body py-2">
                {[cls.branch, cls.mode, cls.room].filter(Boolean).join(" · ") || "—"}
              </Table.Cell>
              <Table.Cell className="text-xs text-lp-ink py-2">{cls.teacher_name ?? "—"}</Table.Cell>
              <Table.Cell className="text-[11px] text-lp-body py-2 whitespace-nowrap">
                {formatRange(cls.start_date, cls.end_date)}
                {cls.schedule && (
                  <div className="text-[10px] text-lp-body/70 truncate max-w-[140px]">
                    {cls.schedule}
                  </div>
                )}
              </Table.Cell>
              <Table.Cell className="text-center text-xs text-lp-ink font-display font-bold tabular-nums py-2">{cls.student_count ?? 0}</Table.Cell>
              <Table.Cell>
                <ClassStatusBadge
                  status={cls.lifecycle_status}
                  reason={cls.cancellation_reason}
                  size="sm"
                />
              </Table.Cell>
              <Table.Cell onClick={(e) => e.stopPropagation()} className="w-[40px]">
                <RowActions cls={cls} onArchive={onArchive} onRestore={onRestore} />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </TableWrap>
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
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {rows.map((cls) => {
        const vibe = getProgramVibe(cls.program);
        return (
          <PopCard
            key={cls.id}
            tone="white"
            shadow="sm"
            hover="lift"
            className="group relative p-3 space-y-2"
          >
            <button
              type="button"
              onClick={() => onOpen(cls.id)}
              aria-label={`Mở lớp ${displayName(cls)}`}
              className="absolute inset-0 rounded-pop-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-lp-coral"
            />
            <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
              <ClassStatusBadge
                status={cls.lifecycle_status}
                reason={cls.cancellation_reason}
                size="sm"
              />
              <div onClick={(e) => e.stopPropagation()}>
                <RowActions cls={cls} onArchive={onArchive} onRestore={onRestore} />
              </div>
            </div>

            {/* Header row: emoji block + name+code+chips */}
            <div className="relative flex items-start gap-2.5 pr-28 pointer-events-none">
              <ProgramEmojiBlock vibe={vibe} />
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[10px] text-lp-body/80 truncate">{cls.class_code ?? "—"}</p>
                <h3 className="font-display font-extrabold text-sm text-lp-ink leading-tight mt-0.5 line-clamp-2">
                  {displayName(cls)}
                </h3>
                <div className="flex items-center gap-1 flex-wrap mt-1.5">
                  {cls.program && <ProgramVibeChip vibe={vibe} />}
                  {cls.level && <LevelChip level={cls.level} />}
                </div>
              </div>
            </div>

            {(cls.branch || cls.mode || cls.room) && (
              <div className="relative flex flex-wrap gap-1 pointer-events-none">
                {cls.branch && <MetaTag>{cls.branch}</MetaTag>}
                {cls.mode && <MetaTag>{cls.mode}</MetaTag>}
                {cls.room && <MetaTag>P. {cls.room}</MetaTag>}
              </div>
            )}

            {/* Capacity bar — only render khi có max_students. */}
            <div className="relative pointer-events-none">
              <CapacityBar students={cls.student_count ?? 0} capacity={cls.max_students} />
            </div>

            <div className="relative flex flex-wrap gap-x-2.5 gap-y-1 text-[10.5px] text-lp-body pointer-events-none pt-2 border-t-[2px] border-lp-ink/10">
              {cls.teacher_name && (
                <span className="inline-flex items-center gap-1 truncate max-w-[140px]">
                  <User className="h-3 w-3" />
                  <span className="truncate">{cls.teacher_name}</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span className="tabular-nums font-display font-bold text-lp-ink">{cls.student_count ?? 0}</span> HV
              </span>
              {cls.start_date && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatRange(cls.start_date, cls.end_date)}
                </span>
              )}
            </div>
          </PopCard>
        );
      })}
    </div>
  );
}

/* ─────────── Small chips ─────────── */

/** Level chip dùng `getLevelColor` — đồng bộ với CourseLevelManager. */
function LevelChip({ level }: { level: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0 rounded text-[10px] font-display font-extrabold leading-4",
        getLevelColor(level),
      )}
    >
      {level}
    </span>
  );
}

/** Meta tag (branch / mode / room) — neutral, dense. */
function MetaTag({ children }: { children: React.ReactNode }) {
  return (
    <PopChip tone="cream" className="px-1.5 py-0 text-[10px] leading-4">
      {children}
    </PopChip>
  );
}

/* Day 7 verify follow-up: mockup pages-class-detail vibe — emoji + color
   per program. Sticker-pop block (rotate -3deg) + dot-color chip. */
const PROGRAM_VIBE: Record<string, { emoji: string; bg: string; border: string; chipBg: string; chipText: string; dot: string; label: string }> = {
  ielts: {
    emoji: "🎯",
    bg: "bg-teal-50 dark:bg-teal-950/40",
    border: "border-teal-300 dark:border-teal-800",
    chipBg: "bg-teal-100 dark:bg-teal-900/40",
    chipText: "text-teal-700 dark:text-teal-300",
    dot: "bg-teal-500",
    label: "IELTS",
  },
  wre: {
    emoji: "✏️",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-300 dark:border-rose-800",
    chipBg: "bg-rose-100 dark:bg-rose-900/40",
    chipText: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
    label: "WRE",
  },
  customized: {
    emoji: "🎨",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-300 dark:border-amber-800",
    chipBg: "bg-amber-100 dark:bg-amber-900/40",
    chipText: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
    label: "Customized",
  },
};

const FALLBACK_VIBE = {
  emoji: "📚",
  bg: "bg-slate-50 dark:bg-slate-900/40",
  border: "border-slate-300 dark:border-slate-700",
  chipBg: "bg-slate-100 dark:bg-slate-800",
  chipText: "text-slate-700 dark:text-slate-300",
  dot: "bg-slate-500",
  label: "Khác",
};

function getProgramVibe(program: string | null | undefined) {
  if (!program) return FALLBACK_VIBE;
  return PROGRAM_VIBE[program.toLowerCase()] ?? { ...FALLBACK_VIBE, label: program };
}

/** Small emoji block — sticker-pop style. Replaces plain text affordance. */
function ProgramEmojiBlock({ vibe }: { vibe: ReturnType<typeof getProgramVibe> }) {
  return (
    <div className={cn(
      "shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-pop border-[2px] border-lp-ink shadow-pop-xs text-lg leading-none -rotate-3",
      vibe.bg,
    )}>
      {vibe.emoji}
    </div>
  );
}

/** Topic-style chip với dot color matching program. */
function ProgramVibeChip({ vibe }: { vibe: ReturnType<typeof getProgramVibe> }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-display font-bold leading-4 border",
      vibe.chipBg, vibe.chipText, vibe.border,
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", vibe.dot)} />
      {vibe.label}
    </span>
  );
}

/** Capacity progress bar — students/max_students. Color shifts from teal
 *  → amber → coral as fill approaches/exceeds capacity. */
function CapacityBar({ students, capacity }: { students: number; capacity: number | null | undefined }) {
  if (!capacity || capacity <= 0) return null;
  const pct = Math.min(100, Math.round((students / capacity) * 100));
  const overFull = students > capacity;
  const fillColor = overFull
    ? "bg-rose-500"
    : pct >= 90
      ? "bg-amber-500"
      : pct >= 60
        ? "bg-teal-500"
        : "bg-teal-400";
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[9px] text-lp-body">
        <span className="font-display font-bold uppercase tracking-wider">Capacity</span>
        <span className="tabular-nums font-mono">
          {students}/{capacity} ({pct}%)
        </span>
      </div>
      <div className="h-1 w-full rounded-full bg-lp-ink/10 overflow-hidden">
        <div className={cn("h-full transition-all", fillColor)} style={{ width: `${pct}%` }} />
      </div>
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
          className="inline-flex h-8 w-8 items-center justify-center rounded-pop text-lp-body hover:bg-lp-yellow/20 hover:text-lp-ink transition-colors"
          aria-label="Thao tác"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 border-[2px] border-lp-ink rounded-pop shadow-pop">
        {isArchived ? (
          <DropdownMenuItem onClick={() => onRestore(cls)} className="gap-2 text-xs font-body">
            <ArchiveRestore className="h-3.5 w-3.5 text-lp-teal" /> Khôi phục lớp
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onArchive(cls)} className="gap-2 text-xs font-body">
            <Archive className="h-3.5 w-3.5 text-lp-coral" /> Lưu trữ lớp
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
