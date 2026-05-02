import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  GraduationCap, Calendar, Users, BarChart3, Activity, Megaphone,
  Settings, MoreVertical, RefreshCw, AlertTriangle,
  LayoutDashboard, Wallet, Banknote, Clock, Copy,
} from "lucide-react";
import { DetailPageLayout } from "@shared/components/layouts/DetailPageLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@shared/components/ui/tabs";
import { Button } from "@shared/components/ui/button";
import { Skeleton } from "@shared/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle,
} from "@shared/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@shared/components/ui/alert-dialog";
import { Textarea } from "@shared/components/ui/textarea";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import ClassStatusBadge, {
  CLASS_STATUS_OPTIONS, CLASS_STATUS_META, type ClassLifecycleStatus,
} from "@shared/components/admin/ClassStatusBadge";
import { useArchiveClass } from "@admin/features/classes/hooks/useArchiveClass";
import {
  ClassInfoCard,
  type ClassDetail,
} from "@admin/features/classes/components/ClassInfoCard";
import RequestReplacementTeacherButton from "@admin/features/classes/components/RequestReplacementTeacherButton";
import { ClonePlanDialog } from "@admin/features/classes/components/ClonePlanDialog";
import {
  SessionsTab, StudentsTab, PlanProgressTab, ActivityTab,
  AnnouncementsTab, SettingsTab,
  OverviewTab, RevenueTab, PayrollTab, LifecycleTab,
} from "@admin/features/classes/components/detail-tabs";
import { useAuth } from "@shared/hooks/useAuth";

/* ═══════════════════════════════════════════
   Trang chi tiết lớp /classes/:id (admin).
   8 tabs theo phong cách Teacher's Hub. Một số tab (Sessions, Students,
   Plan Progress, Activity, Leaderboard) hiện ở trạng thái placeholder vì
   backend (class_sessions / class_enrollments / class_status_history /
   class_teachers) chưa được provision. Khi schema sẵn sàng, chỉ cần thay
   nội dung component tab tương ứng — header, status selector, archive,
   announcements vẫn hoạt động đầy đủ.
   ═══════════════════════════════════════════ */

const TABS = [
  { value: "overview",       label: "Tổng quan",  icon: LayoutDashboard },
  { value: "sessions",       label: "Buổi học",   icon: Calendar    },
  { value: "students",       label: "Học viên",   icon: Users       },
  { value: "plan-progress",  label: "Tiến độ",    icon: BarChart3   },
  { value: "activity",       label: "Hoạt động",  icon: Activity    },
  { value: "announcements",  label: "Thông báo",  icon: Megaphone   },
  { value: "revenue",        label: "Doanh thu",  icon: Wallet      },
  { value: "payroll",        label: "Lương GV",   icon: Banknote    },
  { value: "lifecycle",      label: "Vòng đời",   icon: Clock       },
  { value: "settings",       label: "Cấu hình",   icon: Settings    },
] as const;

export default function AdminClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const classId = id ?? "";
  // Gate header actions (vd nút "Tìm GV thay thế") theo role.
  // RPC server-side cũng chặn non-admin nên đây thuần UX.
  const { isAdmin } = useAuth();

  /* ─── Query: class detail (sau P4a đọc từ v_class_full — có sẵn course +
     study_plan + teacher + counts join trong 1 row).
     Fallback: nếu view chưa apply ở môi trường cũ → fallback `classes` shim. */
  const { data: cls, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["admin-class-detail", classId],
    queryFn: async (): Promise<ClassDetail | null> => {
      if (!classId) return null;
      // Thử v_class_full trước.
      const v = await (supabase as any)
        .from("v_class_full" as any)
        .select("*")
        .eq("id", classId)
        .maybeSingle();
      if (!v.error && v.data) return v.data as ClassDetail;
      // Fallback shim view / legacy table (P4a `classes` view hoặc teachngo_classes).
      const fallback = await (supabase as any)
        .from("classes" as any)
        .select("*")
        .eq("id", classId)
        .maybeSingle();
      if (fallback.error) throw fallback.error;
      return fallback.data as ClassDetail | null;
    },
    enabled: !!classId,
    staleTime: 15_000,
  });

  /* ─── Mutations: status change ─── */
  const updateStatusMut = useMutation({
    mutationFn: async (args: { status: ClassLifecycleStatus; reason?: string }) => {
      const payload: Record<string, unknown> = {
        lifecycle_status: args.status,
        status_changed_at: new Date().toISOString(),
      };
      if (args.reason !== undefined) payload.cancellation_reason = args.reason || null;
      const { error } = await (supabase as any)
        .from("classes" as any)
        .update(payload)
        .eq("id", classId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã cập nhật trạng thái");
      qc.invalidateQueries({ queryKey: ["admin-class-detail", classId] });
      qc.invalidateQueries({ queryKey: ["admin-classes-list"] });
      qc.invalidateQueries({ queryKey: ["admin-classes-counts"] });
    },
    onError: (e: Error) => toast.error(`Cập nhật thất bại: ${e.message}`),
  });

  /* ─── Archive flow (re-use ClassesListPage hook) ─── */
  const archiveMut = useArchiveClass();
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");

  /* ─── Cancel-reason dialog (khi đổi sang cancelled) ─── */
  const [cancelDraft, setCancelDraft] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  /* ─── Delete dialog (Danger zone) ─── */
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteTypedName, setDeleteTypedName] = useState("");

  /* ─── F3.3 Path B: clone study plan to target class ─── */
  const [clonePlanOpen, setClonePlanOpen] = useState(false);
  const deleteMut = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("classes" as any)
        .delete()
        .eq("id", classId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã xoá lớp");
      qc.invalidateQueries({ queryKey: ["admin-classes-list"] });
      qc.invalidateQueries({ queryKey: ["admin-classes-counts"] });
      navigate("/classes/list", { replace: true });
    },
    onError: (e: Error) => toast.error(`Xoá thất bại: ${e.message}`),
  });

  const handleStatusChange = (next: string) => {
    const status = next as ClassLifecycleStatus;
    if (status === "cancelled") {
      setCancelDraft(status);
      setCancelReason(cls?.cancellation_reason ?? "");
      return;
    }
    if (status === "archived") {
      setConfirmArchive(true);
      return;
    }
    updateStatusMut.mutate({ status, reason: "" });
  };

  const submitCancel = () => {
    if (!cancelDraft) return;
    if (cancelReason.trim().length < 5) {
      toast.error("Lý do huỷ phải tối thiểu 5 ký tự.");
      return;
    }
    updateStatusMut.mutate(
      { status: cancelDraft as ClassLifecycleStatus, reason: cancelReason.trim() },
      { onSettled: () => setCancelDraft(null) },
    );
  };

  const submitArchive = () => {
    archiveMut.mutate(
      { id: classId, action: "archive", reason: archiveReason },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["admin-class-detail", classId] });
        },
        onSettled: () => {
          setConfirmArchive(false);
          setArchiveReason("");
        },
      },
    );
  };

  /* ─── States ─── */
  if (!classId) return null;

  if (isLoading) {
    return (
      <DetailPageLayout
        title="Đang tải…"
        icon={GraduationCap}
        backRoute="/classes/list"
        backLabel="Danh sách lớp"
      >
        <div className="space-y-3">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </DetailPageLayout>
    );
  }

  if (error || !cls) {
    return (
      <DetailPageLayout
        title="Không tìm thấy lớp"
        icon={AlertTriangle}
        backRoute="/classes/list"
        backLabel="Danh sách lớp"
      >
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {error ? (error as Error).message : `Không tìm thấy lớp với id "${classId}".`}
        </div>
      </DetailPageLayout>
    );
  }

  const headerActions = (
    <div className="flex items-center gap-1.5">
      {/* Tìm GV thay thế: chỉ admin/super_admin, lớp đang vận hành/chuẩn bị và đã có GV.
          RPC `request_replacement_teacher` ở DB cũng từ chối non-admin (insufficient_privilege),
          nên đây chỉ là gating UX để giấu nút khỏi role không hợp lệ. */}
      {isAdmin &&
        ["recruiting", "ready", "in_progress"].includes(cls.lifecycle_status ?? "") &&
        (cls.teacher_id || cls.teacher_name) && (
          <RequestReplacementTeacherButton
            classId={cls.id}
            className={cls.name ?? cls.class_name ?? "(không tên)"}
          />
        )}

      {/* Status selector */}
      <Select
        value={cls.lifecycle_status ?? "planning"}
        onValueChange={handleStatusChange}
        disabled={updateStatusMut.isPending}
      >
        <SelectTrigger className="h-9 w-auto min-w-[160px] gap-2 border bg-card text-xs font-medium">
          <SelectValue placeholder="Chọn trạng thái" />
        </SelectTrigger>
        <SelectContent align="end" className="min-w-[200px]">
          {CLASS_STATUS_OPTIONS.map((s) => (
            <SelectItem key={s} value={s} className="text-xs">
              <div className="flex items-center gap-2">
                <ClassStatusBadge status={s} size="sm" />
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Refresh */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 hidden sm:inline-flex"
        onClick={() => refetch()}
        disabled={isRefetching}
        aria-label="Tải lại"
      >
        <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
      </Button>

      {/* More actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Hành động">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {/* F3.3 Path B — luôn show item; nếu chưa có plan thì hint qua toast. */}
          <DropdownMenuItem
            onClick={() => {
              if (!cls.study_plan_id) {
                toast.info(
                  "Lớp chưa có kế hoạch học để sao chép. Vào tab Cấu hình để gán study plan trước.",
                  { duration: 5000 },
                );
                return;
              }
              setClonePlanOpen(true);
            }}
            className="text-xs gap-1.5"
          >
            <Copy className="h-3.5 w-3.5" /> Sao chép kế hoạch học
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {cls.lifecycle_status !== "archived" ? (
            <DropdownMenuItem onClick={() => setConfirmArchive(true)} className="text-xs">
              Lưu trữ lớp
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() =>
                archiveMut.mutate(
                  { id: classId, action: "restore" },
                  { onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-class-detail", classId] }) },
                )
              }
              className="text-xs"
            >
              Khôi phục từ lưu trữ
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => toast.info("Tính năng gửi email đang chuẩn bị")}
            className="text-xs"
          >
            Gửi email cho lớp
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => toast.info("Tính năng xuất Excel đang chuẩn bị")}
            className="text-xs"
          >
            Xuất Excel
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setDeleteTypedName("");
              setConfirmDelete(true);
            }}
            className="text-xs text-destructive focus:text-destructive"
          >
            Xoá lớp…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <DetailPageLayout
      title={cls.name ?? cls.class_name ?? "(không tên)"}
      subtitle={cls.class_code ?? undefined}
      icon={GraduationCap}
      backRoute="/classes/list"
      backLabel="Danh sách lớp"
      actions={headerActions}
    >
      {/* Info header */}
      <ClassInfoCard cls={cls} />

      {/* Tabs */}
      <Tabs defaultValue="overview" className="mt-6">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-max gap-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <TabsTrigger key={t.value} value={t.value} className="gap-1.5 text-xs">
                  <Icon className="h-3.5 w-3.5" /> {t.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab cls={cls} mode="admin" />
        </TabsContent>
        <TabsContent value="sessions" className="mt-4">
          <SessionsTab classId={classId} />
        </TabsContent>
        <TabsContent value="students" className="mt-4">
          <StudentsTab classId={classId} />
        </TabsContent>
        <TabsContent value="plan-progress" className="mt-4">
          <PlanProgressTab classId={classId} studyPlanId={cls.study_plan_id ?? null} />
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          <ActivityTab classId={classId} />
        </TabsContent>
        <TabsContent value="announcements" className="mt-4">
          <AnnouncementsTab classId={classId} />
        </TabsContent>
        <TabsContent value="revenue" className="mt-4">
          <RevenueTab classId={classId} />
        </TabsContent>
        <TabsContent value="payroll" className="mt-4">
          <PayrollTab classId={classId} />
        </TabsContent>
        <TabsContent value="lifecycle" className="mt-4">
          <LifecycleTab cls={cls} />
        </TabsContent>
        <TabsContent value="settings" className="mt-4">
          <SettingsTab cls={cls} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-class-detail", classId] })} />
        </TabsContent>
      </Tabs>

      {/* ─── Cancel-reason dialog ─── */}
      <Dialog open={!!cancelDraft} onOpenChange={(o) => !o && setCancelDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Huỷ lớp học?</DialogTitle>
            <DialogDescription>
              Vui lòng nhập lý do huỷ (tối thiểu 5 ký tự). Lý do sẽ hiển thị
              trên badge trạng thái và lưu vào lịch sử.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="VD: Không đủ học viên đăng ký…"
            rows={4}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelDraft(null)}>Huỷ</Button>
            <Button onClick={submitCancel} disabled={updateStatusMut.isPending}>
              {updateStatusMut.isPending ? "Đang lưu…" : "Xác nhận huỷ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Archive confirm ─── */}
      <Dialog open={confirmArchive} onOpenChange={setConfirmArchive}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lưu trữ lớp học?</DialogTitle>
            <DialogDescription>
              Lớp sẽ ẩn khỏi danh sách thường nhưng giữ toàn bộ thông tin và
              lịch sử. Có thể khôi phục bất kỳ lúc nào.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={archiveReason}
            onChange={(e) => setArchiveReason(e.target.value)}
            placeholder="Lý do lưu trữ (tuỳ chọn)…"
            rows={3}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmArchive(false)}>Huỷ</Button>
            <Button onClick={submitArchive} disabled={archiveMut.isPending}>
              {archiveMut.isPending ? "Đang lưu trữ…" : "Lưu trữ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete confirm (gõ tên lớp để xác nhận) ─── */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá lớp vĩnh viễn?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động không thể hoàn tác. Hãy gõ chính xác tên lớp{" "}
              <span className="font-semibold text-foreground">
                "{cls.name ?? cls.class_name ?? ""}"
              </span>{" "}
              để xác nhận.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label className="text-xs">Tên lớp</Label>
            <Input
              value={deleteTypedName}
              onChange={(e) => setDeleteTypedName(e.target.value)}
              placeholder={cls.name ?? cls.class_name ?? ""}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                deleteMut.isPending ||
                deleteTypedName.trim() !== (cls.name ?? cls.class_name ?? "").trim()
              }
              onClick={() => deleteMut.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMut.isPending ? "Đang xoá…" : "Xoá vĩnh viễn"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* F3.3 Path B clone study plan to target class */}
      {cls.study_plan_id && (
        <ClonePlanDialog
          open={clonePlanOpen}
          onOpenChange={setClonePlanOpen}
          sourceClassId={cls.id}
          sourcePlanId={cls.study_plan_id}
          sourcePlanName={cls.study_plan_name ?? null}
          sourceProgram={cls.program ?? null}
        />
      )}
    </DetailPageLayout>
  );
}
