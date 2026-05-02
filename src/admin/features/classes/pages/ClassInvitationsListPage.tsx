/**
 * ClassInvitationsListPage — Section §3.2.4 (Admin IA).
 *
 * Cross-class invitation management view. Complements per-class
 * ClassInvitationsDialog with a top-level list + filters + KPI tiles.
 *
 * Features:
 * - Fetches all class_invitations + joins class + teacher names
 * - KPI tiles by status (pending / accepted / rejected / expired / cancelled)
 * - Filters: status chips + search (class or teacher name)
 * - Inline row actions:
 *   * Cancel (pending only) — calls cancel_class_invitation RPC
 *   * Resend email (pending only) — calls send-class-invitations edge function
 *   * Mở chi tiết lớp — navigates to /classes/:id (existing detail page)
 * - Date format: dd/MM/yyyy via formatDateDDMMYYYY (Day 6+7 helpers)
 * - Real-time deadline countdowns via 60s refetch (matches dialog pattern)
 *
 * Route: /classes/invitations (registered in AdminRoutes.tsx)
 *
 * Mockup ref: §3.2.4 Class invitations management — no specific mockup file;
 * derived from ClassInvitationsDialog patterns (commit history `ClassInvitationsDialog.tsx`).
 */

import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertCircle, ArrowRight, CheckCircle2, Clock, Loader2, Mail, Search, Users, X, XCircle,
} from "lucide-react";
import { Card } from "@shared/components/ui/card";
import { Input } from "@shared/components/ui/input";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Skeleton } from "@shared/components/ui/skeleton";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@shared/components/ui/breadcrumb";
import { cn } from "@shared/lib/utils";
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from "@shared/utils/dateFormat";

type InvitationStatus = "pending" | "accepted" | "rejected" | "expired" | "cancelled";

interface InvitationRow {
  id: string;
  class_id: string;
  teacher_id: string;
  role: string;
  status: InvitationStatus;
  invited_at: string;
  responded_at: string | null;
  respond_deadline: string | null;
  email_sent_at: string | null;
  negotiation_status: "none" | "requested" | "admin_responded" | "closed" | null;
  classes: { id: string; class_name: string | null; class_code: string | null } | null;
  teachers: { id: string; full_name: string | null; email: string | null } | null;
}

const STATUS_FILTERS: { value: InvitationStatus | "all"; label: string }[] = [
  { value: "all",       label: "Tất cả" },
  { value: "pending",   label: "Chờ phản hồi" },
  { value: "accepted",  label: "Đã chấp nhận" },
  { value: "rejected",  label: "Đã từ chối" },
  { value: "expired",   label: "Hết hạn" },
  { value: "cancelled", label: "Đã hủy" },
];

const STATUS_META: Record<InvitationStatus, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  pending:   { label: "Chờ phản hồi",   cls: "border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/5",   icon: Clock },
  accepted:  { label: "Đã chấp nhận",   cls: "border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5", icon: CheckCircle2 },
  rejected:  { label: "Đã từ chối",     cls: "border-destructive/40 text-destructive bg-destructive/5",                    icon: XCircle },
  expired:   { label: "Hết hạn",        cls: "border-muted-foreground/40 text-muted-foreground bg-muted/30",                icon: AlertCircle },
  cancelled: { label: "Đã hủy",         cls: "border-muted-foreground/40 text-muted-foreground bg-muted/30",                icon: X },
};

const ROLE_LABELS: Record<string, string> = {
  primary: "Primary",
  ta: "TA",
};

function deadlineHint(deadline: string | null, status: InvitationStatus): { label: string; tone: "destructive" | "warning" | "muted" } | null {
  if (!deadline || status !== "pending") return null;
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms < 0) return { label: "Quá hạn", tone: "destructive" };
  const hrs = ms / (1000 * 60 * 60);
  if (hrs < 24) return { label: `Còn ${Math.floor(hrs)}h`, tone: "destructive" };
  const days = Math.floor(hrs / 24);
  if (days < 3) return { label: `Còn ${days} ngày`, tone: "warning" };
  return { label: `Còn ${days} ngày`, tone: "muted" };
}

export default function ClassInvitationsListPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvitationStatus | "all">("all");

  const invitationsQ = useQuery({
    queryKey: ["admin-all-class-invitations"],
    queryFn: async (): Promise<InvitationRow[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from as any)("class_invitations")
        .select(
          "id, class_id, teacher_id, role, status, invited_at, responded_at, respond_deadline, email_sent_at, negotiation_status, " +
          "classes:class_id (id, class_name, class_code), " +
          "teachers:teacher_id (id, full_name, email)",
        )
        .order("invited_at", { ascending: false });
      if (error) throw error;
      return (data || []) as InvitationRow[];
    },
    refetchInterval: 60_000, // live deadline countdowns
  });

  const cancelMut = useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)("cancel_class_invitation", {
        p_invitation_id: id,
        p_note: null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Đã hủy lời mời");
      qc.invalidateQueries({ queryKey: ["admin-all-class-invitations"] });
    },
    onError: (e: Error) => toast.error(e.message || "Không thể hủy lời mời"),
  });

  const resendMut = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke("send-class-invitations", {
        body: { invitation_ids: [id] },
      });
      if (error) throw new Error(error.message || "Edge function error");
      return data;
    },
    onSuccess: () => {
      toast.success("Đã gửi lại email");
      qc.invalidateQueries({ queryKey: ["admin-all-class-invitations"] });
    },
    onError: (e: Error) => toast.error(e.message || "Không thể gửi lại email"),
  });

  // KPI counts
  const counts = useMemo(() => {
    const rows = invitationsQ.data ?? [];
    const c = { total: rows.length, pending: 0, accepted: 0, rejected: 0, expired: 0, cancelled: 0 };
    for (const r of rows) {
      if (r.status in c) (c as any)[r.status]++;
    }
    return c;
  }, [invitationsQ.data]);

  // Filtered rows
  const filtered = useMemo(() => {
    const rows = invitationsQ.data ?? [];
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (q) {
        const blob = [
          r.classes?.class_name ?? "",
          r.classes?.class_code ?? "",
          r.teachers?.full_name ?? "",
          r.teachers?.email ?? "",
        ].join(" ").toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [invitationsQ.data, statusFilter, search]);

  const isLoading = invitationsQ.isLoading;
  const isMutating = cancelMut.isPending || resendMut.isPending;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5 animate-page-in">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/classes">Lớp học</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Quản lý lời mời</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-extrabold inline-flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" /> Quản lý lời mời lớp học
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Section §3.2.4 — toàn bộ lời mời giáo viên dạy, theo dõi trạng thái + hạn phản hồi.
          </p>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiTile label="Tất cả" value={counts.total} icon={Mail} tone="primary" />
        <KpiTile label="Chờ phản hồi" value={counts.pending} icon={Clock} tone="amber" onClick={() => setStatusFilter("pending")} active={statusFilter === "pending"} />
        <KpiTile label="Đã chấp nhận" value={counts.accepted} icon={CheckCircle2} tone="emerald" onClick={() => setStatusFilter("accepted")} active={statusFilter === "accepted"} />
        <KpiTile label="Đã từ chối" value={counts.rejected} icon={XCircle} tone="destructive" onClick={() => setStatusFilter("rejected")} active={statusFilter === "rejected"} />
        <KpiTile label="Hết hạn / Hủy" value={counts.expired + counts.cancelled} icon={AlertCircle} tone="muted" onClick={() => setStatusFilter("expired")} active={statusFilter === "expired"} />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm lớp / giáo viên / email..."
            className="pl-9 h-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <span className="h-5 w-px bg-border" />
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer",
              statusFilter === f.value
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card hover:border-primary/40",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : invitationsQ.error ? (
        <Card className="p-4 border-destructive/30 bg-destructive/5 text-sm text-destructive">
          Lỗi tải lời mời: {(invitationsQ.error as Error).message}
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <Mail className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium text-sm">
            {invitationsQ.data?.length === 0
              ? "Chưa có lời mời nào"
              : "Không có lời mời khớp filter"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {invitationsQ.data?.length === 0
              ? "Tạo lớp mới ở /classes/new để gửi lời mời tự động."
              : "Thử đổi filter hoặc search."}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lớp</th>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Giáo viên</th>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vai trò</th>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trạng thái</th>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mời lúc</th>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hạn phản hồi</th>
                <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((inv) => {
                const statusMeta = STATUS_META[inv.status];
                const StatusIcon = statusMeta.icon;
                const dl = deadlineHint(inv.respond_deadline, inv.status);
                const canCancel = inv.status === "pending";
                const canResend = inv.status === "pending";
                return (
                  <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2.5">
                      <Link to={`/classes/${inv.class_id}`} className="text-primary hover:underline font-medium">
                        {inv.classes?.class_name ?? <span className="italic text-muted-foreground">(không tên)</span>}
                      </Link>
                      {inv.classes?.class_code && (
                        <p className="text-[11px] text-muted-foreground tabular-nums">{inv.classes.class_code}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium">{inv.teachers?.full_name ?? "—"}</p>
                      {inv.teachers?.email && (
                        <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">{inv.teachers.email}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className="text-[10px]">
                        {ROLE_LABELS[inv.role] ?? inv.role}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className={cn("text-[10px] gap-1 inline-flex items-center", statusMeta.cls)}>
                        <StatusIcon className="h-3 w-3" /> {statusMeta.label}
                      </Badge>
                      {inv.negotiation_status === "requested" && (
                        <Badge variant="outline" className="text-[10px] mt-1 ml-1 border-blue-500/30 text-blue-700 dark:text-blue-400">
                          🔔 GV xin thương lượng
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground tabular-nums">
                      {formatDateTimeDDMMYYYY(inv.invited_at)}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {inv.respond_deadline ? (
                        <div className="space-y-0.5">
                          <p className="tabular-nums">{formatDateDDMMYYYY(inv.respond_deadline)}</p>
                          {dl && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                dl.tone === "destructive" && "border-destructive/40 text-destructive",
                                dl.tone === "warning" && "border-amber-500/40 text-amber-700 dark:text-amber-400",
                                dl.tone === "muted" && "text-muted-foreground",
                              )}
                            >
                              {dl.label}
                            </Badge>
                          )}
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 justify-end">
                        {canResend && (
                          <Button
                            type="button" size="sm" variant="ghost"
                            disabled={isMutating}
                            onClick={() => resendMut.mutate(inv.id)}
                            className="h-7 gap-1 text-xs"
                            title="Gửi lại email"
                          >
                            {resendMut.isPending && resendMut.variables === inv.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <Mail className="h-3 w-3" />}
                            Gửi lại
                          </Button>
                        )}
                        {canCancel && (
                          <Button
                            type="button" size="sm" variant="ghost"
                            disabled={isMutating}
                            onClick={() => {
                              if (window.confirm(`Hủy lời mời cho ${inv.teachers?.full_name ?? "giáo viên này"}?`)) {
                                cancelMut.mutate(inv.id);
                              }
                            }}
                            className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                            title="Hủy lời mời"
                          >
                            {cancelMut.isPending && cancelMut.variables === inv.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <X className="h-3 w-3" />}
                            Hủy
                          </Button>
                        )}
                        <Button
                          type="button" size="sm" variant="ghost"
                          onClick={() => navigate(`/classes/${inv.class_id}`)}
                          className="h-7 gap-1 text-xs"
                          title="Mở chi tiết lớp để quản lý sâu hơn"
                        >
                          Chi tiết <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
        <Users className="h-3 w-3" />
        Hiển thị <strong className="text-foreground">{filtered.length}</strong> / {invitationsQ.data?.length ?? 0} lời mời. Refresh tự động mỗi 60s.
      </div>
    </div>
  );
}

/* ───────────── KPI tile ───────────── */

function KpiTile({
  label, value, icon: Icon, tone, onClick, active,
}: {
  label: string;
  value: number;
  icon: typeof Mail;
  tone: "primary" | "amber" | "emerald" | "destructive" | "muted";
  onClick?: () => void;
  active?: boolean;
}) {
  const toneCls = {
    primary:     "border-primary/30 bg-primary/5",
    amber:       "border-amber-500/30 bg-amber-500/5",
    emerald:     "border-emerald-500/30 bg-emerald-500/5",
    destructive: "border-destructive/30 bg-destructive/5",
    muted:       "border-muted-foreground/30 bg-muted/30",
  }[tone];
  const iconCls = {
    primary:     "text-primary",
    amber:       "text-amber-600 dark:text-amber-400",
    emerald:     "text-emerald-600 dark:text-emerald-400",
    destructive: "text-destructive",
    muted:       "text-muted-foreground",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "rounded-xl border-2 p-3 transition-all text-left",
        toneCls,
        onClick && "hover:shadow-md cursor-pointer",
        active && "ring-2 ring-primary ring-offset-2",
        !onClick && "cursor-default",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">{label}</p>
        <Icon className={cn("h-3.5 w-3.5", iconCls)} />
      </div>
      <p className="font-display text-2xl font-extrabold tabular-nums mt-1">{value}</p>
    </button>
  );
}
