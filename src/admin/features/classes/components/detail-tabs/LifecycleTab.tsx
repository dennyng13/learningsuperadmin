import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { History as HistoryIcon, Loader2, Ban, Mail, ExternalLink, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ClassStatusBadge, {
  type ClassLifecycleStatus,
} from "@shared/components/admin/ClassStatusBadge";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@shared/components/ui/dialog";
import { Textarea } from "@shared/components/ui/textarea";
import type { ClassDetail } from "@admin/features/classes/components/ClassInfoCard";
import ClassInvitationsDialog from "@admin/features/classes/components/ClassInvitationsDialog";

type HistoryEvent = {
  id: string;
  from_status: string | null;
  to_status: string | null;
  reason: string | null;
  changed_by: string | null;
  changed_by_name: string | null;
  changed_by_role: string | null;
  created_at: string;
};

export function LifecycleTab({ cls }: { cls: ClassDetail }) {
  const qc = useQueryClient();
  const classId = cls.id;
  const status = (cls.lifecycle_status ?? "planning") as ClassLifecycleStatus;

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [invitesDialogOpen, setInvitesDialogOpen] = useState(false);

  const historyQ = useQuery({
    queryKey: ["class-status-history", classId],
    queryFn: async (): Promise<HistoryEvent[]> => {
      const { data, error } = await (supabase as any).rpc("get_class_status_history", {
        p_class_id: classId,
      });
      if (error) throw error;
      return (data ?? []) as HistoryEvent[];
    },
    enabled: !!classId,
    staleTime: 15_000,
  });

  /* ─── Invitations summary (compact, top 5 — full management trong dialog) ─── */
  const invitesQ = useQuery({
    queryKey: ["lifecycle-invitations-summary", classId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from as any)("class_invitations")
        .select(
          "id, status, invited_at, responded_at, role, respond_deadline, " +
            "teachers:teacher_id (id, full_name)",
        )
        .eq("class_id", classId)
        .order("invited_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string; status: string; invited_at: string; responded_at: string | null;
        role: string; respond_deadline: string | null;
        teachers: { id: string; full_name: string } | null;
      }>;
    },
    enabled: !!classId,
    staleTime: 15_000,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["admin-class-detail", classId] });
    qc.invalidateQueries({ queryKey: ["class-status-history", classId] });
    qc.invalidateQueries({ queryKey: ["admin-classes-list"] });
  };

  const cancelMut = useMutation({
    mutationFn: async (reason: string) => {
      const { error } = await (supabase as any)
        .from("classes" as any)
        .update({
          lifecycle_status: "cancelled",
          cancellation_reason: reason,
          status_changed_at: new Date().toISOString(),
        })
        .eq("id", classId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã huỷ lớp");
      setCancelOpen(false);
      setCancelReason("");
      invalidateAll();
    },
    onError: (e: Error) => toast.error(`Huỷ thất bại: ${e.message}`),
  });

  const submitCancel = () => {
    if (cancelReason.trim().length < 5) {
      toast.error("Lý do huỷ phải tối thiểu 5 ký tự.");
      return;
    }
    cancelMut.mutate(cancelReason.trim());
  };

  const canCancel = !["cancelled", "completed", "archived"].includes(status);

  const invites = invitesQ.data ?? [];
  const pendingInvites = invites.filter((i) => i.status === "pending").length;
  const acceptedInvites = invites.filter((i) => i.status === "accepted").length;

  const inviteStatusTone: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    accepted: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    rejected: "bg-destructive/15 text-destructive border-destructive/30",
    cancelled: "bg-muted text-muted-foreground border-border",
    expired: "bg-muted text-muted-foreground border-border",
  };
  const inviteStatusLabel: Record<string, string> = {
    pending: "Chờ phản hồi",
    accepted: "Đã chấp nhận",
    rejected: "Đã từ chối",
    cancelled: "Đã huỷ",
    expired: "Hết hạn",
  };

  return (
    <div className="space-y-5">
      {/* Current status */}
      <div className="rounded-2xl border bg-card p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Trạng thái hiện tại
          </p>
          <ClassStatusBadge status={status} />
          {cls.status_changed_at && (
            <p className="text-xs text-muted-foreground">
              Cập nhật{" "}
              {formatDistanceToNow(new Date(cls.status_changed_at), {
                addSuffix: true,
                locale: vi,
              })}
            </p>
          )}
        </div>
        {canCancel && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setCancelOpen(true)}
            className="gap-1.5"
          >
            <Ban className="h-4 w-4" />
            Huỷ lớp
          </Button>
        )}
      </div>

      {/* Invitations summary */}
      <div className="rounded-2xl border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" /> Lời mời giảng viên
            </h3>
            <p className="text-xs text-muted-foreground">
              {invites.length === 0
                ? "Chưa có lời mời nào."
                : <>Tổng <strong className="text-foreground">{invites.length}</strong> lời mời gần nhất ·{" "}
                    <span className="text-amber-600 dark:text-amber-400 font-medium">{pendingInvites} chờ</span> ·{" "}
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">{acceptedInvites} chấp nhận</span></>}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInvitesDialogOpen(true)}
            className="gap-1.5"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Quản lý lời mời
          </Button>
        </div>

        {invitesQ.isLoading ? (
          <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Đang tải…
          </div>
        ) : invites.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-center text-xs text-muted-foreground">
            Lớp chưa có lời mời giảng viên nào.
          </div>
        ) : (
          <ul className="divide-y divide-border/60 -mx-2">
            {invites.slice(0, 5).map((inv) => {
              const overdue =
                inv.status === "pending" &&
                inv.respond_deadline &&
                new Date(inv.respond_deadline).getTime() < Date.now();
              return (
                <li key={inv.id} className="px-2 py-2 flex items-center gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {inv.teachers?.full_name ?? "(GV không xác định)"}
                    </p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(inv.invited_at), { addSuffix: true, locale: vi })}
                      {inv.role && <span className="opacity-70">· {inv.role}</span>}
                    </p>
                  </div>
                  {overdue && (
                    <Badge variant="outline" className="border-destructive/40 text-destructive text-[10px]">
                      Quá hạn
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${inviteStatusTone[inv.status] ?? ""}`}
                  >
                    {inviteStatusLabel[inv.status] ?? inv.status}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}

        {invites.length > 5 && (
          <p className="text-[11px] text-muted-foreground text-center">
            Còn {invites.length - 5} lời mời khác — bấm "Quản lý lời mời" để xem đầy đủ.
          </p>
        )}
      </div>

      {/* History timeline */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <HistoryIcon className="h-4 w-4" /> Lịch sử thay đổi
        </h3>
        {historyQ.isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Đang tải…
          </div>
        ) : historyQ.error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {(historyQ.error as Error).message}
          </div>
        ) : (historyQ.data ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Chưa có thay đổi trạng thái nào được ghi nhận.
            </p>
          </div>
        ) : (
          <ol className="relative border-l border-border ml-3 space-y-4">
            {(historyQ.data ?? []).map((e) => (
              <li key={e.id} className="ml-4">
                <div className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                <p className="text-[11px] text-muted-foreground">
                  {new Date(e.created_at).toLocaleString("vi-VN")}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap text-sm">
                  {e.from_status && (
                    <>
                      <ClassStatusBadge
                        status={e.from_status as ClassLifecycleStatus}
                        size="sm"
                      />
                      <span className="text-muted-foreground">→</span>
                    </>
                  )}
                  {e.to_status && (
                    <ClassStatusBadge
                      status={e.to_status as ClassLifecycleStatus}
                      size="sm"
                    />
                  )}
                </div>
                {(e.changed_by_name || e.changed_by_role) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    bởi{" "}
                    <span className="font-medium text-foreground">
                      {e.changed_by_name ?? "—"}
                    </span>
                    {e.changed_by_role && (
                      <span className="ml-1 opacity-70">({e.changed_by_role})</span>
                    )}
                  </p>
                )}
                {e.reason && (
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    Lý do: {e.reason}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Cancel dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Huỷ lớp học?</DialogTitle>
            <DialogDescription>
              Lý do huỷ là bắt buộc (tối thiểu 5 ký tự) và sẽ được lưu vào
              lịch sử trạng thái.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="VD: Không đủ học viên đăng ký…"
            rows={4}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>
              Đóng
            </Button>
            <Button
              variant="destructive"
              onClick={submitCancel}
              disabled={cancelMut.isPending}
            >
              {cancelMut.isPending ? "Đang lưu…" : "Xác nhận huỷ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full invitations management dialog */}
      <ClassInvitationsDialog
        open={invitesDialogOpen}
        onOpenChange={setInvitesDialogOpen}
        classId={classId}
        className={cls.name ?? cls.class_name ?? undefined}
      />
    </div>
  );
}