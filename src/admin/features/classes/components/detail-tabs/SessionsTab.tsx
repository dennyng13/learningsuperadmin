import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar, Search, MoreHorizontal, RefreshCw, UserPlus, Pencil, X,
  Unlock,
} from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Badge } from "@shared/components/ui/badge";
import { Skeleton } from "@shared/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";
import { cn } from "@shared/lib/utils";
import {
  ChangeTeacherDialog, MarkSubstitutedDialog, EditSessionDialog,
  CancelSessionDialog,
} from "./SessionsTabDialogs";

/* ─────────────────────────────────────────────────────────────────────────────
 * SessionsTab — danh sách buổi học của 1 lớp dựa trên bảng class_sessions.
 *
 * UI build sẵn 4 hành động per-row (đổi GV, đánh dấu dạy thế, sửa thông tin,
 * huỷ buổi). Backend RPC tương ứng đang được Lovable build — khi sẵn sàng,
 * dialog mutation sẽ work ngay. Trong lúc chờ, click action vẫn hiện dialog;
 * submit sẽ trả lỗi từ Supabase và toast.error.
 *
 * Pattern: bám sát StudentsTab.tsx (cùng folder) — query tanstack, invalidate
 * thay vì optimistic update, cast (supabase as any) vì types.ts chưa regen.
 * ──────────────────────────────────────────────────────────────────────────── */

export type SessionStatus = "planned" | "taught" | "cancelled" | "substituted";

export interface SessionRow {
  id: string;
  class_id: string;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  session_number: number | null;
  mode: string | null;
  room: string | null;
  teacher_id: string | null;
  status: SessionStatus | null;
  is_late_locked: boolean | null;
  notes: string | null;
  teacher: { id: string; full_name: string | null } | null;
}

const STATUS_META: Record<SessionStatus, { label: string; cls: string }> = {
  planned:     { label: "Theo kế hoạch", cls: "border-border text-muted-foreground" },
  taught:      { label: "Đã dạy",         cls: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400" },
  cancelled:   { label: "Đã huỷ",         cls: "border-destructive/30 text-destructive" },
  substituted: { label: "Dạy thế",        cls: "border-amber-500/30 text-amber-600 dark:text-amber-400" },
};

const MODE_LABELS: Record<string, string> = {
  online:  "Online",
  offline: "Offline",
  hybrid:  "Hybrid",
};

function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("vi-VN");
}

function fmtTime(t: string | null): string {
  if (!t) return "—";
  return t.slice(0, 5);
}

export function SessionsTab({ classId }: { classId: string }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [changeTeacherTarget, setChangeTeacherTarget] = useState<SessionRow | null>(null);
  const [substituteTarget, setSubstituteTarget] = useState<SessionRow | null>(null);
  const [editTarget, setEditTarget] = useState<SessionRow | null>(null);
  const [cancelTarget, setCancelTarget] = useState<SessionRow | null>(null);

  /* ─── Query sessions ─── */
  const sessionsQ = useQuery({
    queryKey: ["class-sessions", classId],
    queryFn: async (): Promise<SessionRow[]> => {
      const { data, error } = await (supabase as any)
        .from("class_sessions")
        .select(`
          id, class_id, session_date, start_time, end_time, session_number,
          mode, room, teacher_id, status, is_late_locked, notes,
          teacher:teachers!class_sessions_teacher_id_fkey (id, full_name)
        `)
        .eq("class_id", classId)
        .order("session_number", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SessionRow[];
    },
    enabled: !!classId,
    staleTime: 15_000,
  });

  const filtered = useMemo(() => {
    const rows = sessionsQ.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const num = r.session_number != null ? String(r.session_number) : "";
      const tName = r.teacher?.full_name?.toLowerCase() ?? "";
      return num.includes(q) || tName.includes(q);
    });
  }, [sessionsQ.data, search]);

  const stats = useMemo(() => {
    const rows = sessionsQ.data ?? [];
    return {
      total: rows.length,
      planned: rows.filter((r) => r.status === "planned" || r.status == null).length,
      taught: rows.filter((r) => r.status === "taught").length,
      cancelled: rows.filter((r) => r.status === "cancelled").length,
      substituted: rows.filter((r) => r.status === "substituted").length,
    };
  }, [sessionsQ.data]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-3 text-sm flex-wrap">
          <span className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-semibold">{stats.total}</span>
            <span className="text-muted-foreground">buổi</span>
          </span>
          {stats.total > 0 && (
            <div className="flex items-center gap-1.5 text-xs flex-wrap">
              <Badge variant="outline" className="text-[10px] h-5 border-border text-muted-foreground">
                {stats.planned} kế hoạch
              </Badge>
              <Badge variant="outline" className="text-[10px] h-5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                {stats.taught} đã dạy
              </Badge>
              <Badge variant="outline" className="text-[10px] h-5 border-amber-500/30 text-amber-600 dark:text-amber-400">
                {stats.substituted} dạy thế
              </Badge>
              <Badge variant="outline" className="text-[10px] h-5 border-destructive/30 text-destructive">
                {stats.cancelled} đã huỷ
              </Badge>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm số buổi, tên GV…"
              className="pl-8 h-9 w-56 text-sm"
            />
          </div>
        </div>
      </div>

      {/* List */}
      {sessionsQ.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : sessionsQ.error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Lỗi tải danh sách buổi học: {(sessionsQ.error as Error).message}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 p-10 text-center space-y-2">
          <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">
            {stats.total === 0 ? "Lớp này chưa có buổi nào" : `Không có kết quả cho "${search}"`}
          </p>
          {stats.total === 0 && (
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Sessions được tạo cùng với lớp qua wizard. Liên hệ admin nếu lớp đã tạo nhưng chưa có buổi.
            </p>
          )}
        </div>
      ) : (
        <ul className="rounded-2xl border bg-card divide-y overflow-hidden">
          {filtered.map((row) => (
            <SessionListItem
              key={row.id}
              row={row}
              onChangeTeacher={() => setChangeTeacherTarget(row)}
              onMarkSubstituted={() => setSubstituteTarget(row)}
              onEdit={() => setEditTarget(row)}
              onCancel={() => setCancelTarget(row)}
              onUnlock={() => navigate("/admin/attendance")}
              onTeacherClick={(teacherId) => navigate(`/teachers/${teacherId}`)}
            />
          ))}
        </ul>
      )}

      {/* Dialogs */}
      <ChangeTeacherDialog
        session={changeTeacherTarget}
        classId={classId}
        onOpenChange={(o) => !o && setChangeTeacherTarget(null)}
      />
      <MarkSubstitutedDialog
        session={substituteTarget}
        classId={classId}
        onOpenChange={(o) => !o && setSubstituteTarget(null)}
      />
      <EditSessionDialog
        session={editTarget}
        classId={classId}
        onOpenChange={(o) => !o && setEditTarget(null)}
      />
      <CancelSessionDialog
        session={cancelTarget}
        classId={classId}
        onOpenChange={(o) => !o && setCancelTarget(null)}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

interface ListItemProps {
  row: SessionRow;
  onChangeTeacher: () => void;
  onMarkSubstituted: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onUnlock: () => void;
  onTeacherClick: (teacherId: string) => void;
}

function SessionListItem({
  row, onChangeTeacher, onMarkSubstituted, onEdit, onCancel, onUnlock,
  onTeacherClick,
}: ListItemProps) {
  const status: SessionStatus = (row.status ?? "planned") as SessionStatus;
  const meta = STATUS_META[status] ?? STATUS_META.planned;
  const modeLabel = row.mode ? (MODE_LABELS[row.mode] ?? row.mode) : null;
  const isCancelled = status === "cancelled";

  return (
    <li className={cn(
      "flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors",
      isCancelled && "opacity-60",
    )}>
      {/* Buổi N badge */}
      <div className="shrink-0 h-9 w-9 rounded-full bg-primary/10 text-primary flex flex-col items-center justify-center">
        <span className="text-[9px] leading-none uppercase tracking-wide">Buổi</span>
        <span className="text-xs font-bold leading-none">
          {row.session_number ?? "?"}
        </span>
      </div>

      {/* Date + time + room/mode */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <span className={cn("font-medium", isCancelled && "line-through")}>
            {fmtDate(row.session_date)}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground tabular-nums">
            {fmtTime(row.start_time)}–{fmtTime(row.end_time)}
          </span>
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
          {row.room && <span>{row.room}</span>}
          {row.room && modeLabel && <span>·</span>}
          {modeLabel && <span>{modeLabel}</span>}
          {!row.room && !modeLabel && <span>—</span>}
        </div>
      </div>

      {/* Teacher + status */}
      <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 max-w-[200px]">
        <TeacherDisplay row={row} onTeacherClick={onTeacherClick} />
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4", meta.cls)}>
          {meta.label}
        </Badge>
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Hành động">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={onChangeTeacher} className="text-xs gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Đổi giáo viên
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onMarkSubstituted} className="text-xs gap-1.5">
            <UserPlus className="h-3.5 w-3.5" />
            Đánh dấu dạy thế
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onEdit} className="text-xs gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            Sửa thông tin
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onCancel}
            className="text-xs text-destructive focus:text-destructive gap-1.5"
          >
            <X className="h-3.5 w-3.5" />
            Huỷ buổi
          </DropdownMenuItem>
          {row.is_late_locked && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onUnlock} className="text-xs gap-1.5">
                <Unlock className="h-3.5 w-3.5" />
                Mở khoá điểm danh…
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

/* Note: Substitute teacher name not displayed here. Source of truth for
   substitute is timesheet_entries.substitute_teacher_id, not class_sessions.
   Display will be added in future iteration after admin_mark_session_substituted
   RPC is deployed and timesheet_entries fetch wired up. */
function TeacherDisplay({
  row, onTeacherClick,
}: {
  row: SessionRow;
  onTeacherClick: (teacherId: string) => void;
}) {
  const orig = row.teacher;
  const isSubstituted = row.status === "substituted";

  if (!orig) {
    return <span className="text-xs text-muted-foreground">— Chưa có GV —</span>;
  }

  return (
    <div className="text-xs leading-tight flex items-center gap-1.5 justify-end flex-wrap">
      {orig.id ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onTeacherClick(orig.id); }}
          className="font-medium hover:underline truncate max-w-[140px]"
          title={orig.full_name ?? ""}
        >
          {orig.full_name ?? "—"}
        </button>
      ) : (
        <span className="font-medium">{orig.full_name ?? "—"}</span>
      )}
      {isSubstituted && (
        <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-amber-500/30 text-amber-600 dark:text-amber-400">
          Có dạy thế
        </Badge>
      )}
    </div>
  );
}
