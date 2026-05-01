import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  UserPlus, Search, MoreVertical, UserMinus, Loader2, Users,
} from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Badge } from "@shared/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle,
} from "@shared/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@shared/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";
import { Skeleton } from "@shared/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@shared/components/ui/avatar";
import { cn } from "@shared/lib/utils";
import { formatDateDDMMYYYY } from "@shared/utils/dateFormat";

/* ─────────────────────────────────────────────────────────────────────────────
 * StudentsTab — danh sách học viên trong lớp dựa trên bảng class_enrollments
 * (migration 2026-04-26-class-enrollments.sql). Cho phép add/remove enrollment.
 *
 * Lưu ý types: supabase types.ts (read-only) chưa regen sau migration mới
 * → dùng `(supabase as any).from("class_enrollments")` cho đến khi Cloud regen.
 * ──────────────────────────────────────────────────────────────────────────── */

type EnrollmentStatus = "active" | "paused" | "transferred" | "dropped" | "completed";

interface EnrollmentRow {
  id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  dropped_at: string | null;
  drop_reason: string | null;
  student: {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    current_level: string | null;
  } | null;
}

interface StudentSearchRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  current_level: string | null;
}

const STATUS_META: Record<EnrollmentStatus, { label: string; cls: string }> = {
  active:      { label: "Đang học",  cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  paused:      { label: "Tạm dừng",  cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  transferred: { label: "Chuyển lớp", cls: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30" },
  dropped:     { label: "Đã nghỉ",   cls: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30" },
  completed:   { label: "Hoàn thành", cls: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30" },
};

export function StudentsTab({ classId }: { classId: string }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<EnrollmentRow | null>(null);

  /* ─── Query enrollments ─── */
  const enrollmentsQ = useQuery({
    queryKey: ["class-enrollments", classId],
    queryFn: async (): Promise<EnrollmentRow[]> => {
      const { data, error } = await (supabase as any)
        .from("class_enrollments")
        .select(`
          id, status, enrolled_at, dropped_at, drop_reason,
          student:synced_students!class_enrollments_student_id_fkey (
            id, full_name, email, phone, avatar_url, current_level
          )
        `)
        .eq("class_id", classId)
        .order("enrolled_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EnrollmentRow[];
    },
    enabled: !!classId,
    staleTime: 15_000,
  });

  const filtered = useMemo(() => {
    const rows = enrollmentsQ.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const s = r.student;
      return (
        s?.full_name?.toLowerCase().includes(q) ||
        s?.email?.toLowerCase().includes(q) ||
        s?.phone?.toLowerCase().includes(q)
      );
    });
  }, [enrollmentsQ.data, search]);

  const stats = useMemo(() => {
    const rows = enrollmentsQ.data ?? [];
    return {
      total: rows.length,
      active: rows.filter((r) => r.status === "active").length,
    };
  }, [enrollmentsQ.data]);

  /* ─── Remove mutation ─── */
  const removeMut = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await (supabase as any)
        .from("class_enrollments")
        .delete()
        .eq("id", enrollmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã xoá học viên khỏi lớp");
      qc.invalidateQueries({ queryKey: ["class-enrollments", classId] });
      setRemoveTarget(null);
    },
    onError: (e: Error) => toast.error(`Xoá thất bại: ${e.message}`),
  });

  /* ─── Render ─── */
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-semibold">{stats.total}</span>
            <span className="text-muted-foreground">học viên</span>
          </span>
          {stats.active !== stats.total && (
            <span className="text-xs text-muted-foreground">
              {stats.active} đang học
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên, email, SĐT…"
              className="pl-8 h-9 w-56 text-sm"
            />
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
            <UserPlus className="h-4 w-4" />
            Thêm học viên
          </Button>
        </div>
      </div>

      {/* List */}
      {enrollmentsQ.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : enrollmentsQ.error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Lỗi tải danh sách học viên: {(enrollmentsQ.error as Error).message}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center space-y-2">
          <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">
            {stats.total === 0 ? "Chưa có học viên nào trong lớp" : `Không có kết quả cho "${search}"`}
          </p>
          {stats.total === 0 && (
            <p className="text-xs text-muted-foreground">
              Bấm "Thêm học viên" để bắt đầu enroll học viên vào lớp.
            </p>
          )}
        </div>
      ) : (
        <ul className="rounded-2xl border bg-card divide-y overflow-hidden">
          {filtered.map((row) => {
            const s = row.student;
            const meta = STATUS_META[row.status];
            return (
              <li key={row.id} className="flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors">
                <Avatar className="h-9 w-9 shrink-0">
                  {s?.avatar_url && <AvatarImage src={s.avatar_url} alt={s.full_name ?? ""} />}
                  <AvatarFallback className="text-xs">
                    {(s?.full_name ?? "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate">{s?.full_name ?? "(không tên)"}</p>
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4", meta.cls)}>
                      {meta.label}
                    </Badge>
                    {s?.current_level && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                        {s.current_level}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {s?.email ?? "—"}{s?.phone ? ` · ${s.phone}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Enroll</p>
                  <p className="text-[11px] font-medium">
                    {formatDateDDMMYYYY(row.enrolled_at)}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setRemoveTarget(row)}
                      className="text-xs text-destructive focus:text-destructive gap-1.5"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                      Xoá khỏi lớp
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      )}

      {/* Add dialog */}
      <AddStudentsDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        classId={classId}
        existingStudentIds={new Set((enrollmentsQ.data ?? []).map((r) => r.student?.id).filter(Boolean) as string[])}
        onAdded={() => qc.invalidateQueries({ queryKey: ["class-enrollments", classId] })}
      />

      {/* Remove confirm */}
      <AlertDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá học viên khỏi lớp?</AlertDialogTitle>
            <AlertDialogDescription>
              Học viên <span className="font-semibold text-foreground">{removeTarget?.student?.full_name ?? ""}</span>{" "}
              sẽ bị xoá khỏi danh sách lớp này. Dữ liệu học viên (synced_students) không bị ảnh hưởng.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMut.isPending}>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeTarget && removeMut.mutate(removeTarget.id)}
              disabled={removeMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMut.isPending ? "Đang xoá…" : "Xoá khỏi lớp"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function AddStudentsDialog({
  open, onOpenChange, classId, existingStudentIds, onAdded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  classId: string;
  existingStudentIds: Set<string>;
  onAdded: () => void;
}) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const searchQ = useQuery({
    queryKey: ["student-search", q],
    queryFn: async (): Promise<StudentSearchRow[]> => {
      const trimmed = q.trim();
      let query = (supabase as any)
        .from("synced_students")
        .select("id, full_name, email, phone, avatar_url, current_level")
        .eq("is_active", true)
        .order("full_name", { ascending: true })
        .limit(30);
      if (trimmed) {
        // ilike OR pattern — search trên 3 cột chính
        const pat = `%${trimmed}%`;
        query = query.or(`full_name.ilike.${pat},email.ilike.${pat},phone.ilike.${pat}`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as StudentSearchRow[];
    },
    enabled: open,
    staleTime: 30_000,
  });

  const addMut = useMutation({
    mutationFn: async (ids: string[]) => {
      const rows = ids.map((sid) => ({ class_id: classId, student_id: sid, status: "active" }));
      const { error } = await (supabase as any).from("class_enrollments").insert(rows);
      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      toast.success(`Đã thêm ${ids.length} học viên vào lớp`);
      onAdded();
      setPicked(new Set());
      setQ("");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(`Thêm thất bại: ${e.message}`),
  });

  const togglePick = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setPicked(new Set());
          setQ("");
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Thêm học viên vào lớp</DialogTitle>
          <DialogDescription>
            Chọn học viên từ danh sách synced_students để enroll vào lớp này.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm tên, email, SĐT…"
            className="pl-8 h-9 text-sm"
          />
        </div>

        <div className="max-h-80 overflow-y-auto rounded-lg border divide-y">
          {searchQ.isLoading ? (
            <div className="p-3 space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : searchQ.error ? (
            <p className="p-4 text-sm text-destructive">
              {(searchQ.error as Error).message}
            </p>
          ) : (searchQ.data ?? []).length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Không có học viên phù hợp.
            </p>
          ) : (
            (searchQ.data ?? []).map((s) => {
              const already = existingStudentIds.has(s.id);
              const checked = picked.has(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={already}
                  onClick={() => togglePick(s.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2.5 text-left transition-colors",
                    already ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/50",
                    checked && "bg-primary/5",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked || already}
                    disabled={already}
                    readOnly
                    className="h-4 w-4 accent-primary shrink-0"
                  />
                  <Avatar className="h-8 w-8 shrink-0">
                    {s.avatar_url && <AvatarImage src={s.avatar_url} alt={s.full_name ?? ""} />}
                    <AvatarFallback className="text-[10px]">
                      {(s.full_name ?? "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-medium truncate">{s.full_name ?? "(không tên)"}</p>
                      {s.current_level && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{s.current_level}</Badge>
                      )}
                      {already && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">Đã có trong lớp</Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {s.email ?? "—"}{s.phone ? ` · ${s.phone}` : ""}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2 items-center">
          <span className="text-xs text-muted-foreground mr-auto">
            Đã chọn <span className="font-semibold text-foreground">{picked.size}</span>
          </span>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Huỷ</Button>
          <Button
            onClick={() => addMut.mutate(Array.from(picked))}
            disabled={picked.size === 0 || addMut.isPending}
            className="gap-1.5"
          >
            {addMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Thêm {picked.size > 0 ? `(${picked.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}