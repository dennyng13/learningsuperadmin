import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  GraduationCap, Calendar, Users, BarChart3, Activity, Megaphone,
  Settings, MoreVertical, RefreshCw, AlertTriangle,
  LayoutDashboard, Wallet, Banknote, Clock, Copy, FilePlus2,
  Mail, Send, RotateCw, ArrowLeft,
} from "lucide-react";
import { DetailPageLayout } from "@shared/components/layouts/DetailPageLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@shared/components/ui/tabs";
import { Button } from "@shared/components/ui/button";
import { Skeleton } from "@shared/components/ui/skeleton";
import { cn } from "@shared/lib/utils";
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
import ClassInvitationsDialog from "@admin/features/classes/components/ClassInvitationsDialog";
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

/* Day 7: ClassID URL contract — accept BOTH UUID and class_code in route.
   - UUID matches if string passes RFC 4122 v4-ish regex (32 hex + 4 dashes).
   - Anything else treated as class_code (e.g. "IE-CB-A19-260501").
   - Lookup priority: UUID → eq(id); else eq(class_code) first, fallback eq(id).
   - Canonical UUID always used for downstream queries (cls.id post-resolve).

   Cross-portal: Teacher Portal must mirror this resolver pattern so URLs
   like /classes/IE-CB-A19-260501 work consistently across both portals. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const looksLikeUuid = (s: string): boolean => UUID_RE.test(s);

export default function AdminClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const urlParam = id ?? "";
  // Gate header actions (vd nút "Tìm GV thay thế") theo role.
  // RPC server-side cũng chặn non-admin nên đây thuần UX.
  const { isAdmin } = useAuth();

  /* ─── Query: class detail. Resolves either UUID or class_code in URL. ─── */
  const { data: cls, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["admin-class-detail", urlParam],
    queryFn: async (): Promise<ClassDetail | null> => {
      if (!urlParam) return null;

      // Helper: query a table/view với column match.
      const queryByCol = async (table: string, col: "id" | "class_code") => {
        const r = await (supabase as any)
          .from(table as any)
          .select("*")
          .eq(col, urlParam)
          .maybeSingle();
        return r;
      };

      const isUuid = looksLikeUuid(urlParam);

      // 1. v_class_full primary lookup.
      const vKey = isUuid ? "id" : "class_code";
      const v = await queryByCol("v_class_full", vKey);
      if (!v.error && v.data) return v.data as ClassDetail;

      // 2. Fallback to classes shim với cùng key.
      const fb = await queryByCol("classes", vKey);
      if (!fb.error && fb.data) return fb.data as ClassDetail;

      // 3. Cross-fallback: nếu code lookup miss, thử id (defensive cho
      //    edge cases như code chứa dashes giống UUID).
      if (!isUuid) {
        const v2 = await queryByCol("v_class_full", "id");
        if (!v2.error && v2.data) return v2.data as ClassDetail;
      }

      return null;
    },
    enabled: !!urlParam,
    staleTime: 15_000,
  });

  /* Canonical UUID for downstream queries/mutations. Derived from resolved
     cls.id; fallback to urlParam (only used during initial load before cls
     resolves — sub-queries gated by enabled: !!classId still evaluate
     correctly because urlParam is non-empty when route active). */
  const classId = cls?.id ?? urlParam;

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
      qc.invalidateQueries({ queryKey: ["admin-class-detail"] });
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

  /* ─── Resolve attached study_plan_id via 2-path lookup (mirrors
     PlanProgressTab + ClonePlanDialog). Class có thể gắn plan qua:
     (1) app_classes.study_plan_id direct, hoặc
     (2) study_plans.class_ids @> [classId] (F3 v2 reverse).
     Khi #1 null nhưng #2 has value, KPI vẫn show "Đã gắn". */
  const attachedPlanQ = useQuery({
    queryKey: ["class-attached-plan", classId, cls?.study_plan_id],
    enabled: !!classId,
    queryFn: async (): Promise<{ id: string; plan_name: string | null } | null> => {
      // Path 1: direct study_plan_id
      if (cls?.study_plan_id) {
        const { data } = await (supabase as any)
          .from("study_plans")
          .select("id, plan_name")
          .eq("id", cls.study_plan_id)
          .maybeSingle();
        if (data) return data as { id: string; plan_name: string | null };
      }
      // Path 2: reverse class_ids[]
      const { data } = await (supabase as any)
        .from("study_plans")
        .select("id, plan_name")
        .contains("class_ids", [classId])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as { id: string; plan_name: string | null } | null) ?? null;
    },
    staleTime: 60_000,
  });

  /* ─── Day 7 invitation flow — summary query + send/resend mutations ─── */
  const invitationSummaryQ = useQuery({
    queryKey: ["class-invitation-summary", classId],
    enabled: !!classId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("class_invitations")
        .select("id, status, email_sent_at")
        .eq("class_id", classId);
      if (error) throw error;
      const rows = (data ?? []) as { id: string; status: string; email_sent_at: string | null }[];
      const total = rows.length;
      const pending = rows.filter((r) => r.status === "pending").length;
      const accepted = rows.filter((r) => r.status === "accepted").length;
      const rejected = rows.filter((r) => r.status === "rejected").length;
      const everSent = rows.some((r) => !!r.email_sent_at);
      return { total, pending, accepted, rejected, everSent, rows };
    },
    staleTime: 30_000,
  });

  const sendInvitationsMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("send-class-invitations", {
        body: { class_id: classId },
      });
      if (error) throw new Error(error.message ?? "Edge function error");
    },
    onSuccess: () => {
      toast.success("Đã gửi lời mời tới giáo viên.");
      qc.invalidateQueries({ queryKey: ["class-invitation-summary", classId] });
      qc.invalidateQueries({ queryKey: ["admin-class-invitations", classId] });
    },
    onError: (e: Error) => toast.error(`Không gửi được: ${e.message}`),
  });

  const resendInvitationsMut = useMutation({
    mutationFn: async () => {
      // Reset email_sent_at via batch_resend RPC, then re-invoke edge function.
      const { error: clearErr } = await (supabase.rpc as any)("batch_resend_class_invitations", {
        p_class_id: classId,
        p_invitation_ids: null,
      });
      if (clearErr) throw new Error(clearErr.message);
      const { error: sendErr } = await supabase.functions.invoke("send-class-invitations", {
        body: { class_id: classId },
      });
      if (sendErr) throw new Error(sendErr.message ?? "Edge function error");
    },
    onSuccess: () => {
      toast.success("Đã gửi lại lời mời.");
      qc.invalidateQueries({ queryKey: ["class-invitation-summary", classId] });
      qc.invalidateQueries({ queryKey: ["admin-class-invitations", classId] });
    },
    onError: (e: Error) => toast.error(`Gửi lại thất bại: ${e.message}`),
  });

  const [confirmResendInvites, setConfirmResendInvites] = useState(false);
  /* Day 7 verify fix: rich invitation manager dialog (swap GV chính / TA /
     phụ + reassign + deadline + negotiation). Replaces brittle binary
     "Mời/Mời lại" toggle with always-visible "Quản lý lời mời". */
  const [inviteManagerOpen, setInviteManagerOpen] = useState(false);

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
          qc.invalidateQueries({ queryKey: ["admin-class-detail"] });
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

      {/* Invitation status indicator — Day 7 UX */}
      {invitationSummaryQ.data && (
        <div className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-md border">
          <Mail className="h-3 w-3 shrink-0" />
          {invitationSummaryQ.data.total === 0 ? (
            <span className="text-muted-foreground">Chưa có lời mời</span>
          ) : !invitationSummaryQ.data.everSent ? (
            <span className="text-amber-700 dark:text-amber-400">
              Chưa gửi · {invitationSummaryQ.data.total} lời mời chờ
            </span>
          ) : (
            <span className="text-foreground">
              <strong>{invitationSummaryQ.data.accepted}</strong>
              <span className="text-muted-foreground">/{invitationSummaryQ.data.total}</span>
              <span className="ml-1 text-muted-foreground">đã đồng ý</span>
              {invitationSummaryQ.data.pending > 0 && (
                <span className="ml-1 text-amber-700 dark:text-amber-400">
                  · {invitationSummaryQ.data.pending} chờ
                </span>
              )}
            </span>
          )}
        </div>
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
        <DropdownMenuContent align="end" className="w-60">
          {/* Day 7 verify fix — invitation actions luôn show 2 items để
              UX rõ ràng (binary toggle trước đây gây nhầm). */}
          <DropdownMenuItem
            onClick={() => setInviteManagerOpen(true)}
            className="text-xs gap-1.5"
          >
            <Mail className="h-3.5 w-3.5" /> Quản lý lời mời
            {invitationSummaryQ.data && invitationSummaryQ.data.total > 0 && (
              <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                {invitationSummaryQ.data.accepted}/{invitationSummaryQ.data.total}
              </span>
            )}
          </DropdownMenuItem>
          {invitationSummaryQ.data && invitationSummaryQ.data.total > 0 && (
            invitationSummaryQ.data.everSent ? (
              <DropdownMenuItem
                onClick={() => setConfirmResendInvites(true)}
                className="text-xs gap-1.5"
                disabled={resendInvitationsMut.isPending}
              >
                <RotateCw className="h-3.5 w-3.5" /> Gửi lại email lời mời
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => sendInvitationsMut.mutate()}
                className="text-xs gap-1.5"
                disabled={sendInvitationsMut.isPending}
              >
                <Send className="h-3.5 w-3.5" /> Gửi email lời mời
              </DropdownMenuItem>
            )
          )}
          <DropdownMenuSeparator />

          {/* F3.3 Path B — clone plan to target class.
              Dialog tự resolve plan → empty state nếu không có. */}
          <DropdownMenuItem
            onClick={() => setClonePlanOpen(true)}
            className="text-xs gap-1.5"
          >
            <Copy className="h-3.5 w-3.5" /> Sao chép kế hoạch học
          </DropdownMenuItem>

          {/* F3.3+ Sao chép lớp — đi vào wizard với prefill từ class hiện tại.
              Cho phép nhân bản nhanh: program/course/plan/maxStudents/mode/branch
              giữ nguyên, user adjust phần còn lại (lịch, GV, ngày bắt đầu, v.v.). */}
          <DropdownMenuItem
            onClick={() => {
              navigate("/classes/new", {
                state: {
                  preset: {
                    program: cls.program ?? "",
                    course_id: cls.course_id ?? null,
                    course_title: cls.course_name ?? "",
                    level: cls.level ?? "",
                    class_type: (cls.class_type === "private" ? "private" : "standard") as
                      "standard" | "private",
                    max_students: cls.max_students ?? null,
                    study_plan_id: cls.study_plan_id ?? null,
                    description: cls.description ?? "",
                    leaderboard_enabled: cls.leaderboard_enabled ?? false,
                    branch: cls.branch ?? "",
                    mode: cls.mode ?? "",
                    sourceClassName: cls.name ?? cls.class_name ?? "",
                  },
                },
              });
            }}
            className="text-xs gap-1.5"
          >
            <FilePlus2 className="h-3.5 w-3.5" /> Sao chép lớp (clone wizard)
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
                  { onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-class-detail"] }) },
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

  /* Day 7 verify deep refactor — full hero replacing
     DetailPageLayout + ClassInfoCard per mockup pages-class-detail.jsx.
     Computed values cho hero: progress ring %, week info, vibe colors. */
  const sessionsDone = cls.sessions_completed ?? 0;
  const sessionsTotal = cls.sessions_total ?? 0;
  const progressPct = sessionsTotal > 0 ? Math.min(100, Math.round((sessionsDone / sessionsTotal) * 100)) : 0;

  /* Vibe color from program — matches /classes/list card header tones. */
  const HERO_VIBE: Record<string, { bg: string; ring: string; ringTrack: string; chipBg: string; chipText: string; dot: string; label: string }> = {
    ielts:      { bg: "from-teal-100 via-teal-50 to-white",   ring: "stroke-teal-500",   ringTrack: "stroke-teal-100",   chipBg: "bg-teal-100",   chipText: "text-teal-800",   dot: "bg-teal-500",   label: "IELTS" },
    wre:        { bg: "from-rose-100 via-rose-50 to-white",   ring: "stroke-rose-500",   ringTrack: "stroke-rose-100",   chipBg: "bg-rose-100",   chipText: "text-rose-800",   dot: "bg-rose-500",   label: "WRE" },
    customized: { bg: "from-amber-100 via-amber-50 to-white", ring: "stroke-amber-500", ringTrack: "stroke-amber-100", chipBg: "bg-amber-100", chipText: "text-amber-800", dot: "bg-amber-500", label: "Customized" },
  };
  const heroVibe = HERO_VIBE[cls.program?.toLowerCase() ?? ""] ?? HERO_VIBE.ielts;

  return (
    <div className="max-w-5xl mx-auto px-4 py-5 md:py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-bold mb-3 text-muted-foreground">
        <button
          type="button"
          onClick={() => navigate("/classes/list")}
          className="inline-flex items-center justify-center h-7 w-7 rounded-pop border-[1.5px] border-lp-ink/30 hover:border-lp-ink/60 hover:bg-lp-yellow/20 transition-colors text-lp-ink"
          aria-label="Quay lại danh sách lớp"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => navigate("/classes/list")} className="hover:text-lp-ink transition-colors">
          Lớp học
        </button>
        <span className="text-lp-ink/30">/</span>
        <span className="font-mono text-lp-ink">{cls.class_code ?? "—"}</span>
        <span className="text-lp-ink/30">/</span>
        <span className="text-lp-ink/60">Chi tiết</span>
      </div>

      {/* ═══ Hero card — mockup pages-class-detail vibe ═══ */}
      <section className={cn(
        "relative rounded-2xl border-[2.5px] border-lp-ink overflow-hidden mb-5",
        "bg-gradient-to-br", heroVibe.bg,
      )}>
        {/* Decorative dot grid (subtle) */}
        <div
          className="absolute top-0 right-20 w-40 h-24 opacity-10 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1.5px)",
            backgroundSize: "12px 12px",
          }}
        />

        <div className="relative p-5 md:p-6 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5 items-start">
          {/* Left — main info */}
          <div className="min-w-0 space-y-2">
            {/* Top badges row */}
            <div className="flex items-center gap-2 flex-wrap">
              {cls.program && (
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-display font-bold border border-lp-ink/15",
                  heroVibe.chipBg, heroVibe.chipText,
                )}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", heroVibe.dot)} />
                  {heroVibe.label}
                  {cls.level && <span className="opacity-70">· {cls.level}</span>}
                </span>
              )}
              {sessionsTotal > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-display font-bold bg-white/70 border-[1.5px] border-lp-ink/30 text-lp-ink">
                  {sessionsTotal} buổi
                </span>
              )}
              <ClassStatusBadge
                status={cls.lifecycle_status}
                reason={cls.cancellation_reason}
                size="sm"
              />
            </div>

            {/* Code mono */}
            <p className="font-mono text-[11px] font-bold text-lp-body tracking-wider">
              {cls.class_code ?? "—"}
            </p>

            {/* Class title */}
            <h1 className="font-display text-2xl md:text-3xl font-extrabold leading-tight text-lp-ink">
              {cls.name ?? cls.class_name ?? "(không tên)"}
            </h1>

            {/* Description */}
            {cls.description && (
              <p className="text-sm text-lp-body max-w-2xl leading-relaxed">
                {cls.description}
              </p>
            )}

            {/* Meta row: teacher + schedule */}
            <div className="flex flex-wrap gap-x-5 gap-y-2 pt-2">
              {cls.teacher_name && (
                <div className="flex items-center gap-2 min-w-0">
                  {cls.teacher_avatar_url ? (
                    <img
                      src={cls.teacher_avatar_url}
                      alt={cls.teacher_name}
                      className="h-9 w-9 rounded-full border-[2px] border-lp-ink object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full border-[2px] border-lp-ink bg-lp-coral text-white font-display font-extrabold text-sm flex items-center justify-center shrink-0">
                      {cls.teacher_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-display font-bold text-sm text-lp-ink truncate">
                      {cls.teacher_name}
                    </p>
                    <p className="text-[10px] text-lp-body">Giáo viên chính</p>
                  </div>
                </div>
              )}
              {(cls.schedule || (cls.default_start_time && cls.default_end_time)) && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-lp-body shrink-0" />
                  <div>
                    <p className="font-display font-bold text-sm text-lp-ink">
                      {cls.schedule || `${cls.default_start_time?.slice(0, 5)} → ${cls.default_end_time?.slice(0, 5)}`}
                    </p>
                    <p className="text-[10px] text-lp-body">
                      {cls.room ? `Phòng ${cls.room}` : "Chưa gán phòng"}
                      {cls.branch && ` · ${cls.branch}`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right — progress ring + actions */}
          <div className="flex flex-col items-end gap-3 shrink-0">
            {sessionsTotal > 0 && (
              <ProgressRing pct={progressPct} vibeRing={heroVibe.ring} vibeTrack={heroVibe.ringTrack} />
            )}
            <div className="flex items-center gap-1.5">
              {headerActions}
            </div>
          </div>
        </div>

        {/* Hero stat strip (6 cards) */}
        <div className="relative border-t-[2px] border-lp-ink/10 bg-white/40 backdrop-blur-sm grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x-[1.5px] divide-lp-ink/10">
          <HeroStat
            value={`${cls.student_count ?? 0}${cls.max_students ? ` / ${cls.max_students}` : ""}`}
            label="Học viên"
          />
          <HeroStat
            value={`${sessionsDone} / ${sessionsTotal || "—"}`}
            label="Buổi đã học"
          />
          <HeroStat
            value={invitationSummaryQ.data
              ? `${invitationSummaryQ.data.accepted} / ${invitationSummaryQ.data.total}`
              : "—"}
            label="Giáo viên đồng ý"
            extraClass={invitationSummaryQ.data?.everSent === false && (invitationSummaryQ.data?.total ?? 0) > 0 ? "text-amber-700" : undefined}
          />
          <HeroStat
            value={attachedPlanQ.data ? "Đã gắn" : attachedPlanQ.isLoading ? "…" : "Chưa gắn"}
            label="Study plan"
            extraClass={attachedPlanQ.data ? "text-teal-700" : "text-muted-foreground"}
          />
          <HeroStat
            value={cls.start_date ? formatDateDDMMYYYY(cls.start_date) : "—"}
            label="Ngày khai giảng"
          />
          <HeroStat
            value={cls.end_date ? formatDateDDMMYYYY(cls.end_date) : "—"}
            label="Ngày kết thúc"
          />
        </div>
      </section>

      {/* Info header — chi tiết metadata (giữ existing card cho deep info) */}
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
          <SettingsTab cls={cls} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-class-detail"] })} />
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
      {/* Resend invitations confirm — Day 7 UX */}
      <AlertDialog open={confirmResendInvites} onOpenChange={setConfirmResendInvites}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gửi lại lời mời tới giáo viên?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Sẽ gửi lại email tới{" "}
                  <strong>{invitationSummaryQ.data?.pending ?? 0} giáo viên đang chờ phản hồi</strong>.
                  Email gửi trước đó sẽ bị reset (email_sent_at xoá) và gửi mới ngay.
                </p>
                {invitationSummaryQ.data?.accepted ? (
                  <p className="text-xs text-muted-foreground">
                    {invitationSummaryQ.data.accepted} giáo viên đã đồng ý — sẽ KHÔNG được gửi lại.
                  </p>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                resendInvitationsMut.mutate();
                setConfirmResendInvites(false);
              }}
              disabled={resendInvitationsMut.isPending}
            >
              {resendInvitationsMut.isPending ? "Đang gửi..." : "Gửi lại"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* F3.3 Path B clone study plan to target class.
          Dialog tự pick source plan từ list (auto-detect plan hiện tại của
          class + filter same course/program) — không pre-gate ở caller. */}
      <ClonePlanDialog
        open={clonePlanOpen}
        onOpenChange={setClonePlanOpen}
        sourceClassId={cls.id}
        sourceProgram={cls.program ?? null}
        sourceCourseId={cls.course_id ?? null}
      />

      {/* Day 7 verify fix: rich invitation manager dialog (swap GV chính,
          GV phụ, TA + reassign + deadline + negotiation). User direction
          "Khi gửi lời mời lại có thể cho thay giảng viên, TA, giảng viên
          phụ, Ai accept thì sẽ được ghi đè làm dữ liệu chính." Backend
          ClassInvitationsDialog đã có reassign + send-class-invitations +
          batch_resend. Multi-row pattern (mỗi candidate = 1 invitation row,
          ai accept → ghi đè teacher_id ở app_classes thông qua RLS rule). */}
      <ClassInvitationsDialog
        open={inviteManagerOpen}
        onOpenChange={setInviteManagerOpen}
        classId={cls.id}
        className={cls.name ?? cls.class_name ?? undefined}
      />
    </div>
  );
}

/* ─── Hero progress ring + stat cells (Day 7 deep refactor) ─── */

interface ProgressRingProps {
  pct: number;
  vibeRing: string;
  vibeTrack: string;
}

function ProgressRing({ pct, vibeRing, vibeTrack }: ProgressRingProps) {
  // SVG ring — 88×88 viewBox, r=38, circumference ~239.
  const r = 38;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center w-24 h-24 shrink-0">
      <svg viewBox="0 0 88 88" className="absolute inset-0 -rotate-90">
        <circle
          cx="44" cy="44" r={r}
          fill="none" strokeWidth="8"
          className={vibeTrack}
        />
        <circle
          cx="44" cy="44" r={r}
          fill="none" strokeWidth="8" strokeLinecap="round"
          className={cn("transition-all duration-500", vibeRing)}
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="relative text-center">
        <p className="font-display text-2xl font-extrabold leading-none text-lp-ink tabular-nums">
          {pct}<span className="text-base">%</span>
        </p>
        <p className="text-[9px] text-lp-body uppercase tracking-wider font-semibold mt-0.5">
          tiến độ
        </p>
      </div>
    </div>
  );
}

interface HeroStatProps {
  value: string;
  label: string;
  extraClass?: string;
}

function HeroStat({ value, label, extraClass }: HeroStatProps) {
  return (
    <div className="px-3 py-2.5 text-center md:text-left">
      <p className={cn("font-display text-lg md:text-xl font-extrabold leading-tight tabular-nums truncate", extraClass)}>
        {value}
      </p>
      <p className="text-[10px] text-lp-body uppercase tracking-wider font-semibold mt-0.5">
        {label}
      </p>
    </div>
  );
}
