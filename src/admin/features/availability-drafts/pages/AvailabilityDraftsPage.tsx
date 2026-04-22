import { useMemo, useState } from "react";
import { CalendarCheck, Search, Loader2, AlertCircle, CheckCircle2, XCircle, MessageSquareWarning, Inbox } from "lucide-react";
import { formatDistanceToNow, parseISO, format } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import { Card, CardContent } from "@shared/components/ui/card";
import { Input } from "@shared/components/ui/input";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import { Avatar, AvatarFallback } from "@shared/components/ui/avatar";
import { Textarea } from "@shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@shared/components/ui/dialog";
import { ListPageLayout } from "@shared/components/layouts/ListPageLayout";
import {
  useAvailabilityDrafts,
  useReviewDraftMutation,
  useApproveAndApplyMutation,
  type DraftWithTeacher,
} from "@shared/hooks/useAvailabilityDrafts";
import { WEEKDAY_LABELS, normalizeRules, normalizeExceptions, validateAvailabilityDraft } from "@shared/utils/availability";
import { cn } from "@shared/lib/utils";

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending:        { label: "Chờ duyệt",     className: "bg-amber-100 text-amber-800 border-amber-200" },
  needs_changes:  { label: "Cần sửa",       className: "bg-orange-100 text-orange-800 border-orange-200" },
  approved:       { label: "Đã duyệt",      className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  applied:        { label: "Đã áp dụng",    className: "bg-emerald-600 text-white border-emerald-600" },
  rejected:       { label: "Từ chối",       className: "bg-red-100 text-red-700 border-red-200" },
  superseded:     { label: "Đã thay thế",   className: "bg-muted text-muted-foreground border-border" },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] || { label: status, className: "bg-muted text-muted-foreground border-border" };
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", meta.className)}>{meta.label}</span>;
}

function initialsOf(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map((s) => s[0]).filter(Boolean).slice(-2).join("").toUpperCase();
}

function formatRange(from: string, to?: string | null) {
  const f = format(parseISO(from), "dd/MM/yyyy", { locale: vi });
  if (to) return `Từ ${f} đến ${format(parseISO(to), "dd/MM/yyyy", { locale: vi })}`;
  return `Từ ${f} (không giới hạn)`;
}

/* ── Availability grid (readonly) ── */
const HOURS = Array.from({ length: 15 }, (_, i) => 7 + i); // 07..21

function AvailabilityGrid({ rules }: { rules: ReturnType<typeof normalizeRules> }) {
  // For each weekday + hour, mark cell active if any rule covers it
  const isActive = (weekday: number, hour: number) => {
    return rules.some((r) => {
      if (r.weekday !== weekday) return false;
      const [sh, sm] = r.start_time.split(":").map(Number);
      const [eh, em] = r.end_time.split(":").map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      const cellStart = hour * 60;
      const cellEnd = (hour + 1) * 60;
      return startMin < cellEnd && endMin > cellStart;
    });
  };

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="grid" style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}>
        <div className="bg-muted/40 p-1 text-[10px] text-muted-foreground" />
        {[1, 2, 3, 4, 5, 6, 0].map((wd) => (
          <div key={wd} className="bg-muted/40 p-1 text-center text-[10px] font-medium text-muted-foreground">
            {WEEKDAY_LABELS[wd]}
          </div>
        ))}
        {HOURS.map((h) => (
          <>
            <div key={`l-${h}`} className="border-t bg-muted/20 p-1 text-[10px] text-muted-foreground text-right pr-1.5">
              {String(h).padStart(2, "0")}h
            </div>
            {[1, 2, 3, 4, 5, 6, 0].map((wd) => (
              <div
                key={`c-${h}-${wd}`}
                className={cn(
                  "border-t border-l h-6 transition-colors",
                  isActive(wd, h) ? "bg-emerald-500/80" : "bg-card",
                )}
              />
            ))}
          </>
        ))}
      </div>
    </div>
  );
}

type ActionType = "needs_changes" | "rejected" | "approve" | null;

export default function AvailabilityDraftsPage() {
  const { data, isLoading, error } = useAvailabilityDrafts();
  const reviewMutation = useReviewDraftMutation();
  const approveMutation = useApproveAndApplyMutation();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionOpen, setActionOpen] = useState<ActionType>(null);
  const [reviewNote, setReviewNote] = useState("");

  const drafts = data?.drafts || [];

  const filtered = useMemo(() => {
    return drafts.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const name = d.teacher?.full_name?.toLowerCase() || "";
        const email = d.teacher?.email?.toLowerCase() || "";
        if (!name.includes(q) && !email.includes(q)) return false;
      }
      return true;
    });
  }, [drafts, statusFilter, search]);

  const selected = useMemo<DraftWithTeacher | null>(() => {
    if (!selectedId) return filtered[0] || null;
    return drafts.find((d) => d.id === selectedId) || filtered[0] || null;
  }, [selectedId, filtered, drafts]);

  const validation = useMemo(() => {
    if (!selected) return null;
    return validateAvailabilityDraft(
      {
        effective_from: selected.effective_from,
        teacher_id: selected.teacher_id,
        availability_rules: selected.availability_rules,
      },
      data?.classes || [],
      data?.classSessions || [],
    );
  }, [selected, data]);

  const openAction = (type: ActionType) => {
    setReviewNote("");
    setActionOpen(type);
  };

  const submitAction = async () => {
    if (!selected || !actionOpen) return;
    try {
      if (actionOpen === "approve") {
        const res = await approveMutation.mutateAsync({ draftId: selected.id, reviewNote: reviewNote.trim() || null });
        const ri = res?.rules_inserted ?? "?";
        const ei = res?.exceptions_inserted ?? "?";
        toast.success(`Đã áp dụng. ${ri} rules + ${ei} exceptions đã lưu`);
      } else {
        if (reviewNote.trim().length < 10) {
          toast.error("Ghi chú phải tối thiểu 10 ký tự");
          return;
        }
        await reviewMutation.mutateAsync({ draftId: selected.id, newStatus: actionOpen, reviewNote: reviewNote.trim() });
        toast.success(actionOpen === "needs_changes" ? "Đã gửi yêu cầu sửa cho giáo viên" : "Đã từ chối");
      }
      setActionOpen(null);
    } catch (e: any) {
      toast.error(e?.message || "Có lỗi xảy ra");
    }
  };

  const canReview = selected && ["pending", "needs_changes", "approved"].includes(selected.status);

  /* ── Filter bar ── */
  const filterBar = (
    <div className="flex flex-col md:flex-row gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên hoặc email giáo viên…"
          className="pl-8 h-9"
        />
      </div>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-full md:w-48 h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả trạng thái</SelectItem>
          <SelectItem value="pending">Chờ duyệt</SelectItem>
          <SelectItem value="needs_changes">Cần sửa</SelectItem>
          <SelectItem value="approved">Đã duyệt</SelectItem>
          <SelectItem value="applied">Đã áp dụng</SelectItem>
          <SelectItem value="rejected">Từ chối</SelectItem>
          <SelectItem value="superseded">Đã thay thế</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <ListPageLayout
      title="Duyệt lịch rảnh"
      subtitle="Xem và phê duyệt lịch giáo viên đăng ký từ Teacher's Hub"
      icon={CalendarCheck}
      filterBar={filterBar}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : error || data?.errorMessage ? (
        <Card><CardContent className="py-10 text-center text-sm text-destructive flex flex-col items-center gap-2">
          <AlertCircle className="h-6 w-6" />
          <p>{data?.errorMessage || String((error as any)?.message || "Không tải được drafts")}</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,360px)_1fr] gap-4">
          {/* LEFT: list */}
          <div className="space-y-2 lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                <Inbox className="h-8 w-8 opacity-40" />
                <p className="text-sm">Không có draft nào</p>
              </CardContent></Card>
            ) : (
              filtered.map((d) => {
                const isSelected = selected?.id === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => setSelectedId(d.id)}
                    className={cn(
                      "w-full text-left rounded-md border bg-card p-3 hover:bg-accent/40 transition-colors",
                      isSelected && "ring-2 ring-primary border-primary",
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <Avatar className="h-9 w-9 shrink-0"><AvatarFallback className="text-xs bg-primary/10 text-primary">{initialsOf(d.teacher?.full_name)}</AvatarFallback></Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">{d.teacher?.full_name || "(Không rõ giáo viên)"}</p>
                          <StatusBadge status={d.status} />
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{d.teacher?.email || "—"}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatRange(d.effective_from)}</p>
                        {d.created_at && (
                          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                            Gửi {formatDistanceToNow(parseISO(d.created_at), { addSuffix: true, locale: vi })}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* RIGHT: detail */}
          <div className="lg:sticky lg:top-20">
            {selected ? (
              <Card><CardContent className="p-4 space-y-4">
                {/* Teacher header */}
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12"><AvatarFallback className="bg-primary/10 text-primary">{initialsOf(selected.teacher?.full_name)}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-semibold truncate">{selected.teacher?.full_name || "—"}</h2>
                      <StatusBadge status={selected.status} />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{selected.teacher?.email || "—"}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(selected.capability?.level_keys || []).map((lvl) => (
                        <Badge key={lvl} variant="secondary" className="text-[10px] px-1.5 py-0">{lvl}</Badge>
                      ))}
                      {(selected.capability?.program_keys || []).map((p) => (
                        <Badge key={p} variant="outline" className="text-[10px] px-1.5 py-0">{p}</Badge>
                      ))}
                      {selected.capability?.can_teach_online && <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 border-blue-200" variant="outline">Online</Badge>}
                      {selected.capability?.can_teach_offline && <Badge className="text-[10px] px-1.5 py-0 bg-purple-100 text-purple-700 border-purple-200" variant="outline">Offline</Badge>}
                    </div>
                  </div>
                </div>

                {/* Effective range */}
                <div className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-2">
                  <p className="font-medium text-foreground">Hiệu lực: {formatRange(selected.effective_from)}</p>
                </div>

                {/* Validation */}
                <div className="rounded-md border p-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kiểm tra xung đột</p>
                  {!validation || validation.conflicts.length === 0 ? (
                    <div className="flex items-center gap-2 text-emerald-700 text-sm">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Không có xung đột lịch</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-orange-700 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        <span>{validation.conflicts.length} xung đột với lớp đang dạy</span>
                      </div>
                      <ul className="text-xs space-y-1">
                        {validation.conflicts.map((c, i) => (
                          <li key={i} className="flex items-center gap-2 text-muted-foreground">
                            <span className="font-medium text-foreground">{c.class_name}</span>
                            <span>·</span>
                            <span>{c.weekday !== undefined ? WEEKDAY_LABELS[c.weekday] : c.date} {c.start_time}–{c.end_time}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {validation && !validation.lead_time_ok && (
                    <p className="text-xs text-orange-600">⚠ Lead time chỉ {validation.lead_time_days} ngày (yêu cầu ≥ 14)</p>
                  )}
                </div>

                {/* Availability grid */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lịch rảnh đăng ký</p>
                  <AvailabilityGrid rules={Array.isArray(selected.availability_rules) ? selected.availability_rules as any : []} />
                </div>

                {/* Notes */}
                {(selected as any).notes && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ghi chú giáo viên</p>
                    <Textarea readOnly value={(selected as any).notes} className="text-xs resize-none" rows={3} />
                  </div>
                )}

                {/* Review history */}
                {selected.reviewed_at && (
                  <div className="rounded-md bg-muted/40 p-3 text-xs space-y-0.5">
                    <p className="font-medium">Lịch sử duyệt</p>
                    <p className="text-muted-foreground">
                      Lúc {format(parseISO(selected.reviewed_at), "dd/MM/yyyy HH:mm", { locale: vi })}
                      {selected.reviewed_by ? ` · bởi ${selected.reviewed_by.slice(0, 8)}…` : ""}
                    </p>
                    {selected.review_note && <p className="italic text-muted-foreground">"{selected.review_note}"</p>}
                  </div>
                )}

                {/* Actions */}
                {canReview && (
                  <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                    <Button variant="outline" size="sm" className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-50 hover:text-orange-800" onClick={() => openAction("needs_changes")}>
                      <MessageSquareWarning className="h-4 w-4 mr-1.5" /> Yêu cầu sửa
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800" onClick={() => openAction("rejected")}>
                      <XCircle className="h-4 w-4 mr-1.5" /> Từ chối
                    </Button>
                    <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => openAction("approve")}>
                      <CheckCircle2 className="h-4 w-4 mr-1.5" /> Duyệt và áp dụng
                    </Button>
                  </div>
                )}
              </CardContent></Card>
            ) : (
              <Card><CardContent className="py-20 text-center text-sm text-muted-foreground">Chọn một draft để xem chi tiết</CardContent></Card>
            )}
          </div>
        </div>
      )}

      {/* Action dialogs */}
      <Dialog open={!!actionOpen} onOpenChange={(o) => !o && setActionOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionOpen === "approve" && "Xác nhận duyệt và áp dụng"}
              {actionOpen === "needs_changes" && "Yêu cầu giáo viên sửa lịch"}
              {actionOpen === "rejected" && "Từ chối lịch đăng ký"}
            </DialogTitle>
            <DialogDescription>
              {actionOpen === "approve" && selected && (
                <>Xác nhận áp dụng lịch này? Các quy tắc cũ của <b>{selected.teacher?.full_name}</b> từ {format(parseISO(selected.effective_from), "dd/MM/yyyy")} sẽ bị thay thế.</>
              )}
              {actionOpen !== "approve" && "Vui lòng nhập lý do (tối thiểu 10 ký tự) để giáo viên hiểu rõ."}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder={actionOpen === "approve" ? "Ghi chú duyệt (không bắt buộc)…" : "Lý do…"}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionOpen(null)}>Hủy</Button>
            <Button
              onClick={submitAction}
              disabled={reviewMutation.isPending || approveMutation.isPending}
              className={actionOpen === "approve" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
              variant={actionOpen === "rejected" ? "destructive" : "default"}
            >
              {(reviewMutation.isPending || approveMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ListPageLayout>
  );
}
