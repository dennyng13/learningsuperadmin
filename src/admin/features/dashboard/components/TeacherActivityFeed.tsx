/**
 * Teacher Activity Feed — stream realtime hoạt động giáo viên trên Admin Dashboard.
 *
 * Nguồn (tất cả có teacher_id direct):
 *  - writing_feedback   → chấm Writing
 *  - speaking_feedback  → chấm Speaking
 *  - class_announcements→ đăng thông báo lớp
 *  - student_questions  (response_at IS NOT NULL) → trả lời học viên
 *
 * Click vào item → navigate tới detail tương ứng.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import {
  PenLine, Mic2, Megaphone, MessageCircleReply, Activity, ChevronRight, Sparkles,
  Filter, X, CalendarClock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@shared/lib/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import { Button } from "@shared/components/ui/button";

type ActivityKind = "writing" | "speaking" | "announcement" | "answer" | "session";

interface FeedItem {
  id: string;
  kind: ActivityKind;
  teacherId: string;
  teacherName: string;
  studentName?: string | null;
  className?: string | null;
  detail: string;
  createdAt: string;
  navigateTo: string;
}

const KIND_META: Record<ActivityKind, {
  icon: typeof PenLine;
  label: string;
  bg: string;
  ring: string;
  fg: string;
  verb: string;
}> = {
  writing: {
    icon: PenLine,
    label: "Writing",
    bg: "bg-violet-500/10",
    ring: "ring-violet-500/20",
    fg: "text-violet-600 dark:text-violet-400",
    verb: "đã chấm Writing cho",
  },
  speaking: {
    icon: Mic2,
    label: "Speaking",
    bg: "bg-sky-500/10",
    ring: "ring-sky-500/20",
    fg: "text-sky-600 dark:text-sky-400",
    verb: "đã chấm Speaking cho",
  },
  announcement: {
    icon: Megaphone,
    label: "Thông báo",
    bg: "bg-amber-500/10",
    ring: "ring-amber-500/20",
    fg: "text-amber-600 dark:text-amber-400",
    verb: "đã đăng thông báo",
  },
  answer: {
    icon: MessageCircleReply,
    label: "Trả lời",
    bg: "bg-emerald-500/10",
    ring: "ring-emerald-500/20",
    fg: "text-emerald-600 dark:text-emerald-400",
    verb: "đã trả lời câu hỏi của",
  },
  session: {
    icon: CalendarClock,
    label: "Buổi học",
    bg: "bg-blue-500/10",
    ring: "ring-blue-500/20",
    fg: "text-blue-600 dark:text-blue-400",
    verb: "đã cập nhật buổi học",
  },
};

const PAGE_SIZE = 20;

interface TeacherLite { id: string; full_name: string }
interface StudentLite { id: string; full_name: string }
interface ClassLite { id: string; class_name: string }

async function fetchFeed(limit: number): Promise<FeedItem[]> {
  // Pull recent rows from each source (last ~7 days). Per-source limit scales
  // with overall page size so we have enough candidates to merge & sort.
  const sinceIso = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
  const perSource = Math.max(10, Math.ceil(limit / 2));

  const [
    { data: writing },
    { data: speaking },
    { data: announcements },
    { data: answers },
    { data: sessions },
  ] = await Promise.all([
    supabase
      .from("writing_feedback")
      .select("id, teacher_id, student_id, task_key, overall_band, result_id, created_at")
      .not("teacher_id", "is", null)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(perSource),
    supabase
      .from("speaking_feedback")
      .select("id, teacher_id, student_id, part_key, overall_band, result_id, created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(perSource),
    supabase
      .from("class_announcements")
      .select("id, teacher_id, class_id, title, created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(perSource),
    supabase
      .from("student_questions")
      .select("id, teacher_id, student_id, class_id, title, response_at")
      .not("teacher_id", "is", null)
      .not("response_at", "is", null)
      .gte("response_at", sinceIso)
      .order("response_at", { ascending: false })
      .limit(perSource),
    // Sessions: only "completed" entries — that's when a teacher actively updated the session.
    supabase
      .from("study_plan_entries")
      .select("id, plan_id, session_number, session_title, entry_date, completed_at")
      .not("completed_at", "is", null)
      .gte("completed_at", sinceIso)
      .order("completed_at", { ascending: false })
      .limit(Math.max(15, perSource)),
  ]);

  // Resolve session → teacher via plan.class_ids → class.teacher_id.
  // Each plan may map to multiple classes — pick the first class with a teacher.
  const planIds = [...new Set((sessions || []).map(s => s.plan_id).filter(Boolean))];
  const planClassMap = new Map<string, string[]>();
  if (planIds.length > 0) {
    const { data: plans } = await supabase
      .from("study_plans")
      .select("id, class_ids")
      .in("id", planIds);
    (plans || []).forEach(p => {
      const ids = Array.isArray(p.class_ids) ? (p.class_ids as string[]).filter(Boolean) : [];
      if (ids.length > 0) planClassMap.set(p.id, ids);
    });
  }
  const sessionClassIds = [...new Set([...planClassMap.values()].flat())];
  const sessionClassMap = new Map<string, { teacherId: string | null; className: string }>();
  if (sessionClassIds.length > 0) {
    const { data: cls } = await supabase
      .from("teachngo_classes")
      .select("id, class_name, teacher_id")
      .in("id", sessionClassIds);
    (cls || []).forEach(c => sessionClassMap.set(c.id, {
      teacherId: c.teacher_id ?? null,
      className: c.class_name,
    }));
  }

  // Collect all referenced IDs
  const teacherIds = new Set<string>();
  const studentIds = new Set<string>();
  const classIds = new Set<string>();

  (writing || []).forEach(r => { if (r.teacher_id) teacherIds.add(r.teacher_id); studentIds.add(r.student_id); });
  (speaking || []).forEach(r => { teacherIds.add(r.teacher_id); studentIds.add(r.student_id); });
  (announcements || []).forEach(r => { teacherIds.add(r.teacher_id); classIds.add(r.class_id); });
  (answers || []).forEach(r => {
    if (r.teacher_id) teacherIds.add(r.teacher_id);
    studentIds.add(r.student_id);
    if (r.class_id) classIds.add(r.class_id);
  });
  // Sessions resolve teacher via the precomputed sessionClassMap (skip if no teacher).
  (sessions || []).forEach(s => {
    const cIds = planClassMap.get(s.plan_id) || [];
    for (const cid of cIds) {
      const info = sessionClassMap.get(cid);
      if (info?.teacherId) { teacherIds.add(info.teacherId); break; }
    }
  });

  // Batch lookup names
  const [{ data: teachers }, { data: students }, { data: classes }] = await Promise.all([
    teacherIds.size
      ? supabase.from("teachers").select("id, full_name").in("id", [...teacherIds])
      : Promise.resolve({ data: [] as TeacherLite[] }),
    studentIds.size
      ? supabase.from("teachngo_students").select("id, full_name").in("id", [...studentIds])
      : Promise.resolve({ data: [] as StudentLite[] }),
    classIds.size
      ? supabase.from("teachngo_classes").select("id, class_name").in("id", [...classIds])
      : Promise.resolve({ data: [] as ClassLite[] }),
  ]);

  const tMap = new Map((teachers || []).map(t => [t.id, t.full_name]));
  const sMap = new Map((students || []).map(s => [s.id, s.full_name]));
  const cMap = new Map((classes || []).map(c => [c.id, c.class_name]));

  const items: FeedItem[] = [];

  (writing || []).forEach(r => {
    if (!r.teacher_id) return;
    const band = r.overall_band != null ? ` · band ${r.overall_band}` : "";
    items.push({
      id: `w-${r.id}`,
      kind: "writing",
      teacherId: r.teacher_id,
      teacherName: tMap.get(r.teacher_id) || "Giáo viên",
      studentName: sMap.get(r.student_id) || "học viên",
      detail: `${r.task_key}${band}`,
      createdAt: r.created_at,
      navigateTo: `/users?tab=students&student_id=${r.student_id}`,
    });
  });

  (speaking || []).forEach(r => {
    const band = r.overall_band != null ? ` · band ${r.overall_band}` : "";
    items.push({
      id: `s-${r.id}`,
      kind: "speaking",
      teacherId: r.teacher_id,
      teacherName: tMap.get(r.teacher_id) || "Giáo viên",
      studentName: sMap.get(r.student_id) || "học viên",
      detail: `${r.part_key}${band}`,
      createdAt: r.created_at,
      navigateTo: `/users?tab=students&student_id=${r.student_id}`,
    });
  });

  (announcements || []).forEach(r => {
    items.push({
      id: `a-${r.id}`,
      kind: "announcement",
      teacherId: r.teacher_id,
      teacherName: tMap.get(r.teacher_id) || "Giáo viên",
      className: cMap.get(r.class_id) || "lớp",
      detail: r.title,
      createdAt: r.created_at,
      navigateTo: `/classes?class_id=${r.class_id}`,
    });
  });

  (answers || []).forEach(r => {
    if (!r.teacher_id || !r.response_at) return;
    items.push({
      id: `q-${r.id}`,
      kind: "answer",
      teacherId: r.teacher_id,
      teacherName: tMap.get(r.teacher_id) || "Giáo viên",
      studentName: sMap.get(r.student_id) || "học viên",
      className: r.class_id ? cMap.get(r.class_id) || null : null,
      detail: r.title,
      createdAt: r.response_at,
      navigateTo: r.class_id ? `/classes?class_id=${r.class_id}` : `/users?tab=students&student_id=${r.student_id}`,
    });
  });

  (sessions || []).forEach(s => {
    if (!s.completed_at) return;
    // Find first class with a teacher for this plan
    const cIds = planClassMap.get(s.plan_id) || [];
    let teacherId: string | null = null;
    let className: string | null = null;
    let classId: string | null = null;
    for (const cid of cIds) {
      const info = sessionClassMap.get(cid);
      if (info) {
        if (!className) { className = info.className; classId = cid; }
        if (info.teacherId) { teacherId = info.teacherId; className = info.className; classId = cid; break; }
      }
    }
    if (!teacherId) return; // skip orphan sessions (no class teacher)
    const sessionLabel = s.session_title
      || (s.session_number != null ? `Buổi #${s.session_number}` : "Buổi học");
    items.push({
      id: `e-${s.id}`,
      kind: "session",
      teacherId,
      teacherName: tMap.get(teacherId) || "Giáo viên",
      className,
      detail: `${sessionLabel} · ${s.entry_date}`,
      createdAt: s.completed_at,
      navigateTo: classId ? `/classes?class_id=${classId}` : `/study-plans`,
    });
  });

  return items
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, limit);
}

const KIND_FILTERS: { value: ActivityKind; label: string }[] = [
  { value: "writing", label: "Writing" },
  { value: "speaking", label: "Speaking" },
  { value: "announcement", label: "Thông báo" },
  { value: "answer", label: "Trả lời" },
  { value: "session", label: "Buổi học" },
];

export default function TeacherActivityFeed() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pulseIds, setPulseIds] = useState<Set<string>>(new Set());
  const [connected, setConnected] = useState(false);
  const [limit, setLimit] = useState<number>(PAGE_SIZE);

  // Filters synced with URL query params (?teacher=xxx&kind=writing)
  const teacherFilter = searchParams.get("teacher") || "all";
  const kindParam = searchParams.get("kind");
  const kindFilter: ActivityKind | "all" =
    kindParam && KIND_FILTERS.some(k => k.value === kindParam)
      ? (kindParam as ActivityKind)
      : "all";

  const updateParam = (key: "teacher" | "kind", value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
    setLimit(PAGE_SIZE); // reset paging when filter changes
  };

  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("teacher");
    next.delete("kind");
    setSearchParams(next, { replace: true });
    setLimit(PAGE_SIZE);
  };

  const { data: items, isLoading, isFetching } = useQuery({
    queryKey: ["teacher-activity-feed", limit],
    queryFn: () => fetchFeed(limit),
    staleTime: 60_000,
  });

  // Realtime: any new row across the 5 sources triggers a refetch + pulse
  useEffect(() => {
    let timer: number | null = null;
    const scheduleRefetch = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["teacher-activity-feed"] });
      }, 2500);
    };

    const flashFirst = () => {
      window.setTimeout(() => {
        const head = document.querySelector<HTMLElement>("[data-feed-head]");
        if (head) {
          head.classList.add("ring-2", "ring-emerald-500/50");
          window.setTimeout(() => head.classList.remove("ring-2", "ring-emerald-500/50"), 1200);
        }
      }, 2700);
    };

    const onChange = () => { scheduleRefetch(); flashFirst(); };

    const channel = supabase
      .channel("dashboard-teacher-activity-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "writing_feedback" }, onChange)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "speaking_feedback" }, onChange)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "class_announcements" }, onChange)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "student_questions" }, (payload: any) => {
        const oldRow = payload?.old || {};
        const newRow = payload?.new || {};
        if (!oldRow.response_at && newRow.response_at) onChange();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "study_plan_entries" }, (payload: any) => {
        const oldRow = payload?.old || {};
        const newRow = payload?.new || {};
        if (!oldRow.completed_at && newRow.completed_at) onChange();
      })
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    return () => {
      if (timer) window.clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const itemKey = items?.map(i => i.id).join("|") ?? "";
  useEffect(() => {
    if (!items || items.length === 0) return;
    setPulseIds(new Set([items[0].id]));
    const t = window.setTimeout(() => setPulseIds(new Set()), 1500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemKey]);

  // Unique teacher list for the dropdown
  const teacherOptions = useMemo(() => {
    if (!items) return [];
    const map = new Map<string, string>();
    items.forEach(i => { if (!map.has(i.teacherId)) map.set(i.teacherId, i.teacherName); });
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [items]);

  // Counts per kind (after teacher filter, before kind filter)
  const kindCounts = useMemo(() => {
    const counts: Record<ActivityKind | "all", number> = {
      all: 0, writing: 0, speaking: 0, announcement: 0, answer: 0, session: 0,
    };
    (items || [])
      .filter(i => teacherFilter === "all" || i.teacherId === teacherFilter)
      .forEach(i => { counts.all++; counts[i.kind]++; });
    return counts;
  }, [items, teacherFilter]);

  const filtered = useMemo(() => {
    return (items || []).filter(i =>
      (teacherFilter === "all" || i.teacherId === teacherFilter) &&
      (kindFilter === "all" || i.kind === kindFilter)
    );
  }, [items, teacherFilter, kindFilter]);

  const hasActiveFilter = teacherFilter !== "all" || kindFilter !== "all";
  const showSkeleton = isLoading && !items;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h2 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 min-w-0">
          <Activity className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Hoạt động giáo viên</span>
        </h2>
        <span className={cn(
          "text-[11px] flex items-center gap-1.5 transition-colors shrink-0",
          connected ? "text-emerald-600" : "text-muted-foreground",
        )}>
          <span className="relative flex h-2 w-2">
            {connected && (
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
            )}
            <span className={cn(
              "relative inline-flex rounded-full h-2 w-2",
              connected ? "bg-emerald-500" : "bg-muted-foreground/40",
            )} />
          </span>
          {connected ? "Live" : "Đang kết nối…"}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Select value={teacherFilter} onValueChange={(v) => updateParam("teacher", v)}>
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue placeholder="Tất cả giáo viên" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả giáo viên</SelectItem>
            {teacherOptions.map(t => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex flex-wrap items-center gap-1">
          <KindChip
            label="Tất cả"
            active={kindFilter === "all"}
            count={kindCounts.all}
            onClick={() => updateParam("kind", "all")}
          />
          {KIND_FILTERS.map(k => (
            <KindChip
              key={k.value}
              label={k.label}
              active={kindFilter === k.value}
              count={kindCounts[k.value]}
              meta={KIND_META[k.value]}
              onClick={() => updateParam("kind", k.value)}
            />
          ))}
        </div>

        {hasActiveFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3 mr-1" />
            Xóa lọc
          </Button>
        )}
      </div>

      {showSkeleton ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 rounded-md bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <div className="rounded-md border border-dashed bg-background/40 py-8 px-4 text-center">
          <Sparkles className="h-5 w-5 text-muted-foreground/60 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">
            Chưa có hoạt động nào trong 7 ngày qua.
          </p>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
            Khi giáo viên chấm bài, đăng thông báo hoặc trả lời học viên — sẽ hiện tại đây.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-dashed bg-background/40 py-8 px-4 text-center">
          <Filter className="h-5 w-5 text-muted-foreground/60 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">
            Không có hoạt động nào khớp bộ lọc.
          </p>
          <Button variant="link" size="sm" onClick={clearFilters} className="text-[11px] h-auto p-0 mt-1">
            Xóa lọc
          </Button>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {filtered.map((it, idx) => (
            <FeedRow
              key={it.id}
              item={it}
              isHead={idx === 0}
              pulse={pulseIds.has(it.id)}
              onClick={() => navigate(it.navigateTo)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function KindChip({
  label, active, count, meta, onClick,
}: {
  label: string;
  active: boolean;
  count: number;
  meta?: typeof KIND_META[ActivityKind];
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-7 px-2.5 rounded-full text-[11px] font-medium transition-all border flex items-center gap-1.5",
        active
          ? meta
            ? cn(meta.bg, meta.fg, "border-transparent")
            : "bg-primary text-primary-foreground border-transparent"
          : "bg-background text-muted-foreground border-border hover:bg-muted",
      )}
    >
      {label}
      <span className={cn(
        "tabular-nums text-[10px] px-1 rounded",
        active ? "bg-background/30" : "bg-muted",
      )}>
        {count}
      </span>
    </button>
  );
}

function FeedRow({
  item, isHead, pulse, onClick,
}: { item: FeedItem; isHead: boolean; pulse: boolean; onClick: () => void }) {
  const meta = KIND_META[item.kind];
  const Icon = meta.icon;
  // Target = the noun the teacher acted on:
  //  - announcement / session  → class name
  //  - writing / speaking / answer → student name
  const usesClassTarget = item.kind === "announcement" || item.kind === "session";
  const target = usesClassTarget ? item.className : item.studentName;

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        data-feed-head={isHead ? "true" : undefined}
        className={cn(
          "w-full text-left rounded-md p-2.5 flex items-start gap-3 transition-all",
          "hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/40",
          "ring-1",
          meta.ring,
          pulse && "ring-2 ring-emerald-500/50 shadow-sm shadow-emerald-500/10",
        )}
      >
        <div className={cn(
          "h-8 w-8 rounded-md shrink-0 flex items-center justify-center",
          meta.bg,
        )}>
          <Icon className={cn("h-4 w-4", meta.fg)} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs leading-snug">
            <span className="font-semibold text-foreground">{item.teacherName}</span>
            <span className="text-muted-foreground"> {meta.verb} </span>
            <span className="font-semibold text-foreground">{target || "—"}</span>
            <span className="text-muted-foreground"> · "{item.detail}"</span>
          </p>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
            <span className={cn("px-1.5 py-0.5 rounded font-medium", meta.bg, meta.fg)}>
              {meta.label}
            </span>
            <span className="tabular-nums">
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: vi })}
            </span>
          </div>
        </div>

        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0 mt-2" />
      </button>
    </li>
  );
}
