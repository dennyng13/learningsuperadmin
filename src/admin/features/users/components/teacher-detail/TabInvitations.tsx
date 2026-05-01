// Stage P3 admin — TeacherDetailPage "Lời mời" tab.
// Lists every class_invitations row for this teacher (any status).
// Read-only history; admins still manage invitations from the
// per-class ClassInvitationsDialog.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, MailCheck, MailMinus, MailWarning, MessageCircle } from "lucide-react";
import { formatDateTimeDDMMYYYY } from "@shared/utils/dateFormat";

interface Row {
  id: string;
  class_id: string;
  status: string;
  role: string | null;
  invited_at: string | null;
  responded_at: string | null;
  response_note: string | null;
  respond_deadline: string | null;
  cancelled_at: string | null;
  reassigned_to: string | null;
  negotiation_status: string | null;
  classes: { id: string; class_name: string | null } | null;
}

interface Props { teacherId: string }

const STATUS_TONE: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  accepted: "bg-primary/10 text-primary",
  rejected: "bg-destructive/10 text-destructive",
  expired: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
  reassigned: "bg-secondary text-secondary-foreground",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Đang chờ",
  accepted: "Đã nhận",
  rejected: "Đã từ chối",
  expired: "Hết hạn",
  cancelled: "Đã hủy",
  reassigned: "Phân lại",
};

export default function TabInvitations({ teacherId }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["teacher-invitations", teacherId],
    queryFn: async (): Promise<Row[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from as any)("class_invitations")
        .select(
          "id, class_id, status, role, invited_at, responded_at, response_note, respond_deadline, cancelled_at, reassigned_to, negotiation_status, " +
          "classes:class_id (id, class_name)",
        )
        .eq("teacher_id", teacherId)
        .order("invited_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as Row[]) ?? [];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
      </div>
    );
  }
  if (error) return <p className="text-sm text-destructive">Lỗi: {(error as Error).message}</p>;

  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground p-4 rounded-xl border bg-card">
        Giáo viên chưa có lời mời nào.
      </p>
    );
  }

  return (
    <section className="rounded-2xl bg-card border border-border shadow-card overflow-hidden">
      <header className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold inline-flex items-center gap-2">
          <Mail className="h-4 w-4" /> Lịch sử lời mời ({data.length})
        </h3>
      </header>
      <div className="divide-y divide-border">
        {data.map((r) => (
          <article key={r.id} className="px-4 py-3 flex items-start gap-3 text-sm">
            <div className="rounded bg-muted p-2 shrink-0">
              {r.status === "pending" ? <MailWarning className="h-4 w-4" /> :
               r.status === "accepted" ? <MailCheck className="h-4 w-4" /> :
               r.status === "rejected" ? <MailMinus className="h-4 w-4" /> :
               <Mail className="h-4 w-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium truncate">
                  {r.classes?.class_name ?? "(lớp đã xóa)"}
                </span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${STATUS_TONE[r.status] ?? "bg-muted"}`}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
                {r.negotiation_status && r.negotiation_status !== "none" && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-info/10 text-info inline-flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    {r.negotiation_status}
                  </span>
                )}
                {r.role && <span className="text-xs text-muted-foreground">({r.role})</span>}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 space-x-3">
                {r.invited_at && <span>Mời: {formatDateTimeDDMMYYYY(r.invited_at)}</span>}
                {r.respond_deadline && <span>Hạn: {formatDateTimeDDMMYYYY(r.respond_deadline)}</span>}
                {r.responded_at && <span>Phản hồi: {formatDateTimeDDMMYYYY(r.responded_at)}</span>}
                {r.cancelled_at && <span>Hủy: {formatDateTimeDDMMYYYY(r.cancelled_at)}</span>}
              </div>
              {r.response_note && (
                <p className="text-xs mt-1 italic text-muted-foreground">"{r.response_note}"</p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
