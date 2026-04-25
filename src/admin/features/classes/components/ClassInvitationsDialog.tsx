// Stage E4 — Admin "Quản lý lời mời" panel for a single class.
//
// Shows every class_invitations row for the class (pending / accepted /
// rejected / cancelled / expired) and lets the admin:
//   • Cancel a pending invitation.
//   • Reassign a pending or rejected invitation to a different teacher.
//   • Resend the invitation email if email_sent_at is NULL (calls the
//     send-class-invitations edge function).
//
// All writes go through the RPCs from 20260425_stage_e1_class_invitations.sql,
// which enforce the admin-only / status transition rules server-side.

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2, Clock, Loader2, Mail, RotateCw, UserCog, XCircle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@shared/components/ui/dialog";
import { Label } from "@shared/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";

const ROLE_LABEL: Record<string, string> = {
  primary: "GV chính",
  ta: "Trợ giảng",
  substitute: "GV dạy thay",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Chờ phản hồi",
  accepted: "Đã chấp nhận",
  rejected: "Đã từ chối",
  cancelled: "Đã hủy",
  expired: "Hết hạn",
};

const STATUS_COLOR: Record<string, "secondary" | "default" | "destructive" | "outline"> = {
  pending: "secondary",
  accepted: "default",
  rejected: "destructive",
  cancelled: "outline",
  expired: "outline",
};

interface InvitationRow {
  id: string;
  class_id: string;
  teacher_id: string;
  role: string;
  status: string;
  invited_at: string;
  responded_at: string | null;
  response_note: string | null;
  email_sent_at: string | null;
  reassigned_to: string | null;
  teachers: { id: string; full_name: string; email: string | null } | null;
}

interface TeacherOption {
  id: string;
  full_name: string;
  email: string | null;
}

interface ClassInvitationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  className?: string;
}

function fmtTs(iso: string | null): string {
  if (!iso) return "—";
  try { return format(parseISO(iso), "dd/MM HH:mm"); } catch { return iso; }
}

export default function ClassInvitationsDialog({
  open, onOpenChange, classId, className,
}: ClassInvitationsDialogProps) {
  const qc = useQueryClient();

  const invitationsQ = useQuery({
    queryKey: ["admin-class-invitations", classId],
    enabled: open,
    queryFn: async (): Promise<InvitationRow[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from as any)("class_invitations")
        .select(
          "id, class_id, teacher_id, role, status, invited_at, responded_at, response_note, email_sent_at, reassigned_to, " +
            "teachers:teacher_id (id, full_name, email)",
        )
        .eq("class_id", classId)
        .order("invited_at", { ascending: false });
      if (error) throw error;
      return (data || []) as InvitationRow[];
    },
  });

  const teachersQ = useQuery({
    queryKey: ["admin-teachers-for-reassign"],
    enabled: open,
    queryFn: async (): Promise<TeacherOption[]> => {
      const { data, error } = await supabase
        .from("teachers")
        .select("id, full_name, email")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data || []) as TeacherOption[];
    },
    staleTime: 60_000,
  });

  const cancelMut = useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)("cancel_class_invitation", {
        p_invitation_id: id,
        p_note: note ?? null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Đã hủy lời mời");
      qc.invalidateQueries({ queryKey: ["admin-class-invitations", classId] });
    },
    onError: (e: Error) => toast.error(e.message || "Không thể hủy lời mời"),
  });

  const reassignMut = useMutation({
    mutationFn: async (vars: { id: string; newTeacherId: string; role: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("reassign_class_invitation", {
        p_invitation_id: vars.id,
        p_new_teacher_id: vars.newTeacherId,
        p_role: vars.role,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast.success("Đã phân công lại");
      qc.invalidateQueries({ queryKey: ["admin-class-invitations", classId] });
    },
    onError: (e: Error) => toast.error(e.message || "Không thể phân công lại"),
  });

  const resendMut = useMutation({
    mutationFn: async (invitationId: string) => {
      const { data, error } = await supabase.functions.invoke("send-class-invitations", {
        body: { invitation_ids: [invitationId] },
      });
      if (error) throw new Error(error.message || "Edge function error");
      return data;
    },
    onSuccess: () => {
      toast.success("Đã gửi lại email");
      qc.invalidateQueries({ queryKey: ["admin-class-invitations", classId] });
    },
    onError: (e: Error) => toast.error(e.message || "Không thể gửi lại email"),
  });

  const [reassignFor, setReassignFor] = useState<InvitationRow | null>(null);
  const [reassignTeacherId, setReassignTeacherId] = useState<string>("");
  const [reassignRole, setReassignRole] = useState<string>("primary");

  useEffect(() => {
    if (reassignFor) {
      setReassignTeacherId("");
      setReassignRole(reassignFor.role || "primary");
    }
  }, [reassignFor?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const teacherOptions = useMemo(() => {
    const blocked = new Set((invitationsQ.data ?? [])
      .filter((i) => i.status === "pending" || i.status === "accepted")
      .map((i) => i.teacher_id));
    return (teachersQ.data ?? []).filter((t) => !blocked.has(t.id));
  }, [invitationsQ.data, teachersQ.data]);

  const rows = invitationsQ.data ?? [];
  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Lời mời dạy lớp</DialogTitle>
            <DialogDescription>
              {className ? <strong>{className}</strong> : "Lớp này"} ·{" "}
              {pendingCount > 0
                ? <>Có <strong>{pendingCount}</strong> lời mời đang chờ phản hồi.</>
                : "Không có lời mời nào đang chờ."}
            </DialogDescription>
          </DialogHeader>

          {invitationsQ.isLoading && (
            <div className="text-center text-muted-foreground py-8">
              <Loader2 className="inline-block animate-spin mr-2 h-4 w-4" /> Đang tải…
            </div>
          )}

          {!invitationsQ.isLoading && rows.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Lớp này chưa có lời mời nào (có thể đã được tạo trước Stage E1).
            </p>
          )}

          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {rows.map((inv) => {
              const canCancel = inv.status === "pending";
              const canReassign = inv.status === "pending" || inv.status === "rejected" || inv.status === "expired";
              const canResend = inv.status === "pending";
              return (
                <div key={inv.id} className="rounded-lg border bg-card p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">
                          {inv.teachers?.full_name || "(GV đã bị xóa)"}
                        </span>
                        <Badge variant="outline" className="text-[10px]">{ROLE_LABEL[inv.role] || inv.role}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">
                        {inv.teachers?.email || "—"}
                      </div>
                    </div>
                    <Badge variant={STATUS_COLOR[inv.status] || "outline"}>
                      {STATUS_LABEL[inv.status] || inv.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Mời: {fmtTs(inv.invited_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" /> Email: {inv.email_sent_at ? fmtTs(inv.email_sent_at) : <span className="text-warning">Chưa gửi</span>}
                    </div>
                    {inv.responded_at && (
                      <div className="flex items-center gap-1 col-span-2">
                        <CheckCircle2 className="h-3 w-3" /> Phản hồi: {fmtTs(inv.responded_at)}
                      </div>
                    )}
                  </div>

                  {inv.response_note && (
                    <div className="text-xs border-l-2 border-border pl-2 text-muted-foreground">
                      <strong className="text-foreground">Ghi chú:</strong> {inv.response_note}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    {canResend && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={resendMut.isPending}
                        onClick={() => resendMut.mutate(inv.id)}
                      >
                        {resendMut.isPending ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <Mail className="h-3 w-3 mr-1.5" />}
                        Gửi lại email
                      </Button>
                    )}
                    {canReassign && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReassignFor(inv)}
                      >
                        <UserCog className="h-3 w-3 mr-1.5" /> Phân công lại
                      </Button>
                    )}
                    {canCancel && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={cancelMut.isPending}
                        onClick={() => cancelMut.mutate({ id: inv.id })}
                      >
                        <XCircle className="h-3 w-3 mr-1.5" /> Hủy
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => invitationsQ.refetch()} disabled={invitationsQ.isFetching}>
              {invitationsQ.isFetching ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5 mr-1.5" />}
              Tải lại
            </Button>
            <Button onClick={() => onOpenChange(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reassignFor} onOpenChange={(o) => !o && setReassignFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Phân công lại</DialogTitle>
            <DialogDescription>
              Lời mời cho <strong>{reassignFor?.teachers?.full_name || "GV cũ"}</strong>
              {reassignFor?.status === "pending" ? " sẽ bị hủy" : " đã bị từ chối/hết hạn"}
              {" "}và một lời mời mới sẽ được tạo cho GV bạn chọn dưới đây.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Giáo viên mới</Label>
              <Select value={reassignTeacherId} onValueChange={setReassignTeacherId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Chọn giáo viên…" />
                </SelectTrigger>
                <SelectContent>
                  {teacherOptions.length === 0 ? (
                    <div className="text-xs text-muted-foreground p-3">
                      Tất cả GV còn lại đã có lời mời cho lớp này.
                    </div>
                  ) : teacherOptions.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.full_name} {t.email ? <span className="text-muted-foreground text-xs"> · {t.email}</span> : null}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vai trò</Label>
              <Select value={reassignRole} onValueChange={setReassignRole}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">GV chính</SelectItem>
                  <SelectItem value="ta">Trợ giảng</SelectItem>
                  <SelectItem value="substitute">GV dạy thay</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignFor(null)}>Hủy</Button>
            <Button
              disabled={!reassignTeacherId || reassignMut.isPending}
              onClick={() => {
                if (!reassignFor || !reassignTeacherId) return;
                reassignMut.mutate({
                  id: reassignFor.id,
                  newTeacherId: reassignTeacherId,
                  role: reassignRole,
                }, {
                  onSuccess: () => setReassignFor(null),
                });
              }}
            >
              {reassignMut.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
