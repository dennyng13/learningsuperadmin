import { useMemo, useState } from "react";
import {
  CalendarCheck, Search, Loader2, AlertCircle, CheckCircle2, XCircle,
  MessageSquareWarning, Inbox, Clock, BookOpen, Sparkles,
  Wifi, MapPin, ShieldCheck, Filter,
} from "lucide-react";
import { formatDistanceToNow, parseISO, format } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import { Card, CardContent } from "@shared/components/ui/card";
import { Input } from "@shared/components/ui/input";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import { Avatar, AvatarFallback } from "@shared/components/ui/avatar";
import { Textarea } from "@shared/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@shared/components/ui/dialog";
import { ListPageLayout } from "@shared/components/layouts/ListPageLayout";
import {
  useAvailabilityDrafts,
  useReviewDraftMutation,
  useApproveAndApplyMutation,
  type DraftWithTeacher,
  type ProgramLite,
} from "@shared/hooks/useAvailabilityDrafts";
import { WEEKDAY_LABELS, normalizeRules, validateAvailabilityDraft } from "@shared/utils/availability";
import { cn } from "@shared/lib/utils";

const STATUS_META: Record<string, { label: string; pill: string; dot: string }> = {
  pending:        { label: "Chờ duyệt",     pill: "bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/25", dot: "bg-amber-500" },
  needs_changes:  { label: "Cần sửa",       pill: "bg-orange-50 text-orange-700 border-orange-200/70 dark:bg-orange-500/10 dark:text-orange-200 dark:border-orange-500/25", dot: "bg-orange-500" },
  approved:       { label: "Đã duyệt",      pill: "bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-200 dark:border-emerald-500/25", dot: "bg-emerald-500" },
  applied:        { label: "Đã áp dụng",    pill: "bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/20", dot: "bg-white" },
  rejected:       { label: "Từ chối",       pill: "bg-rose-50 text-rose-700 border-rose-200/70 dark:bg-rose-500/10 dark:text-rose-200 dark:border-rose-500/25", dot: "bg-rose-500" },
  superseded:     { label: "Đã thay thế",   pill: "bg-muted text-muted-foreground border-border/60", dot: "bg-muted-foreground" },
};

const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: "pending",       label: "Chờ duyệt" },
  { value: "needs_changes", label: "Cần sửa" },
  { value: "approved",      label: "Đã duyệt" },
  { value: "applied",       label: "Đã áp dụng" },
  { value: "rejected",      label: "Từ chối" },
  { value: "all",           label: "Tất cả" },
];

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] || { label: status, pill: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border", meta.pill)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

function initialsOf(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map((s) => s[0]).filter(Boolean).slice(-2).join("").toUpperCase();
}

function formatRange(from: string, to?: string | null) {
  const f = format(parseISO(from), "dd/MM/yyyy", { locale: vi });
  if (to) return `${f} → ${format(parseISO(to), "dd/MM/yyyy", { locale: vi })}`;
  return `${f} → ∞`;
}

/* ── Availability grid (readonly) ── */
const HOURS = Array.from({ length: 15 }, (_, i) => 7 + i); // 07..21
const WEEKDAY_GRID = [1, 2, 3, 4, 5, 6, 0];

function AvailabilityGrid({ rules }: { rules: ReturnType<typeof normalizeRules> }) {
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

  const totalCells = rules.reduce((sum, r) => {
    const [sh] = r.start_time.split(":").map(Number);
    const [eh, em] = r.end_time.split(":").map(Number);
    return sum + Math.max(0, (eh + (em > 0 ? 1 : 0)) - sh);
  }, 0);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />Khung giờ rảnh
        </p>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-emerald-500/80" />Có lịch
          </span>
          <span className="font-semibold text-foreground tabular-nums">{totalCells}h / tuần</span>
        </div>
      </div>
      <div className="border border-border/60 rounded-xl overflow-hidden bg-card">
        <div className="grid" style={{ gridTemplateColumns: "40px repeat(7, 1fr)" }}>
          <div className="bg-muted/30 p-1.5 text-[10px] text-muted-foreground" />
          {WEEKDAY_GRID.map((wd) => (
            <div key={wd} className="bg-muted/30 py-1.5 text-center text-[10px] font-semibold text-muted-foreground border-l border-border/40">
              {WEEKDAY_LABELS[wd]}
            </div>
          ))}
          {HOURS.map((h) => (
            <>
              <div key={`l-${h}`} className="border-t border-border/30 bg-muted/10 py-0.5 text-[9px] tabular-nums text-muted-foreground/70 text-right pr-1.5 leading-6">
                {String(h).padStart(2, "0")}
              </div>
              {WEEKDAY_GRID.map((wd) => (
                <div
                  key={`c-${h}-${wd}`}
                  className={cn(
                    "border-t border-l border-border/30 h-6 transition-colors",
                    isActive(wd, h)
                      ? "bg-emerald-500/80 dark:bg-emerald-500/60 hover:bg-emerald-500/95"
                      : "bg-card hover:bg-muted/30",
                  )}
                />
              ))}
            </>
          ))}
        </div>
      </div>
    </div>
  );
}

type ActionType = "needs_changes" | "rejected" | "approve" | null;

function ProgramChip({ programKey, programs }: { programKey: string; programs: ProgramLite[] }) {
  const p = programs.find((x) => x.key.toLowerCase() === programKey.toLowerCase());
  return (
    <Badge variant="outline" className="text-[11px] px-2 py-0.5 font-medium border-primary/30 bg-primary/5 text-primary">
      {p?.name ?? programKey}
      {p?.level ? <span className="ml-1 opacity-70">· {p.level}</span> : null}
    </Badge>
  );
}

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
  const programs = data?.programs || [];

  // Counts per status (for tab badges)
  const counts = useMemo(() => {
    const out: Record<string, number> = { all: drafts.length };
    for (const t of STATUS_TABS) {
      if (t.value === "all") continue;
      out[t.value] = drafts.filter((d) => d.status === t.value).length;
    }
    return out;
  }, [drafts]);

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
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm giáo viên theo tên hoặc email…"
          className="pl-10 h-11 rounded-xl border-border/60 bg-card/80 focus-visible:ring-2 focus-visible:ring-primary/30"
        />
      </div>
      <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 scrollbar-none">
        <Filter className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
        {STATUS_TABS.map((t) => {
          const active = statusFilter === t.value;
          const n = counts[t.value] ?? 0;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setStatusFilter(t.value)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 shrink-0",
                active
                  ? "bg-foreground text-background border-foreground shadow-sm"
                  : "bg-transparent text-muted-foreground border-border/60 hover:border-foreground/30 hover:text-foreground",
              )}
            >
              {t.label}
              <span className={cn(
                "min-w-[18px] text-center px-1.5 py-0 rounded-full text-[10px] font-semibold tabular-nums",
                active ? "bg-background/20 text-background" : "bg-muted/70 text-muted-foreground",
              )}>{n}</span>
            </button>
          );
        })}
      </div>
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
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,360px)_1fr] gap-5">
          {/* LEFT: list */}
          <div className="space-y-1.5 lg:max-h-[calc(100vh-240px)] lg:overflow-y-auto pr-1 -mr-1">
            <div className="hidden lg:flex items-center justify-between px-1 pb-1.5 text-[11px] text-muted-foreground">
              <span>{filtered.length} đăng ký</span>
              {filtered.length > 0 && <span className="opacity-60">Click để xem chi tiết</span>}
            </div>
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 py-16 text-center text-muted-foreground flex flex-col items-center gap-2.5">
                <div className="h-12 w-12 rounded-full bg-muted/40 flex items-center justify-center">
                  <Inbox className="h-5 w-5 opacity-50" />
                </div>
                <p className="text-sm font-medium text-foreground">Không có draft nào</p>
                <p className="text-xs">Thử đổi filter trạng thái khác</p>
              </div>
            ) : (
              filtered.map((d) => {
                const isSelected = selected?.id === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => setSelectedId(d.id)}
                    className={cn(
                      "w-full text-left rounded-xl border bg-card px-3.5 py-3 transition-all duration-200 group relative",
                      isSelected
                        ? "border-foreground/80 shadow-[0_2px_12px_-4px_hsl(var(--foreground)/0.15)] bg-card"
                        : "border-border/50 hover:border-border hover:bg-muted/20 hover:translate-x-0.5",
                    )}
                  >
                    {isSelected && (
                      <span className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r-full bg-foreground" />
                    )}
                    <div className="flex items-start gap-3">
                      <Avatar className={cn(
                        "h-9 w-9 shrink-0 ring-2 transition-all",
                        isSelected ? "ring-foreground/15" : "ring-transparent",
                      )}>
                        <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
                          {initialsOf(d.teacher?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold truncate leading-tight">{d.teacher?.full_name || "(Không rõ)"}</p>
                          <StatusBadge status={d.status} />
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{d.teacher?.email || "—"}</p>
                        <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1 font-medium tabular-nums">
                            <Clock className="h-3 w-3 opacity-60" />
                            {format(parseISO(d.effective_from), "dd/MM", { locale: vi })}
                          </span>
                          {d.created_at && (
                            <>
                              <span className="opacity-40">·</span>
                              <span className="opacity-70 truncate">{formatDistanceToNow(parseISO(d.created_at), { addSuffix: true, locale: vi })}</span>
                            </>
                          )}
                        </div>
                        {Array.isArray(d.desired_programs) && d.desired_programs.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {d.desired_programs.slice(0, 3).map((k) => (
                              <span key={k} className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted/60 text-muted-foreground font-medium">
                                {programs.find((p) => p.key === k)?.name ?? k}
                              </span>
                            ))}
                            {d.desired_programs.length > 3 && (
                              <span className="text-[10px] text-muted-foreground/70 self-center">+{d.desired_programs.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* RIGHT: detail */}
          <div>
            {selected ? (
              <Card className="overflow-hidden border-border/60 shadow-sm">
                <CardContent className="p-0">
                  {/* Teacher header */}
                  <div className="px-6 pt-6 pb-5 border-b border-border/50 bg-gradient-to-b from-muted/20 to-transparent">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-14 w-14 shrink-0 ring-2 ring-background shadow-sm">
                        <AvatarFallback className="bg-gradient-to-br from-primary/15 to-primary/5 text-primary text-base font-bold">
                          {initialsOf(selected.teacher?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-lg font-bold truncate tracking-tight">{selected.teacher?.full_name || "—"}</h2>
                          <StatusBadge status={selected.status} />
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-0.5">{selected.teacher?.email || "—"}</p>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {(selected.capability?.level_keys || []).map((lvl) => (
                            <Badge key={lvl} variant="secondary" className="text-[10px] px-2 py-0.5 gap-1 font-medium">
                              <ShieldCheck className="h-2.5 w-2.5" />{lvl}
                            </Badge>
                          ))}
                          {selected.capability?.can_teach_online && (
                            <Badge className="text-[10px] px-2 py-0.5 gap-1 bg-sky-50 text-sky-700 border-sky-200/70 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/25" variant="outline">
                              <Wifi className="h-2.5 w-2.5" />Online
                            </Badge>
                          )}
                          {selected.capability?.can_teach_offline && (
                            <Badge className="text-[10px] px-2 py-0.5 gap-1 bg-violet-50 text-violet-700 border-violet-200/70 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/25" variant="outline">
                              <MapPin className="h-2.5 w-2.5" />Offline
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-5">

                  {/* Effective range */}
                  <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-background border border-border/60 flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Khoảng hiệu lực</p>
                      <p className="text-sm font-semibold tabular-nums mt-0.5">{formatRange(selected.effective_from, selected.effective_to)}</p>
                    </div>
                  </div>

                  {/* Desired programs (NEW) */}
                  {Array.isArray(selected.desired_programs) && selected.desired_programs.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5" />Chương trình mong muốn dạy
                        <span className="text-[10px] font-normal normal-case text-muted-foreground/70">({selected.desired_programs.length})</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {selected.desired_programs.map((k) => (
                          <ProgramChip key={k} programKey={k} programs={programs} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Validation */}
                  {(() => {
                    const ok = !validation || validation.conflicts.length === 0;
                    return (
                      <div className={cn(
                        "rounded-xl border p-4 space-y-2.5",
                        ok
                          ? "border-emerald-200/60 bg-emerald-50/40 dark:bg-emerald-500/[0.06] dark:border-emerald-500/20"
                          : "border-orange-200/70 bg-orange-50/50 dark:bg-orange-500/[0.06] dark:border-orange-500/25",
                      )}>
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Kiểm tra xung đột</p>
                          {validation && (
                            <span className={cn(
                              "text-[10px] font-medium px-2 py-0.5 rounded-full",
                              validation.lead_time_ok
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                                : "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
                            )}>
                              Lead time {validation.lead_time_days}d
                            </span>
                          )}
                        </div>
                        {ok ? (
                          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-sm font-medium">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Không có xung đột lịch</span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300 text-sm font-medium">
                              <AlertCircle className="h-4 w-4" />
                              <span>{validation.conflicts.length} xung đột với lớp đang dạy</span>
                            </div>
                            <ul className="text-xs space-y-1.5 pl-1 max-h-32 overflow-y-auto">
                              {validation.conflicts.map((c, i) => (
                                <li key={i} className="flex items-center gap-2 text-muted-foreground">
                                  <span className="h-1 w-1 rounded-full bg-orange-500/70" />
                                  <span className="font-medium text-foreground">{c.class_name}</span>
                                  <span className="opacity-50">·</span>
                                  <span className="tabular-nums">{c.weekday !== undefined ? WEEKDAY_LABELS[c.weekday] : c.date} {c.start_time}–{c.end_time}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Availability grid */}
                  <AvailabilityGrid rules={Array.isArray(selected.availability_rules) ? selected.availability_rules as any : []} />

                  {/* Notes */}
                  {selected.notes && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" />Ghi chú giáo viên
                      </p>
                      <div className="rounded-lg border bg-muted/30 p-3 text-sm text-foreground/90 italic">
                        "{selected.notes}"
                      </div>
                    </div>
                  )}

                  {/* Review history */}
                  {selected.reviewed_at && (
                    <div className="rounded-xl bg-muted/30 border border-border/50 p-3.5 text-xs space-y-1">
                      <p className="font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">Lịch sử duyệt</p>
                      <p className="text-muted-foreground">
                        {format(parseISO(selected.reviewed_at), "dd/MM/yyyy 'lúc' HH:mm", { locale: vi })}
                        {selected.reviewed_by ? ` · ${selected.reviewed_by.slice(0, 8)}…` : ""}
                      </p>
                      {selected.review_note && <p className="italic text-foreground/80 mt-1.5 pl-2 border-l-2 border-border">"{selected.review_note}"</p>}
                    </div>
                  )}
                  </div>

                  {/* Sticky action footer */}
                  {canReview && (
                    <div className="sticky bottom-0 bg-card/95 backdrop-blur-md border-t border-border/60 px-6 py-3.5 flex flex-col sm:flex-row gap-2">
                      <Button
                        variant="outline"
                        size="default"
                        className="flex-1 h-10 border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800 hover:border-orange-300 dark:border-orange-500/30 dark:text-orange-300 dark:hover:bg-orange-500/10"
                        onClick={() => openAction("needs_changes")}
                      >
                        <MessageSquareWarning className="h-4 w-4 mr-1.5" /> Yêu cầu sửa
                      </Button>
                      <Button
                        variant="outline"
                        size="default"
                        className="flex-1 h-10 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-300 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
                        onClick={() => openAction("rejected")}
                      >
                        <XCircle className="h-4 w-4 mr-1.5" /> Từ chối
                      </Button>
                      <Button
                        size="default"
                        className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20"
                        onClick={() => openAction("approve")}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1.5" /> Duyệt và áp dụng
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed border-border/60 bg-card/50">
                <CardContent className="py-24 text-center text-sm text-muted-foreground flex flex-col items-center gap-3">
                  <div className="h-14 w-14 rounded-full bg-muted/40 flex items-center justify-center">
                    <Inbox className="h-6 w-6 opacity-50" />
                  </div>
                  <p className="font-medium text-foreground">Chưa chọn draft nào</p>
                  <p className="text-xs">Chọn một đăng ký từ danh sách bên trái để xem chi tiết</p>
                </CardContent>
              </Card>
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
              {actionOpen === "approve" ? "Duyệt và áp dụng" : actionOpen === "rejected" ? "Từ chối" : "Yêu cầu sửa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ListPageLayout>
  );
}
