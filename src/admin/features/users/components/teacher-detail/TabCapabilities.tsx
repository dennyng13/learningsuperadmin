// Stage P3 admin — TeacherDetailPage "Năng lực" tab.
// Combines:
//   • The existing TeacherProgramEligibilityCard (admin direct edit)
//   • Drafts review panel (lists pending teacher_capability_drafts and
//     calls admin_review_capability_draft RPC).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@shared/components/ui/button";
import { Textarea } from "@shared/components/ui/textarea";
import { Loader2, MessagesSquare, ShieldCheck, ThumbsDown, ThumbsUp, Wrench } from "lucide-react";
import TeacherProgramEligibilityCard from "@admin/features/users/components/TeacherProgramEligibilityCard";

interface Props { teacherId: string }

interface CapabilityDraft {
  id: string;
  teacher_id: string;
  level_keys: string[];
  program_keys: string[];
  can_teach_online: boolean;
  can_teach_offline: boolean;
  max_hours_per_week: number | null;
  notes: string | null;
  status: string;
  review_note: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export default function TabCapabilities({ teacherId }: Props) {
  return (
    <div className="space-y-6">
      <DraftsPanel teacherId={teacherId} />
      <TeacherProgramEligibilityCard teacherId={teacherId} />
    </div>
  );
}

function DraftsPanel({ teacherId }: Props) {
  const qc = useQueryClient();
  const { data: drafts, isLoading } = useQuery({
    queryKey: ["teacher-capability-drafts", teacherId],
    queryFn: async (): Promise<CapabilityDraft[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from as any)("teacher_capability_drafts")
        .select("*")
        .eq("teacher_id", teacherId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data as CapabilityDraft[]) ?? [];
    },
  });

  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);

  const reviewMut = useMutation({
    mutationFn: async (vars: { draftId: string; action: "approve" | "reject" | "needs_changes" | "apply"; note?: string }) => {
      setPendingId(vars.draftId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)("admin_review_capability_draft", {
        p_draft_id: vars.draftId,
        p_action: vars.action,
        p_note: vars.note ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(`Đã ${actionLabel(vars.action)}`);
      qc.invalidateQueries({ queryKey: ["teacher-capability-drafts", teacherId] });
      qc.invalidateQueries({ queryKey: ["teacher-kpi-snapshot", teacherId] });
      if (vars.action === "apply") qc.invalidateQueries({ queryKey: ["teacher-capabilities", teacherId] });
      setReviewNotes((prev) => ({ ...prev, [vars.draftId]: "" }));
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Hành động thất bại"),
    onSettled: () => setPendingId(null),
  });

  const open = (drafts ?? []).filter((d) => d.status === "pending" || d.status === "needs_changes");
  const closed = (drafts ?? []).filter((d) => d.status !== "pending" && d.status !== "needs_changes");

  return (
    <section className="rounded-xl border bg-card p-4">
      <header className="flex items-center justify-between mb-3">
        <h3 className="font-semibold inline-flex items-center gap-2">
          <MessagesSquare className="h-4 w-4 text-warning" />
          Đề xuất thay đổi năng lực ({open.length} đang chờ)
        </h3>
      </header>
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải drafts…
        </div>
      )}
      {!isLoading && open.length === 0 && (
        <p className="text-sm text-muted-foreground">Không có draft đang chờ duyệt.</p>
      )}
      {open.map((d) => (
        <article key={d.id} className="rounded-lg border bg-background p-3 mb-2 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wide text-warning font-semibold">
              Status: {d.status}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Gửi lúc {new Date(d.created_at).toLocaleString("vi-VN")}
            </div>
          </div>
          <DraftBody draft={d} />
          <Textarea
            rows={2}
            placeholder="Ghi chú phản hồi (tùy chọn)…"
            value={reviewNotes[d.id] ?? ""}
            onChange={(e) => setReviewNotes((prev) => ({ ...prev, [d.id]: e.target.value }))}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={pendingId === d.id}
              onClick={() => reviewMut.mutate({ draftId: d.id, action: "apply", note: reviewNotes[d.id] || undefined })}
            >
              {pendingId === d.id ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />}
              Apply (cập nhật capabilities)
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pendingId === d.id}
              onClick={() => reviewMut.mutate({ draftId: d.id, action: "approve", note: reviewNotes[d.id] || undefined })}
            >
              <ThumbsUp className="h-3.5 w-3.5 mr-1.5" />
              Approve (chưa apply)
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pendingId === d.id}
              onClick={() => reviewMut.mutate({ draftId: d.id, action: "needs_changes", note: reviewNotes[d.id] || undefined })}
            >
              <Wrench className="h-3.5 w-3.5 mr-1.5" />
              Yêu cầu chỉnh
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={pendingId === d.id}
              onClick={() => reviewMut.mutate({ draftId: d.id, action: "reject", note: reviewNotes[d.id] || undefined })}
            >
              <ThumbsDown className="h-3.5 w-3.5 mr-1.5" />
              Reject
            </Button>
          </div>
        </article>
      ))}
      {closed.length > 0 && (
        <details className="mt-3">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
            Lịch sử ({closed.length})
          </summary>
          <div className="mt-2 space-y-1.5">
            {closed.map((d) => (
              <div key={d.id} className="text-xs text-muted-foreground border-l-2 border-border pl-2">
                <span className="font-medium text-foreground">{d.status}</span>
                {d.review_note && <span> — {d.review_note}</span>}
                {d.reviewed_at && <span className="ml-1">({new Date(d.reviewed_at).toLocaleString("vi-VN")})</span>}
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

function DraftBody({ draft }: { draft: CapabilityDraft }) {
  return (
    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs">
      <div>
        <dt className="inline text-muted-foreground">Programs: </dt>
        <dd className="inline font-medium">{draft.program_keys.length > 0 ? draft.program_keys.join(", ") : "(none)"}</dd>
      </div>
      <div>
        <dt className="inline text-muted-foreground">Levels: </dt>
        <dd className="inline font-medium">{draft.level_keys.length > 0 ? draft.level_keys.join(", ") : "(none)"}</dd>
      </div>
      <div>
        <dt className="inline text-muted-foreground">Online: </dt>
        <dd className="inline font-medium">{draft.can_teach_online ? "Yes" : "No"}</dd>
      </div>
      <div>
        <dt className="inline text-muted-foreground">Offline: </dt>
        <dd className="inline font-medium">{draft.can_teach_offline ? "Yes" : "No"}</dd>
      </div>
      <div>
        <dt className="inline text-muted-foreground">Max h/tuần: </dt>
        <dd className="inline font-medium">{draft.max_hours_per_week ?? "—"}</dd>
      </div>
      {draft.notes && (
        <div className="md:col-span-2 mt-1">
          <dt className="text-muted-foreground">Lý do GV nêu: </dt>
          <dd className="font-medium">{draft.notes}</dd>
        </div>
      )}
    </dl>
  );
}

function actionLabel(a: string): string {
  switch (a) {
    case "approve": return "duyệt";
    case "reject": return "từ chối";
    case "needs_changes": return "yêu cầu chỉnh";
    case "apply": return "apply (cập nhật capabilities)";
    default: return a;
  }
}
