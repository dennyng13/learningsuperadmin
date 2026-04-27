// Stage E4 + P1 — Admin "Quản lý lời mời" panel for a single class.
//
// Shows every class_invitations row for the class (pending / accepted /
// rejected / cancelled / expired) and lets the admin:
//   • Cancel a pending invitation.
//   • Reassign a pending or rejected invitation to a different teacher.
//   • Resend the invitation email if email_sent_at is NULL (calls the
//     send-class-invitations edge function).
//   • [P1] Set / change `respond_deadline` per invitation (RPC
//     set_invitation_deadline) with countdown badge.
//   • [P1] See the 1-round negotiation thread (teacher's request +
//     admin's response) and respond via respond_invitation_negotiation.
//   • [P1] Batch-resend all pending invitations of the class via
//     batch_resend_class_invitations + send-class-invitations.
//
// Server-side rules live in 20260425_stage_e1_class_invitations.sql and
// 20260428_stage_p1_invitation_deadline_negotiation.sql.

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlarmClock, CalendarClock, CheckCircle2, Clock, Loader2, Mail, MessagesSquare, RotateCw, Send, UserCog, XCircle,
} from "lucide-react";
import { format, formatDistanceToNowStrict, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@shared/components/ui/dialog";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import { Textarea } from "@shared/components/ui/textarea";

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

const RATE_UNIT_LABEL: Record<string, string> = {
  session: "buổi",
  hour: "giờ",
  day: "ngày",
  month: "tháng",
  student: "học viên",
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
  respond_deadline: string | null;
  proposed_rate_amount_vnd: number | null;
  proposed_rate_unit: string | null;
  negotiation_status: "none" | "requested" | "admin_responded" | "closed" | null;
  negotiation_message_teacher: string | null;
  negotiation_requested_at: string | null;
  negotiation_message_admin: string | null;
  negotiation_responded_at: string | null;
  negotiation_proposed_rate_amount_vnd: number | null;
  negotiation_proposed_rate_unit: string | null;
  negotiation_proposed_role: string | null;
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

function fmtVND(n: number | null | undefined): string {
  if (n == null) return "—";
  try {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);
  } catch { return String(n); }
}

/** Returns [label, tone] for a deadline relative to now. */
function deadlineBadge(deadline: string | null, status: string): { label: string; tone: "destructive" | "warning" | "muted" } | null {
  if (!deadline || status !== "pending") return null;
  let when: Date;
  try { when = parseISO(deadline); } catch { return null; }
  const diffMs = when.getTime() - Date.now();
  if (diffMs <= 0) return { label: "Đã quá hạn", tone: "destructive" };
  let dist = "";
  try { dist = formatDistanceToNowStrict(when, { locale: vi, addSuffix: false }); } catch { dist = "?"; }
  if (diffMs < 24 * 60 * 60 * 1000) return { label: `Còn ${dist}`, tone: "destructive" };
  if (diffMs < 72 * 60 * 60 * 1000) return { label: `Còn ${dist}`, tone: "warning" };
  return { label: `Còn ${dist}`, tone: "muted" };
}

/** Convert ISO date to <input type="datetime-local"> compatible value. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = parseISO(iso);
    const tz = d.getTimezoneOffset();
    const local = new Date(d.getTime() - tz * 60_000);
    return local.toISOString().slice(0, 16);
  } catch { return ""; }
}

/** Convert <input type="datetime-local"> back to ISO. */
function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
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
            "respond_deadline, proposed_rate_amount_vnd, proposed_rate_unit, " +
            "negotiation_status, negotiation_message_teacher, negotiation_requested_at, " +
            "negotiation_message_admin, negotiation_responded_at, " +
            "negotiation_proposed_rate_amount_vnd, negotiation_proposed_rate_unit, negotiation_proposed_role, " +
            "teachers:teacher_id (id, full_name, email)",
        )
        .eq("class_id", classId)
        .order("invited_at", { ascending: false });
      if (error) throw error;
      return (data || []) as InvitationRow[];
    },
    refetchInterval: open ? 60_000 : false, // refresh deadlines / countdowns
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

  const setDeadlineMut = useMutation({
    mutationFn: async (vars: { id: string; deadline: string | null }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)("set_invitation_deadline", {
        p_invitation_id: vars.id,
        p_deadline: vars.deadline,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Đã cập nhật hạn phản hồi");
      qc.invalidateQueries({ queryKey: ["admin-class-invitations", classId] });
    },
    onError: (e: Error) => toast.error(e.message || "Không thể đặt hạn"),
  });

  const negotiationMut = useMutation({
    mutationFn: async (vars: {
      id: string;
      message: string;
      newRate?: number | null;
      newUnit?: string | null;
      newRole?: string | null;
      newDeadline?: string | null;
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)("respond_invitation_negotiation", {
        p_invitation_id: vars.id,
        p_admin_message: vars.message,
        p_new_rate_amount_vnd: vars.newRate ?? null,
        p_new_rate_unit: vars.newUnit ?? null,
        p_new_role: vars.newRole ?? null,
        p_new_deadline: vars.newDeadline ?? null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Đã gửi phản hồi thương lượng");
      qc.invalidateQueries({ queryKey: ["admin-class-invitations", classId] });
    },
    onError: (e: Error) => toast.error(e.message || "Không thể trả lời thương lượng"),
  });

  const batchResendMut = useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: clearData, error: clearErr } = await (supabase.rpc as any)("batch_resend_class_invitations", {
        p_class_id: classId,
        p_invitation_ids: null,
      });
      if (clearErr) throw new Error(clearErr.message);
      const { error: sendErr } = await supabase.functions.invoke("send-class-invitations", {
        body: { class_id: classId },
      });
      if (sendErr) throw new Error(sendErr.message || "Edge function error");
      return clearData;
    },
    onSuccess: () => {
      toast.success("Đã gửi lại email cho mọi lời mời đang chờ");
      qc.invalidateQueries({ queryKey: ["admin-class-invitations", classId] });
    },
    onError: (e: Error) => toast.error(e.message || "Không thể gửi nhắc nhở hàng loạt"),
  });

  const [reassignFor, setReassignFor] = useState<InvitationRow | null>(null);
  const [reassignTeacherId, setReassignTeacherId] = useState<string>("");
  const [reassignRole, setReassignRole] = useState<string>("primary");

  const [deadlineEditFor, setDeadlineEditFor] = useState<InvitationRow | null>(null);
  const [deadlineDraft, setDeadlineDraft] = useState<string>("");

  const [negotiationFor, setNegotiationFor] = useState<InvitationRow | null>(null);
  const [negoMessage, setNegoMessage] = useState<string>("");
  const [negoMode, setNegoMode] = useState<"keep" | "concede">("keep");
  const [negoNewRate, setNegoNewRate] = useState<string>("");
  const [negoNewUnit, setNegoNewUnit] = useState<string>("session");
  const [negoNewRole, setNegoNewRole] = useState<string>("");
  const [negoNewDeadline, setNegoNewDeadline] = useState<string>("");

  useEffect(() => {
    if (reassignFor) {
      setReassignTeacherId("");
      setReassignRole(reassignFor.role || "primary");
    }
  }, [reassignFor?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (deadlineEditFor) {
      setDeadlineDraft(toLocalInput(deadlineEditFor.respond_deadline));
    }
  }, [deadlineEditFor?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (negotiationFor) {
      setNegoMessage("");
      setNegoMode("keep");
      setNegoNewRate(
        negotiationFor.negotiation_proposed_rate_amount_vnd != null
          ? String(negotiationFor.negotiation_proposed_rate_amount_vnd)
          : "",
      );
      setNegoNewUnit(negotiationFor.negotiation_proposed_rate_unit || negotiationFor.proposed_rate_unit || "session");
      setNegoNewRole(negotiationFor.negotiation_proposed_role || "");
      setNegoNewDeadline(toLocalInput(negotiationFor.respond_deadline));
    }
  }, [negotiationFor?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const teacherOptions = useMemo(() => {
    const blocked = new Set((invitationsQ.data ?? [])
      .filter((i) => i.status === "pending" || i.status === "accepted")
      .map((i) => i.teacher_id));
    return (teachersQ.data ?? []).filter((t) => !blocked.has(t.id));
  }, [invitationsQ.data, teachersQ.data]);

  const rows = invitationsQ.data ?? [];
  const pendingRows = rows.filter((r) => r.status === "pending");
  const pendingCount = pendingRows.length;
  const negotiationRequestedCount = pendingRows.filter((r) => r.negotiation_status === "requested").length;
  const overdueCount = pendingRows.filter((r) => {
    if (!r.respond_deadline) return false;
    try { return parseISO(r.respond_deadline).getTime() < Date.now(); } catch { return false; }
  }).length;
  const noEmailCount = pendingRows.filter((r) => !r.email_sent_at).length;

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
              {negotiationRequestedCount > 0 && (
                <span className="ml-2 text-warning">· {negotiationRequestedCount} đang chờ thương lượng</span>
              )}
              {overdueCount > 0 && (
                <span className="ml-2 text-destructive">· {overdueCount} đã quá hạn</span>
              )}
            </DialogDescription>
          </DialogHeader>

          {pendingCount > 0 && (
            <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
              <div className="text-xs text-muted-foreground">
                {noEmailCount > 0
                  ? <>Có <strong className="text-foreground">{noEmailCount}</strong> lời mời chưa gửi email lần nào.</>
                  : "Tất cả lời mời đã được gửi email ít nhất 1 lần."}
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={batchResendMut.isPending}
                onClick={() => batchResendMut.mutate()}
              >
                {batchResendMut.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                Gửi nhắc nhở tất cả
              </Button>
            </div>
          )}

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
              const canSetDeadline = inv.status === "pending";
              const dl = deadlineBadge(inv.respond_deadline, inv.status);
              const showNegotiation =
                inv.negotiation_status === "requested" || inv.negotiation_status === "admin_responded";
              return (
                <div key={inv.id} className="rounded-lg border bg-card p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">
                          {inv.teachers?.full_name || "(GV đã bị xóa)"}
                        </span>
                        <Badge variant="outline" className="text-[10px]">{ROLE_LABEL[inv.role] || inv.role}</Badge>
                        {dl && (
                          <Badge
                            variant={dl.tone === "destructive" ? "destructive" : "outline"}
                            className={
                              dl.tone === "warning"
                                ? "text-warning border-warning"
                                : dl.tone === "muted"
                                  ? "text-muted-foreground"
                                  : ""
                            }
                          >
                            <AlarmClock className="h-3 w-3 mr-1" /> {dl.label}
                          </Badge>
                        )}
                        {inv.negotiation_status === "requested" && (
                          <Badge variant="outline" className="text-warning border-warning">
                            <MessagesSquare className="h-3 w-3 mr-1" /> GV đề xuất thay đổi
                          </Badge>
                        )}
                        {inv.negotiation_status === "admin_responded" && (
                          <Badge variant="outline" className="text-muted-foreground">
                            <MessagesSquare className="h-3 w-3 mr-1" /> Đã trả lời thương lượng
                          </Badge>
                        )}
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
                    {inv.respond_deadline && (
                      <div className="flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" /> Hạn: {fmtTs(inv.respond_deadline)}
                      </div>
                    )}
                    {inv.responded_at && (
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Phản hồi: {fmtTs(inv.responded_at)}
                      </div>
                    )}
                    {inv.proposed_rate_amount_vnd != null && (
                      <div className="flex items-center gap-1 col-span-2">
                        Mức đề xuất: <strong className="text-foreground">{fmtVND(inv.proposed_rate_amount_vnd)}</strong>
                        {inv.proposed_rate_unit ? `/${RATE_UNIT_LABEL[inv.proposed_rate_unit] || inv.proposed_rate_unit}` : ""}
                      </div>
                    )}
                  </div>

                  {showNegotiation && (
                    <div className="rounded-md border border-warning/40 bg-warning/5 p-2 space-y-1.5">
                      {inv.negotiation_message_teacher && (
                        <div className="text-xs">
                          <strong className="text-foreground">GV đề xuất ({fmtTs(inv.negotiation_requested_at)}):</strong>{" "}
                          <span className="text-muted-foreground">{inv.negotiation_message_teacher}</span>
                          {(inv.negotiation_proposed_rate_amount_vnd != null
                            || inv.negotiation_proposed_role) && (
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {inv.negotiation_proposed_rate_amount_vnd != null && (
                                <>Đề xuất mức: {fmtVND(inv.negotiation_proposed_rate_amount_vnd)}
                                  {inv.negotiation_proposed_rate_unit
                                    ? `/${RATE_UNIT_LABEL[inv.negotiation_proposed_rate_unit] || inv.negotiation_proposed_rate_unit}`
                                    : ""}
                                  {inv.negotiation_proposed_role ? " · " : ""}
                                </>
                              )}
                              {inv.negotiation_proposed_role && (
                                <>Vai trò: {ROLE_LABEL[inv.negotiation_proposed_role] || inv.negotiation_proposed_role}</>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {inv.negotiation_message_admin && (
                        <div className="text-xs">
                          <strong className="text-foreground">Admin trả lời ({fmtTs(inv.negotiation_responded_at)}):</strong>{" "}
                          <span className="text-muted-foreground">{inv.negotiation_message_admin}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {inv.response_note && (
                    <div className="text-xs border-l-2 border-border pl-2 text-muted-foreground">
                      <strong className="text-foreground">Ghi chú:</strong> {inv.response_note}
                    </div>
                  )}

                  <div className="flex justify-end flex-wrap gap-2 pt-1">
                    {inv.negotiation_status === "requested" && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setNegotiationFor(inv)}
                      >
                        <MessagesSquare className="h-3 w-3 mr-1.5" /> Trả lời thương lượng
                      </Button>
                    )}
                    {canSetDeadline && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeadlineEditFor(inv)}
                      >
                        <CalendarClock className="h-3 w-3 mr-1.5" />
                        {inv.respond_deadline ? "Đổi hạn" : "Đặt hạn"}
                      </Button>
                    )}
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

      {/* Reassign dialog (unchanged) */}
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

      {/* Set/edit deadline dialog */}
      <Dialog open={!!deadlineEditFor} onOpenChange={(o) => !o && setDeadlineEditFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hạn phản hồi</DialogTitle>
            <DialogDescription>
              GV phải phản hồi trước thời điểm này, nếu không lời mời sẽ tự động hết hạn lúc 00:30 (giờ VN) hôm sau.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Thời điểm hết hạn</Label>
            <Input
              type="datetime-local"
              value={deadlineDraft}
              onChange={(e) => setDeadlineDraft(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Để trống và bấm "Bỏ hạn" để xóa deadline (lời mời không tự hết hạn).
            </p>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={setDeadlineMut.isPending || !deadlineEditFor?.respond_deadline}
              onClick={() => {
                if (!deadlineEditFor) return;
                setDeadlineMut.mutate(
                  { id: deadlineEditFor.id, deadline: null },
                  { onSuccess: () => setDeadlineEditFor(null) },
                );
              }}
            >
              Bỏ hạn
            </Button>
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setDeadlineEditFor(null)}>Hủy</Button>
            <Button
              disabled={setDeadlineMut.isPending || !deadlineDraft}
              onClick={() => {
                if (!deadlineEditFor) return;
                const iso = fromLocalInput(deadlineDraft);
                if (!iso) {
                  toast.error("Thời điểm không hợp lệ");
                  return;
                }
                setDeadlineMut.mutate(
                  { id: deadlineEditFor.id, deadline: iso },
                  { onSuccess: () => setDeadlineEditFor(null) },
                );
              }}
            >
              {setDeadlineMut.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Negotiation response dialog */}
      <Dialog open={!!negotiationFor} onOpenChange={(o) => !o && setNegotiationFor(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Trả lời thương lượng</DialogTitle>
            <DialogDescription>
              GV <strong>{negotiationFor?.teachers?.full_name}</strong> đã đề xuất thay đổi.
              Trả lời 1 lần — sau đó GV chỉ có thể chấp nhận / từ chối.
            </DialogDescription>
          </DialogHeader>
          {negotiationFor?.negotiation_message_teacher && (
            <div className="rounded-md bg-muted/50 p-3 text-xs space-y-1">
              <div><strong>Đề xuất của GV:</strong></div>
              <div className="text-muted-foreground">{negotiationFor.negotiation_message_teacher}</div>
              {(negotiationFor.negotiation_proposed_rate_amount_vnd != null
                || negotiationFor.negotiation_proposed_role) && (
                <div className="text-muted-foreground pt-1 border-t border-border/50 mt-1">
                  {negotiationFor.negotiation_proposed_rate_amount_vnd != null && (
                    <>Mức: <strong className="text-foreground">{fmtVND(negotiationFor.negotiation_proposed_rate_amount_vnd)}</strong>
                      {negotiationFor.negotiation_proposed_rate_unit
                        ? `/${RATE_UNIT_LABEL[negotiationFor.negotiation_proposed_rate_unit] || negotiationFor.negotiation_proposed_rate_unit}`
                        : ""}
                      {negotiationFor.negotiation_proposed_role ? " · " : ""}
                    </>
                  )}
                  {negotiationFor.negotiation_proposed_role && (
                    <>Vai trò: <strong className="text-foreground">{ROLE_LABEL[negotiationFor.negotiation_proposed_role] || negotiationFor.negotiation_proposed_role}</strong></>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="space-y-3">
            <div>
              <Label>Lời nhắn</Label>
              <Textarea
                value={negoMessage}
                onChange={(e) => setNegoMessage(e.target.value)}
                rows={3}
                placeholder="VD: Mình đồng ý nâng lên mức X. Mong em xác nhận trong 48h."
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tối thiểu 5 ký tự. Hiển thị cho GV trong portal.
              </p>
            </div>
            <div>
              <Label>Quyết định</Label>
              <Select value={negoMode} onValueChange={(v) => setNegoMode(v as "keep" | "concede")}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep">Giữ nguyên điều khoản gốc</SelectItem>
                  <SelectItem value="concede">Đồng ý nhượng bộ (cập nhật mức / vai trò)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {negoMode === "concede" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Mức mới (VND)</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={negoNewRate}
                    onChange={(e) => setNegoNewRate(e.target.value)}
                    placeholder="VD: 350000"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Đơn vị</Label>
                  <Select value={negoNewUnit} onValueChange={setNegoNewUnit}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="session">/ buổi</SelectItem>
                      <SelectItem value="hour">/ giờ</SelectItem>
                      <SelectItem value="day">/ ngày</SelectItem>
                      <SelectItem value="month">/ tháng</SelectItem>
                      <SelectItem value="student">/ học viên</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Vai trò mới (tùy chọn)</Label>
                  <Select value={negoNewRole || "_keep"} onValueChange={(v) => setNegoNewRole(v === "_keep" ? "" : v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_keep">Giữ nguyên</SelectItem>
                      <SelectItem value="primary">GV chính</SelectItem>
                      <SelectItem value="ta">Trợ giảng</SelectItem>
                      <SelectItem value="substitute">GV dạy thay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Gia hạn deadline (tùy chọn)</Label>
                  <Input
                    type="datetime-local"
                    value={negoNewDeadline}
                    onChange={(e) => setNegoNewDeadline(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNegotiationFor(null)}>Hủy</Button>
            <Button
              disabled={negotiationMut.isPending || negoMessage.trim().length < 5}
              onClick={() => {
                if (!negotiationFor) return;
                const concede = negoMode === "concede";
                const rateNum = concede && negoNewRate ? Number(negoNewRate) : null;
                if (concede && rateNum != null && (Number.isNaN(rateNum) || rateNum < 0)) {
                  toast.error("Mức mới không hợp lệ");
                  return;
                }
                negotiationMut.mutate(
                  {
                    id: negotiationFor.id,
                    message: negoMessage.trim(),
                    newRate: concede ? rateNum : null,
                    newUnit: concede && rateNum != null ? negoNewUnit : null,
                    newRole: concede && negoNewRole ? negoNewRole : null,
                    newDeadline: concede ? fromLocalInput(negoNewDeadline) : null,
                  },
                  { onSuccess: () => setNegotiationFor(null) },
                );
              }}
            >
              {negotiationMut.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Gửi phản hồi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
