import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import {
  format, addDays, subDays, isToday, startOfWeek, endOfWeek,
  isSameDay, startOfMonth, endOfMonth, addMonths, subMonths,
  eachDayOfInterval,
} from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@shared/lib/utils";
import {
  ChevronLeft, ChevronRight, CalendarDays, Loader2,
  Layers, FileText, Library, Users, User, AlertTriangle,
} from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@shared/components/ui/popover";
import { Calendar } from "@shared/components/ui/calendar";
import { Progress } from "@shared/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { useIsMobile } from "@shared/hooks/use-mobile";
import { toast } from "sonner";
import SessionPopover from "@shared/components/schedule/SessionPopover";

/* ═══ Types ═══ */
interface SessionWithClass {
  entry: any;
  cls: any;
  sessionNumber: number;
  totalSessions: number;
  doneSessions: number;
  teacherName?: string;
}

const DAY_LABELS: Record<number, string> = { 0: "CN", 1: "T2", 2: "T3", 3: "T4", 4: "T5", 5: "T6", 6: "T7" };
const WEEK_DAYS_ORDER = [1, 2, 3, 4, 5, 6, 0];

function fmtTime(t: string | null) {
  if (!t) return "—:—";
  return t.slice(0, 5);
}

function fmtDuration(start: string | null, end: string | null) {
  if (!start || !end) return "";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) return "";
  if (mins >= 60 && mins % 60 === 0) return `${mins / 60} giờ`;
  if (mins >= 60) return `${Math.floor(mins / 60)}h${mins % 60}`;
  return `${mins} phút`;
}

function parseTimeToMinutes(t: string | null): number {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/* ═══ Data fetcher ═══ */
async function fetchAllScheduleData(startDate: string, endDate: string) {
  const { data: classes } = await supabase
    .from("teachngo_classes")
    .select("id, class_name, class_type, level, program, room, default_start_time, default_end_time, study_plan_id, teacher_id")
    .eq("status", "active");
  if (!classes || classes.length === 0) return { sessions: [], classes: [] };

  // Get teacher names
  const teacherIds = [...new Set(classes.map(c => c.teacher_id).filter(Boolean))];
  const teacherMap = new Map<string, string>();
  if (teacherIds.length > 0) {
    const { data: teachers } = await supabase
      .from("teachers")
      .select("id, full_name")
      .in("id", teacherIds);
    for (const t of teachers || []) {
      teacherMap.set(t.id, t.full_name || "—");
    }
  }

  const planToClass = new Map<string, any>();
  for (const c of classes) {
    if (c.study_plan_id) planToClass.set(c.study_plan_id, c);
  }
  const planIds = [...planToClass.keys()];
  if (planIds.length === 0) return { sessions: [], classes };

  const { data: entries } = await supabase
    .from("study_plan_entries")
    .select("*")
    .in("plan_id", planIds)
    .gte("entry_date", startDate)
    .lte("entry_date", endDate)
    .order("start_time", { ascending: true, nullsFirst: false });

  const { data: allEntries } = await supabase
    .from("study_plan_entries")
    .select("plan_id, plan_status")
    .in("plan_id", planIds);

  const planStats = new Map<string, { total: number; done: number }>();
  for (const e of allEntries || []) {
    const s = planStats.get(e.plan_id) || { total: 0, done: 0 };
    s.total++;
    if (e.plan_status === "done") s.done++;
    planStats.set(e.plan_id, s);
  }

  const sessions: SessionWithClass[] = (entries || []).map((entry: any) => {
    const cls = planToClass.get(entry.plan_id);
    const stats = planStats.get(entry.plan_id) || { total: 0, done: 0 };
    if (!entry.start_time && cls?.default_start_time) entry.start_time = cls.default_start_time;
    if (!entry.end_time && cls?.default_end_time) entry.end_time = cls.default_end_time;
    if (!entry.room && cls?.room) entry.room = cls.room;
    return {
      entry, cls,
      sessionNumber: entry.session_number || 0,
      totalSessions: stats.total,
      doneSessions: stats.done,
      teacherName: cls?.teacher_id ? teacherMap.get(cls.teacher_id) : undefined,
    };
  });

  sessions.sort((a, b) => (a.entry.start_time || "99:99").localeCompare(b.entry.start_time || "99:99"));
  return { sessions, classes };
}

/* ═══ Conflict detection ═══ */
function detectConflicts(sessions: SessionWithClass[]): Set<string> {
  const conflictIds = new Set<string>();
  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      const a = sessions[i], b = sessions[j];
      if (!a.entry.room || !b.entry.room) continue;
      if (a.entry.room !== b.entry.room) continue;
      if (a.entry.entry_date !== b.entry.entry_date) continue;
      if (!a.entry.start_time || !b.entry.start_time) continue;
      const aStart = parseTimeToMinutes(a.entry.start_time);
      const aEnd = parseTimeToMinutes(a.entry.end_time) || aStart + 60;
      const bStart = parseTimeToMinutes(b.entry.start_time);
      const bEnd = parseTimeToMinutes(b.entry.end_time) || bStart + 60;
      if (aStart < bEnd && bStart < aEnd) {
        conflictIds.add(a.entry.id);
        conflictIds.add(b.entry.id);
      }
    }
  }
  return conflictIds;
}

/* ═══ Session Card ═══ */
function AdminSessionCard({ s, conflicted, navigate }: {
  s: SessionWithClass;
  conflicted: boolean;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const isPrivate = s.cls?.class_type === "private";
  const progressPct = s.totalSessions > 0 ? Math.round((s.doneSessions / s.totalSessions) * 100) : 0;
  const isDone = s.entry.plan_status === "done";

  return (
    <SessionPopover
      session={s.entry}
      classInfo={{
        id: s.cls?.id,
        class_name: s.cls?.class_name || "—",
        class_type: s.cls?.class_type || "group",
        level: s.cls?.level,
        teacher_name: s.teacherName,
        room: s.entry.room,
        total_sessions: s.totalSessions,
        done_sessions: s.doneSessions,
      }}
      role="teacher"
    >
      <button
        className={cn(
          "w-full text-left rounded-xl border p-3 transition-colors hover:bg-muted/50 flex gap-3",
          isDone && "opacity-60",
          conflicted && "ring-2 ring-destructive",
        )}
      >
        <div className={cn("w-1 shrink-0 rounded-full self-stretch", isPrivate ? "bg-destructive" : "bg-emerald-500")} />
        <div className="shrink-0 w-14 flex flex-col items-start">
          <span className="font-display text-sm font-bold leading-tight">{fmtTime(s.entry.start_time)}</span>
          <span className="text-[10px] text-muted-foreground leading-tight">{fmtDuration(s.entry.start_time, s.entry.end_time) || "—"}</span>
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                {isPrivate ? <User className="h-3 w-3 text-destructive shrink-0" /> : <Users className="h-3 w-3 text-emerald-500 shrink-0" />}
                <span className="font-display font-bold text-sm truncate">{s.cls?.class_name || "—"}</span>
                {conflicted && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {s.cls?.level && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">{s.cls.level}</Badge>}
                {isPrivate && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-destructive/30 text-destructive">1-1</Badge>}
              </div>
            </div>
            {s.entry.room && <span className="text-[10px] bg-muted rounded px-1.5 py-0.5 shrink-0 text-muted-foreground">{s.entry.room}</span>}
          </div>
          {s.teacherName && <span className="text-[10px] text-muted-foreground">GV: {s.teacherName}</span>}
          {s.sessionNumber > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground shrink-0">Buổi {s.sessionNumber}/{s.totalSessions}</span>
              <Progress value={progressPct} className="h-1 w-16 shrink-0" />
            </div>
          )}
        </div>
      </button>
    </SessionPopover>
  );
}

/* ═══ Weekly Grid ═══ */
const GRID_START_HOUR = 7;
const GRID_END_HOUR = 21;
const HOUR_HEIGHT = 60;
const GRID_HOURS = Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) => GRID_START_HOUR + i);

function AdminWeeklyGrid({ sessions, weekDates, conflictIds, navigate }: {
  sessions: SessionWithClass[];
  weekDates: Date[];
  conflictIds: Set<string>;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const byDay = useMemo(() => {
    const map = new Map<number, SessionWithClass[]>();
    for (let i = 0; i < 7; i++) map.set(i, []);
    for (const s of sessions) {
      const d = new Date(s.entry.entry_date + "T00:00:00");
      const idx = weekDates.findIndex(wd => isSameDay(wd, d));
      if (idx >= 0) map.get(idx)!.push(s);
    }
    return map;
  }, [sessions, weekDates]);

  const totalHeight = (GRID_END_HOUR - GRID_START_HOUR) * HOUR_HEIGHT;

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[700px]" style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}>
        <div className="border-b border-border" />
        {weekDates.map((d, i) => (
          <div key={i} className={cn(
            "text-center py-2 border-b border-l border-border text-xs font-medium",
            isToday(d) && "bg-primary/5",
          )}>
            <span className="text-muted-foreground">{DAY_LABELS[d.getDay()]}</span>
            <br />
            <span className={cn("text-sm font-bold", isToday(d) && "text-primary")}>{format(d, "dd")}</span>
          </div>
        ))}
        <div className="relative" style={{ height: totalHeight }}>
          {GRID_HOURS.map(h => (
            <div key={h} className="absolute w-full text-right pr-2 text-[10px] text-muted-foreground" style={{ top: (h - GRID_START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}>
              {`${h}:00`}
            </div>
          ))}
        </div>
        {weekDates.map((d, dayIdx) => {
          const daySessions = byDay.get(dayIdx) || [];
          return (
            <div key={dayIdx} className={cn("relative border-l border-border", isToday(d) && "bg-primary/[0.02]")} style={{ height: totalHeight }}>
              {GRID_HOURS.map(h => (
                <div key={h} className="absolute w-full border-t border-border/40" style={{ top: (h - GRID_START_HOUR) * HOUR_HEIGHT }} />
              ))}
              {daySessions.map(s => {
                const startMin = parseTimeToMinutes(s.entry.start_time);
                const endMin = parseTimeToMinutes(s.entry.end_time);
                if (!s.entry.start_time) return null;
                const top = ((startMin / 60) - GRID_START_HOUR) * HOUR_HEIGHT;
                const height = Math.max(((endMin || startMin + 60) - startMin) / 60 * HOUR_HEIGHT, 30);
                const isPrivate = s.cls?.class_type === "private";
                const isConflict = conflictIds.has(s.entry.id);
                const initials = s.teacherName ? s.teacherName.split(" ").map((w: string) => w[0]).join("").slice(0, 2) : "";

                return (
                  <SessionPopover
                    key={s.entry.id}
                    session={s.entry}
                    classInfo={{
                      id: s.cls?.id,
                      class_name: s.cls?.class_name || "—",
                      class_type: s.cls?.class_type || "group",
                      level: s.cls?.level,
                      teacher_name: s.teacherName,
                      room: s.entry.room,
                      total_sessions: s.totalSessions,
                      done_sessions: s.doneSessions,
                    }}
                    role="teacher"
                  >
                    <button
                      className={cn(
                        "absolute left-1 right-1 rounded-md px-1.5 py-1 overflow-hidden text-left transition-opacity hover:opacity-80 border-l-[3px]",
                        isPrivate
                          ? "bg-destructive/10 border-destructive text-destructive dark:text-red-400"
                          : "bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-400",
                        s.entry.plan_status === "done" && "opacity-50",
                        isConflict && "ring-2 ring-destructive",
                      )}
                      style={{ top: Math.max(top, 0), height }}
                    >
                      <p className="text-[10px] font-medium truncate leading-tight">{s.cls?.class_name || "—"}</p>
                      <p className="text-[9px] opacity-70 truncate">
                        {initials && `(${initials}) `}{fmtTime(s.entry.start_time)}–{fmtTime(s.entry.end_time)}
                      </p>
                      {s.entry.room && <p className="text-[8px] opacity-60 truncate">{s.entry.room}</p>}
                    </button>
                  </SessionPopover>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══ Main Page ═══ */
export default function AdminSchedulePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("week");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [mobileWeekDay, setMobileWeekDay] = useState(() => new Date().getDay());

  // Filters
  const [filterTeacher, setFilterTeacher] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterProgram, setFilterProgram] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterRoom, setFilterRoom] = useState("all");

  // Date ranges
  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekEnd = weekDates[6];
  const monthStart = useMemo(() => startOfMonth(selectedDate), [selectedDate]);
  const monthEnd = useMemo(() => endOfMonth(selectedDate), [selectedDate]);

  const queryRange = useMemo(() => {
    if (viewMode === "day") {
      const d = format(selectedDate, "yyyy-MM-dd");
      return { start: d, end: d };
    }
    if (viewMode === "month") {
      return { start: format(monthStart, "yyyy-MM-dd"), end: format(monthEnd, "yyyy-MM-dd") };
    }
    return { start: format(weekStart, "yyyy-MM-dd"), end: format(weekEnd, "yyyy-MM-dd") };
  }, [viewMode, selectedDate, weekStart, weekEnd, monthStart, monthEnd]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-schedule", queryRange.start, queryRange.end],
    queryFn: () => fetchAllScheduleData(queryRange.start, queryRange.end),
    enabled: !!user,
    staleTime: 60_000,
  });

  const allSessions = data?.sessions || [];
  const allClasses = data?.classes || [];

  // Derive filter options from data
  const filterOptions = useMemo(() => {
    const teachers = new Set<string>();
    const levels = new Set<string>();
    const programs = new Set<string>();
    const rooms = new Set<string>();
    for (const s of allSessions) {
      if (s.teacherName) teachers.add(s.teacherName);
      if (s.cls?.level) levels.add(s.cls.level);
      if (s.cls?.program) programs.add(s.cls.program);
      if (s.entry.room) rooms.add(s.entry.room);
    }
    return {
      teachers: [...teachers].sort(),
      levels: [...levels].sort(),
      programs: [...programs].sort(),
      rooms: [...rooms].sort(),
    };
  }, [allSessions]);

  // Apply filters
  const filteredSessions = useMemo(() => {
    return allSessions.filter(s => {
      if (filterTeacher !== "all" && s.teacherName !== filterTeacher) return false;
      if (filterLevel !== "all" && s.cls?.level !== filterLevel) return false;
      if (filterProgram !== "all" && s.cls?.program !== filterProgram) return false;
      if (filterType !== "all") {
        if (filterType === "group" && s.cls?.class_type === "private") return false;
        if (filterType === "private" && s.cls?.class_type !== "private") return false;
      }
      if (filterRoom !== "all" && s.entry.room !== filterRoom) return false;
      return true;
    });
  }, [allSessions, filterTeacher, filterLevel, filterProgram, filterType, filterRoom]);

  // Conflicts (on all sessions, not filtered)
  const conflictIds = useMemo(() => detectConflicts(allSessions), [allSessions]);

  // Toast for conflicts
  useEffect(() => {
    if (conflictIds.size > 0) {
      const conflictSessions = allSessions.filter(s => conflictIds.has(s.entry.id));
      const seen = new Set<string>();
      for (const s of conflictSessions) {
        const key = `${s.entry.room}-${s.entry.entry_date}-${s.entry.start_time}`;
        if (!seen.has(key)) {
          seen.add(key);
          toast.warning(`Xung đột phòng: ${s.entry.room} lúc ${fmtTime(s.entry.start_time)}`, {
            id: key,
          });
        }
      }
    }
  }, [conflictIds, allSessions]);

  // Day view sessions
  const dayViewSessions = useMemo(() => {
    if (viewMode === "day") return filteredSessions;
    if (isMobile && viewMode === "week") {
      const targetDate = weekDates.find(d => d.getDay() === mobileWeekDay);
      if (!targetDate) return [];
      const ds = format(targetDate, "yyyy-MM-dd");
      return filteredSessions.filter(s => s.entry.entry_date === ds);
    }
    return filteredSessions;
  }, [filteredSessions, viewMode, isMobile, mobileWeekDay, weekDates]);

  // Month view: group by date
  const monthDays = useMemo(() => {
    if (viewMode !== "month") return [];
    const mStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const mEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: mStart, end: mEnd });
  }, [viewMode, monthStart, monthEnd]);

  const monthSessionsByDate = useMemo(() => {
    const map = new Map<string, SessionWithClass[]>();
    for (const s of filteredSessions) {
      const d = s.entry.entry_date;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(s);
    }
    return map;
  }, [filteredSessions]);

  // Nav
  const goPrev = () => {
    if (viewMode === "day") setSelectedDate(prev => subDays(prev, 1));
    else if (viewMode === "week") setSelectedDate(prev => addDays(prev, -7));
    else setSelectedDate(prev => subMonths(prev, 1));
  };
  const goNext = () => {
    if (viewMode === "day") setSelectedDate(prev => addDays(prev, 1));
    else if (viewMode === "week") setSelectedDate(prev => addDays(prev, 7));
    else setSelectedDate(prev => addMonths(prev, 1));
  };

  const activeFilterCount = [filterTeacher, filterLevel, filterProgram, filterType, filterRoom].filter(f => f !== "all").length;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-xl font-bold tracking-tight flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          Lịch học
        </h1>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex rounded-lg border bg-muted p-0.5 gap-0.5">
            {(["day", "week", "month"] as const).map(v => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors",
                  viewMode === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v === "day" ? "Ngày" : v === "week" ? "Tuần" : "Tháng"}
              </button>
            ))}
          </div>

          {/* Date navigation */}
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goPrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {viewMode === "week"
                    ? `${format(weekStart, "dd/MM")} – ${format(weekEnd, "dd/MM")}`
                    : viewMode === "month"
                    ? format(selectedDate, "MMMM yyyy", { locale: vi })
                    : isToday(selectedDate) ? "Hôm nay" : format(selectedDate, "dd/MM", { locale: vi })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => { if (d) { setSelectedDate(d); setCalendarOpen(false); } }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filterTeacher} onValueChange={setFilterTeacher}>
          <SelectTrigger className="h-8 w-auto min-w-[120px] text-xs">
            <SelectValue placeholder="Giáo viên" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả GV</SelectItem>
            {filterOptions.teachers.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterLevel} onValueChange={setFilterLevel}>
          <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả Level</SelectItem>
            {filterOptions.levels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterProgram} onValueChange={setFilterProgram}>
          <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs">
            <SelectValue placeholder="Chương trình" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả CT</SelectItem>
            {filterOptions.programs.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-8 w-auto min-w-[80px] text-xs">
            <SelectValue placeholder="Loại" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="group">Nhóm</SelectItem>
            <SelectItem value="private">1-1</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterRoom} onValueChange={setFilterRoom}>
          <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs">
            <SelectValue placeholder="Phòng" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả phòng</SelectItem>
            {filterOptions.rooms.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>

        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => {
            setFilterTeacher("all");
            setFilterLevel("all");
            setFilterProgram("all");
            setFilterType("all");
            setFilterRoom("all");
          }}>
            Xóa bộ lọc ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* Stats */}
      {!isLoading && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{filteredSessions.length} buổi học</span>
          {conflictIds.size > 0 && (
            <span className="flex items-center gap-1 text-destructive font-medium">
              <AlertTriangle className="h-3 w-3" />
              {Math.floor(conflictIds.size / 2)} xung đột
            </span>
          )}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Day label */}
      {!isLoading && viewMode === "day" && (
        <p className="text-xs text-muted-foreground">
          {DAY_LABELS[selectedDate.getDay()]}, {format(selectedDate, "dd/MM/yyyy")}
          {isToday(selectedDate) && <span className="ml-1.5 text-primary font-medium">· Hôm nay</span>}
        </p>
      )}

      {/* ─── DAY VIEW ─── */}
      {!isLoading && viewMode === "day" && (
        filteredSessions.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <span className="text-3xl"></span>
            <p className="text-sm text-muted-foreground">Không có buổi học</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSessions.map(s => (
              <AdminSessionCard key={s.entry.id} s={s} conflicted={conflictIds.has(s.entry.id)} navigate={navigate} />
            ))}
          </div>
        )
      )}

      {/* ─── WEEK VIEW ─── */}
      {!isLoading && viewMode === "week" && (
        <>
          {!isMobile && (
            <AdminWeeklyGrid sessions={filteredSessions} weekDates={weekDates} conflictIds={conflictIds} navigate={navigate} />
          )}
          {isMobile && (
            <div className="space-y-3">
              <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
                {weekDates.map((d, i) => {
                  const dayNum = d.getDay();
                  const count = filteredSessions.filter(s => s.entry.entry_date === format(d, "yyyy-MM-dd")).length;
                  const isSelected = mobileWeekDay === dayNum;
                  return (
                    <button
                      key={i}
                      onClick={() => setMobileWeekDay(dayNum)}
                      className={cn(
                        "flex flex-col items-center px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors min-w-[44px]",
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted",
                        isToday(d) && !isSelected && "ring-1 ring-primary/40",
                      )}
                    >
                      <span className="text-[10px]">{DAY_LABELS[dayNum]}</span>
                      <span className="font-bold">{format(d, "dd")}</span>
                      {count > 0 && <span className={cn("w-1.5 h-1.5 rounded-full mt-0.5", isSelected ? "bg-primary-foreground" : "bg-primary")} />}
                    </button>
                  );
                })}
              </div>
              {dayViewSessions.length === 0 ? (
                <div className="text-center py-6 space-y-1">
                  <span className="text-2xl"></span>
                  <p className="text-xs text-muted-foreground">Không có buổi học</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dayViewSessions.map(s => (
                    <AdminSessionCard key={s.entry.id} s={s} conflicted={conflictIds.has(s.entry.id)} navigate={navigate} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ─── MONTH VIEW ─── */}
      {!isLoading && viewMode === "month" && (
        <div className="overflow-x-auto">
          <div className="grid grid-cols-7 min-w-[600px]">
            {/* Header */}
            {WEEK_DAYS_ORDER.map(d => (
              <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1 border-b">
                {DAY_LABELS[d]}
              </div>
            ))}
            {/* Days */}
            {monthDays.map((d, i) => {
              const ds = format(d, "yyyy-MM-dd");
              const daySessions = monthSessionsByDate.get(ds) || [];
              const isCurrentMonth = d.getMonth() === selectedDate.getMonth();
              const hasConflict = daySessions.some(s => conflictIds.has(s.entry.id));
              return (
                <button
                  key={i}
                  onClick={() => { setSelectedDate(d); setViewMode("day"); }}
                  className={cn(
                    "border-b border-r p-1 min-h-[72px] text-left hover:bg-muted/50 transition-colors",
                    !isCurrentMonth && "opacity-30",
                    isToday(d) && "bg-primary/5",
                    hasConflict && "ring-1 ring-inset ring-destructive/40",
                  )}
                >
                  <span className={cn(
                    "text-[11px] font-medium",
                    isToday(d) && "text-primary font-bold",
                  )}>{format(d, "d")}</span>
                  <div className="space-y-0.5 mt-0.5">
                    {daySessions.slice(0, 3).map(s => {
                      const isPrivate = s.cls?.class_type === "private";
                      return (
                        <div
                          key={s.entry.id}
                          className={cn(
                            "text-[8px] leading-tight truncate rounded px-1 py-0.5",
                            isPrivate ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                          )}
                        >
                          {fmtTime(s.entry.start_time)} {s.cls?.class_name?.slice(0, 10) || "—"}
                        </div>
                      );
                    })}
                    {daySessions.length > 3 && (
                      <span className="text-[8px] text-muted-foreground">+{daySessions.length - 3} thêm</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
