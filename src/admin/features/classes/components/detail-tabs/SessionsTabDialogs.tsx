import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Search, UserCircle2 } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import { Badge } from "@shared/components/ui/badge";
import { Skeleton } from "@shared/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle,
} from "@shared/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle,
} from "@shared/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import { cn } from "@shared/lib/utils";
import type { SessionRow } from "./SessionsTab";

/* 4 dialogs cho SessionsTab. RPC backend đang được Lovable build:
   admin_update_session_teacher / admin_mark_session_substituted /
   admin_update_session_info / admin_cancel_session. */

interface ActiveTeacher {
  id: string;
  full_name: string | null;
}

function useActiveTeachers() {
  return useQuery({
    queryKey: ["active-teachers"],
    queryFn: async (): Promise<ActiveTeacher[]> => {
      const { data, error } = await (supabase as any)
        .from("teachers")
        .select("id, full_name")
        .eq("status", "active")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ActiveTeacher[];
    },
    staleTime: 60_000,
  });
}

function TeacherPicker({
  value, onChange, excludeId, label = "Chọn giáo viên",
}: {
  value: string | null;
  onChange: (id: string, fullName: string | null) => void;
  excludeId?: string | null;
  label?: string;
}) {
  const [q, setQ] = useState("");
  const teachersQ = useActiveTeachers();

  const filtered = useMemo(() => {
    const rows = teachersQ.data ?? [];
    const trimmed = q.trim().toLowerCase();
    return rows.filter((t) => {
      if (excludeId && t.id === excludeId) return false;
      if (!trimmed) return true;
      return (t.full_name ?? "").toLowerCase().includes(trimmed);
    });
  }, [teachersQ.data, q, excludeId]);

  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm tên giáo viên…"
          className="pl-8 h-9 text-sm"
        />
      </div>
      <div className="max-h-56 overflow-y-auto rounded-lg border divide-y">
        {teachersQ.isLoading ? (
          <div className="p-3 space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : teachersQ.error ? (
          <p className="p-4 text-sm text-destructive">
            {(teachersQ.error as Error).message}
          </p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Không có giáo viên phù hợp.
          </p>
        ) : (
          filtered.map((t) => {
            const checked = value === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onChange(t.id, t.full_name)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50",
                  checked && "bg-primary/5",
                )}
              >
                <UserCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate">{t.full_name ?? "(không tên)"}</span>
                {checked && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary">
                    Đã chọn
                  </Badge>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ─────────────── Dialog 1: Đổi giáo viên ─────────────── */

export function ChangeTeacherDialog({
  session, classId, onOpenChange,
}: {
  session: SessionRow | null;
  classId: string;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [newTeacherId, setNewTeacherId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (session) {
      setNewTeacherId(null);
      setReason("");
    }
  }, [session?.id]);

  const mut = useMutation({
    mutationFn: async (args: { sessionId: string; newTeacherId: string; reason: string }) => {
      const { error } = await (supabase as any).rpc("admin_update_session_teacher", {
        p_session_id: args.sessionId,
        p_new_teacher_id: args.newTeacherId,
        p_reason: args.reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã đổi giáo viên cho buổi");
      qc.invalidateQueries({ queryKey: ["class-sessions", classId] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(`Đổi GV thất bại: ${e.message}`),
  });

  const submit = () => {
    if (!session || !newTeacherId) return;
    if (reason.trim().length < 5) {
      toast.error("Lý do phải tối thiểu 5 ký tự.");
      return;
    }
    mut.mutate({ sessionId: session.id, newTeacherId, reason: reason.trim() });
  };

  return (
    <Dialog open={!!session} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Đổi giáo viên cho buổi {session?.session_number ?? "?"}
          </DialogTitle>
          <DialogDescription>
            Giáo viên mới sẽ thay thế hoàn toàn giáo viên hiện tại cho buổi này.
            Nếu chỉ là dạy thế tạm thời, dùng "Đánh dấu dạy thế" thay vì đổi GV.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Giáo viên hiện tại</p>
            <p className="text-sm font-medium">
              {session?.teacher?.full_name ?? "— Chưa có GV —"}
            </p>
          </div>

          <TeacherPicker
            value={newTeacherId}
            onChange={(id) => setNewTeacherId(id)}
            excludeId={session?.teacher_id ?? null}
            label="Giáo viên mới"
          />

          <div className="space-y-1.5">
            <Label className="text-xs">Lý do đổi <span className="text-destructive">*</span></Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: GV cũ đã rời tổ chức / xếp lại workload…"
              rows={3}
            />
            <p className="text-[10px] text-muted-foreground">Tối thiểu 5 ký tự.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mut.isPending}>
            Hủy
          </Button>
          <Button
            onClick={submit}
            disabled={!newTeacherId || mut.isPending}
            className="gap-1.5"
          >
            {mut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Đổi giáo viên
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────── Dialog 2: Đánh dấu dạy thế ─────────────── */

export function MarkSubstitutedDialog({
  session, classId, onOpenChange,
}: {
  session: SessionRow | null;
  classId: string;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [substituteId, setSubstituteId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (session) {
      setSubstituteId(null);
      setNote("");
    }
  }, [session?.id]);

  const mut = useMutation({
    mutationFn: async (args: { sessionId: string; substituteId: string; note: string | null }) => {
      const { error } = await (supabase as any).rpc("admin_mark_session_substituted", {
        p_session_id: args.sessionId,
        p_substitute_teacher_id: args.substituteId,
        p_note: args.note,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã đánh dấu buổi này là dạy thế");
      qc.invalidateQueries({ queryKey: ["class-sessions", classId] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(`Đánh dấu thất bại: ${e.message}`),
  });

  const submit = () => {
    if (!session || !substituteId) return;
    mut.mutate({
      sessionId: session.id,
      substituteId,
      note: note.trim() ? note.trim() : null,
    });
  };

  return (
    <Dialog open={!!session} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Đánh dấu dạy thế buổi {session?.session_number ?? "?"}
          </DialogTitle>
          <DialogDescription>
            Buổi này sẽ chuyển sang trạng thái <em>Dạy thế</em>. GV gốc vẫn được
            giữ trên buổi học, GV thế chỉ áp dụng cho buổi này.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Giáo viên gốc</p>
            <p className="text-sm font-medium">
              {session?.teacher?.full_name ?? "— Chưa có GV —"}
            </p>
          </div>

          <TeacherPicker
            value={substituteId}
            onChange={(id) => setSubstituteId(id)}
            excludeId={session?.teacher_id ?? null}
            label="Giáo viên dạy thế"
          />

          <div className="space-y-1.5">
            <Label className="text-xs">Ghi chú (tuỳ chọn)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: GV chính ốm, GV thế đã xác nhận qua email…"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mut.isPending}>
            Hủy
          </Button>
          <Button
            onClick={submit}
            disabled={!substituteId || mut.isPending}
            className="gap-1.5"
          >
            {mut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Đánh dấu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────── Dialog 3: Sửa thông tin ─────────────── */

const MODE_OPTIONS = [
  { value: "online",  label: "Online" },
  { value: "offline", label: "Offline" },
  { value: "hybrid",  label: "Hybrid" },
];

interface EditForm {
  session_date: string;
  start_time: string;
  end_time: string;
  room: string;
  mode: string;
  notes: string;
}

export function EditSessionDialog({
  session, classId, onOpenChange,
}: {
  session: SessionRow | null;
  classId: string;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<EditForm>({
    session_date: "",
    start_time: "",
    end_time: "",
    room: "",
    mode: "",
    notes: "",
  });

  useEffect(() => {
    if (session) {
      setForm({
        session_date: session.session_date ?? "",
        start_time: (session.start_time ?? "").slice(0, 5),
        end_time: (session.end_time ?? "").slice(0, 5),
        room: session.room ?? "",
        mode: session.mode ?? "",
        notes: session.notes ?? "",
      });
    }
  }, [session?.id]);

  const mut = useMutation({
    mutationFn: async (args: { sessionId: string; form: EditForm }) => {
      const { error } = await (supabase as any).rpc("admin_update_session_info", {
        p_session_id: args.sessionId,
        p_session_date: args.form.session_date || null,
        p_start_time: args.form.start_time || null,
        p_end_time: args.form.end_time || null,
        p_room: args.form.room.trim() || null,
        p_mode: args.form.mode || null,
        p_notes: args.form.notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã cập nhật thông tin buổi học");
      qc.invalidateQueries({ queryKey: ["class-sessions", classId] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(`Lưu thất bại: ${e.message}`),
  });

  const submit = () => {
    if (!session) return;
    if (!form.session_date) {
      toast.error("Ngày buổi học là bắt buộc.");
      return;
    }
    if (form.start_time && form.end_time && form.start_time >= form.end_time) {
      toast.error("Giờ kết thúc phải sau giờ bắt đầu.");
      return;
    }
    mut.mutate({ sessionId: session.id, form });
  };

  const update = <K extends keyof EditForm>(key: K, value: EditForm[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  return (
    <Dialog open={!!session} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Sửa thông tin buổi {session?.session_number ?? "?"}
          </DialogTitle>
          <DialogDescription>
            Thay đổi ngày/giờ có thể ảnh hưởng đến lịch giáo viên và payroll.
            Chỉ chỉnh khi cần thiết.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Ngày <span className="text-destructive">*</span></Label>
            <Input
              type="date"
              value={form.session_date}
              onChange={(e) => update("session_date", e.target.value)}
              className="h-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Giờ bắt đầu</Label>
              <Input
                type="time"
                value={form.start_time}
                onChange={(e) => update("start_time", e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Giờ kết thúc</Label>
              <Input
                type="time"
                value={form.end_time}
                onChange={(e) => update("end_time", e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Phòng</Label>
              <Input
                value={form.room}
                onChange={(e) => update("room", e.target.value)}
                placeholder="VD: P.301"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hình thức</Label>
              <Select
                value={form.mode || ""}
                onValueChange={(v) => update("mode", v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="— Chọn —" />
                </SelectTrigger>
                <SelectContent>
                  {MODE_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Ghi chú</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Ghi chú nội bộ về buổi học…"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mut.isPending}>
            Hủy
          </Button>
          <Button onClick={submit} disabled={mut.isPending} className="gap-1.5">
            {mut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────── AlertDialog 4: Huỷ buổi ─────────────── */

export function CancelSessionDialog({
  session, classId, onOpenChange,
}: {
  session: SessionRow | null;
  classId: string;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (session) setReason("");
  }, [session?.id]);

  const mut = useMutation({
    mutationFn: async (args: { sessionId: string; reason: string }) => {
      const { error } = await (supabase as any).rpc("admin_cancel_session", {
        p_session_id: args.sessionId,
        p_reason: args.reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã huỷ buổi học");
      qc.invalidateQueries({ queryKey: ["class-sessions", classId] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(`Huỷ buổi thất bại: ${e.message}`),
  });

  const submit = () => {
    if (!session) return;
    if (reason.trim().length < 5) {
      toast.error("Lý do huỷ phải tối thiểu 5 ký tự.");
      return;
    }
    mut.mutate({ sessionId: session.id, reason: reason.trim() });
  };

  return (
    <AlertDialog open={!!session} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Huỷ buổi {session?.session_number ?? "?"}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Buổi học sẽ chuyển sang trạng thái <em>Đã huỷ</em>. Học viên và GV
            sẽ thấy thay đổi này. Hành động này có thể ảnh hưởng đến tổng số
            buổi và lương GV trong tháng.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1.5">
          <Label className="text-xs">Lý do huỷ <span className="text-destructive">*</span></Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="VD: Nghỉ lễ, không đủ học viên, GV bệnh không có người thế…"
            rows={3}
          />
          <p className="text-[10px] text-muted-foreground">Tối thiểu 5 ký tự.</p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={mut.isPending}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            onClick={submit}
            disabled={mut.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {mut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            Huỷ buổi
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
