import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format, addDays, subDays, isToday, startOfWeek, endOfWeek, isSameDay, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval } from "date-fns";
import { vi } from "date-fns/locale";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FilePlus2,
  Filter,
  Layers,
  Loader2,
  Search,
  Sparkles,
  User,
  Users,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import { usePrograms } from "@shared/hooks/usePrograms";
import { cn } from "@shared/lib/utils";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@shared/components/ui/popover";
import { Calendar } from "@shared/components/ui/calendar";
import { Progress } from "@shared/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { useIsMobile } from "@shared/hooks/use-mobile";
import { toast } from "sonner";
import SessionPopover from "@shared/components/schedule/SessionPopover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Input } from "@shared/components/ui/input";
import { Textarea } from "@shared/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@shared/components/ui/table";
import ScheduleSetupNotice from "@admin/features/schedule/components/ScheduleSetupNotice";
import { useTeacherAvailability } from "@shared/hooks/useTeacherAvailability";
import type { CandidateMatchResult, TeacherAvailabilityDraft, TeacherAvailabilityException, TeacherAvailabilityRule } from "@shared/types/availability";
import {
  describeException,
  describeRule,
  getTeacherWorkload,
  matchTeachersForClassOpening,
  normalizeExceptions,
  normalizeRules,
  relationMissing,
  timeToMinutes,
  validateAvailabilityDraft,
} from "@shared/utils/availability";

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
const GRID_START_HOUR = 7;
const GRID_END_HOUR = 21;
const HOUR_HEIGHT = 60;
const GRID_HOURS = Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) => GRID_START_HOUR + i);

function fmtTime(t: string | null) {
  if (!t) return "—:—";
  return t.slice(0, 5);
}

function fmtDuration(start: string | null, end: string | null) {
  if (!start || !end) return "";
  const mins = timeToMinutes(end) - timeToMinutes(start);
  if (mins <= 0) return "";
  if (mins >= 60 && mins % 60 === 0) return `${mins / 60} giờ`;
  if (mins >= 60) return `${Math.floor(mins / 60)}h${mins % 60}`;
  return `${mins} phút`;
}

async function fetchAllScheduleData(startDate: string, endDate: string) {
  const { data: classes } = await (supabase as any)
    .from("classes")
    .select("id, class_name, class_type, level, program, room, default_start_time, default_end_time, study_plan_id, teacher_id")
    .eq("status", "active");

  if (!classes || classes.length === 0) return { sessions: [], classes: [] };

  const teacherIds = [...new Set(classes.map((c) => c.teacher_id).filter(Boolean))];
  const teacherMap = new Map<string, string>();
  if (teacherIds.length > 0) {
    const { data: teachers } = await supabase.from("teachers").select("id, full_name").in("id", teacherIds);
    for (const t of teachers || []) teacherMap.set(t.id, t.full_name || "—");
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
      entry,
      cls,
      sessionNumber: entry.session_number || 0,
      totalSessions: stats.total,
      doneSessions: stats.done,
      teacherName: cls?.teacher_id ? teacherMap.get(cls.teacher_id) : undefined,
    };
  });

  sessions.sort((a, b) => (a.entry.start_time || "99:99").localeCompare(b.entry.start_time || "99:99"));
  return { sessions, classes };
}

function detectConflicts(sessions: SessionWithClass[]): Set<string> {
  const conflictIds = new Set<string>();
  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      const a = sessions[i];
      const b = sessions[j];
      if (!a.entry.room || !b.entry.room || a.entry.room !== b.entry.room) continue;
      if (a.entry.entry_date !== b.entry.entry_date || !a.entry.start_time || !b.entry.start_time) continue;
      const aStart = timeToMinutes(a.entry.start_time);
      const aEnd = timeToMinutes(a.entry.end_time) || aStart + 60;
      const bStart = timeToMinutes(b.entry.start_time);
      const bEnd = timeToMinutes(b.entry.end_time) || bStart + 60;
      if (aStart < bEnd && bStart < aEnd) {
        conflictIds.add(a.entry.id);
        conflictIds.add(b.entry.id);
      }
    }
  }
  return conflictIds;
}

function AdminSessionCard({ s, conflicted }: { s: SessionWithClass; conflicted: boolean }) {
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

function TeacherAvailabilityStateNotice({ message }: { message?: string }) {
  return <ScheduleSetupNotice title="Module lịch rảnh chưa thể tải dữ liệu" message={message || "Không đọc được dữ liệu availability từ DB dùng chung."} />;
}

function AdminWeeklyGrid({ sessions, weekDates, conflictIds }: { sessions: SessionWithClass[]; weekDates: Date[]; conflictIds: Set<string> }) {
  const byDay = useMemo(() => {
    const map = new Map<number, SessionWithClass[]>();
    for (let i = 0; i < 7; i++) map.set(i, []);
    for (const s of sessions) {
      const d = new Date(s.entry.entry_date + "T00:00:00");
      const idx = weekDates.findIndex((wd) => isSameDay(wd, d));
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
          <div key={i} className={cn("text-center py-2 border-b border-l border-border text-xs font-medium", isToday(d) && "bg-primary/5")}>
            <span className="text-muted-foreground">{DAY_LABELS[d.getDay()]}</span>
            <br />
            <span className={cn("text-sm font-bold", isToday(d) && "text-primary")}>{format(d, "dd")}</span>
          </div>
        ))}
        <div className="relative" style={{ height: totalHeight }}>
          {GRID_HOURS.map((h) => (
            <div key={h} className="absolute w-full text-right pr-2 text-[10px] text-muted-foreground" style={{ top: (h - GRID_START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}>
              {`${h}:00`}
            </div>
          ))}
        </div>
        {weekDates.map((d, dayIdx) => {
          const daySessions = byDay.get(dayIdx) || [];
          return (
            <div key={dayIdx} className={cn("relative border-l border-border", isToday(d) && "bg-primary/[0.02]")} style={{ height: totalHeight }}>
              {GRID_HOURS.map((h) => (
                <div key={h} className="absolute w-full border-t border-border/40" style={{ top: (h - GRID_START_HOUR) * HOUR_HEIGHT }} />
              ))}
              {daySessions.map((s) => {
                const startMin = timeToMinutes(s.entry.start_time);
                const endMin = timeToMinutes(s.entry.end_time);
                if (!s.entry.start_time) return null;
                const top = ((startMin / 60) - GRID_START_HOUR) * HOUR_HEIGHT;
                const height = Math.max((((endMin || startMin + 60) - startMin) / 60) * HOUR_HEIGHT, 30);
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
                        isPrivate ? "bg-destructive/10 border-destructive text-destructive dark:text-red-400" : "bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-400",
                        s.entry.plan_status === "done" && "opacity-50",
                        isConflict && "ring-2 ring-destructive",
                      )}
                      style={{ top: Math.max(top, 0), height }}
                    >
                      <p className="text-[10px] font-medium truncate leading-tight">{s.cls?.class_name || "—"}</p>
                      <p className="text-[9px] opacity-70 truncate">{initials && `(${initials}) `}{fmtTime(s.entry.start_time)}–{fmtTime(s.entry.end_time)}</p>
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

function ScheduleCalendarTab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("week");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [mobileWeekDay, setMobileWeekDay] = useState(() => new Date().getDay());
  const [filterTeacher, setFilterTeacher] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterProgram, setFilterProgram] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterRoom, setFilterRoom] = useState("all");

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
    if (viewMode === "month") return { start: format(monthStart, "yyyy-MM-dd"), end: format(monthEnd, "yyyy-MM-dd") };
    return { start: format(weekStart, "yyyy-MM-dd"), end: format(weekEnd, "yyyy-MM-dd") };
  }, [viewMode, selectedDate, monthStart, monthEnd, weekStart, weekEnd]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-schedule", queryRange.start, queryRange.end],
    queryFn: () => fetchAllScheduleData(queryRange.start, queryRange.end),
    enabled: !!user,
    staleTime: 60_000,
  });

  const allSessions = data?.sessions || [];
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

  const filteredSessions = useMemo(() => allSessions.filter((s) => {
    if (filterTeacher !== "all" && s.teacherName !== filterTeacher) return false;
    if (filterLevel !== "all" && s.cls?.level !== filterLevel) return false;
    if (filterProgram !== "all" && s.cls?.program !== filterProgram) return false;
    if (filterType === "group" && s.cls?.class_type === "private") return false;
    if (filterType === "private" && s.cls?.class_type !== "private") return false;
    if (filterRoom !== "all" && s.entry.room !== filterRoom) return false;
    return true;
  }), [allSessions, filterTeacher, filterLevel, filterProgram, filterType, filterRoom]);

  const conflictIds = useMemo(() => detectConflicts(allSessions), [allSessions]);

  useEffect(() => {
    if (conflictIds.size === 0) return;
    const conflictSessions = allSessions.filter((s) => conflictIds.has(s.entry.id));
    const seen = new Set<string>();
    for (const s of conflictSessions) {
      const key = `${s.entry.room}-${s.entry.entry_date}-${s.entry.start_time}`;
      if (seen.has(key)) continue;
      seen.add(key);
      toast.warning(`Xung đột phòng: ${s.entry.room} lúc ${fmtTime(s.entry.start_time)}`, { id: key });
    }
  }, [conflictIds, allSessions]);

  const dayViewSessions = useMemo(() => {
    if (viewMode === "day") return filteredSessions;
    if (isMobile && viewMode === "week") {
      const targetDate = weekDates.find((d) => d.getDay() === mobileWeekDay);
      if (!targetDate) return [];
      const ds = format(targetDate, "yyyy-MM-dd");
      return filteredSessions.filter((s) => s.entry.entry_date === ds);
    }
    return filteredSessions;
  }, [filteredSessions, isMobile, mobileWeekDay, viewMode, weekDates]);

  const monthDays = useMemo(() => {
    if (viewMode !== "month") return [];
    const mStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const mEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: mStart, end: mEnd });
  }, [monthEnd, monthStart, viewMode]);

  const monthSessionsByDate = useMemo(() => {
    const map = new Map<string, SessionWithClass[]>();
    for (const s of filteredSessions) {
      const d = s.entry.entry_date;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(s);
    }
    return map;
  }, [filteredSessions]);

  const goPrev = () => {
    if (viewMode === "day") setSelectedDate((prev) => subDays(prev, 1));
    else if (viewMode === "week") setSelectedDate((prev) => addDays(prev, -7));
    else setSelectedDate((prev) => subMonths(prev, 1));
  };

  const goNext = () => {
    if (viewMode === "day") setSelectedDate((prev) => addDays(prev, 1));
    else if (viewMode === "week") setSelectedDate((prev) => addDays(prev, 7));
    else setSelectedDate((prev) => addMonths(prev, 1));
  };

  const activeFilterCount = [filterTeacher, filterLevel, filterProgram, filterType, filterRoom].filter((f) => f !== "all").length;

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-muted/30 to-transparent p-4 md:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-background border border-border/60 flex items-center justify-center shadow-sm shrink-0">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-base md:text-lg font-bold tracking-tight">Lịch học hiện tại</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Theo dõi tất cả buổi dạy, phát hiện xung đột phòng theo thời gian thực</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-xl border border-border/60 bg-background p-0.5 gap-0.5">
              {(["day", "week", "month"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                    viewMode === v
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  {v === "day" ? "Ngày" : v === "week" ? "Tuần" : "Tháng"}
                </button>
              ))}
            </div>

            <div className="flex items-center rounded-xl border border-border/60 bg-background overflow-hidden">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none hover:bg-muted/50" onClick={goPrev}><ChevronLeft className="h-4 w-4" /></Button>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <button className="h-8 px-3 text-xs font-medium tabular-nums hover:bg-muted/50 transition-colors flex items-center gap-1.5 border-x border-border/60">
                    <CalendarDays className="h-3.5 w-3.5 opacity-70" />
                    {viewMode === "week"
                      ? `${format(weekStart, "dd/MM")} – ${format(weekEnd, "dd/MM")}`
                      : viewMode === "month"
                      ? format(selectedDate, "MMMM yyyy", { locale: vi })
                      : isToday(selectedDate)
                      ? "Hôm nay"
                      : format(selectedDate, "dd/MM", { locale: vi })}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar mode="single" selected={selectedDate} onSelect={(d) => { if (d) { setSelectedDate(d); setCalendarOpen(false); } }} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none hover:bg-muted/50" onClick={goNext}><ChevronRight className="h-4 w-4" /></Button>
            </div>

            {!isToday(selectedDate) && (
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setSelectedDate(new Date())}>
                Hôm nay
              </Button>
            )}
          </div>
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-border/40">
          <Filter className="h-3.5 w-3.5 text-muted-foreground/60 ml-1" />
          <Select value={filterTeacher} onValueChange={setFilterTeacher}>
            <SelectTrigger className="h-8 w-auto min-w-[140px] text-xs rounded-lg border-border/60 bg-background"><SelectValue placeholder="Giáo viên" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Tất cả GV</SelectItem>{filterOptions.teachers.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterLevel} onValueChange={setFilterLevel}>
            <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs rounded-lg border-border/60 bg-background"><SelectValue placeholder="Level" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Tất cả Level</SelectItem>{filterOptions.levels.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterProgram} onValueChange={setFilterProgram}>
            <SelectTrigger className="h-8 w-auto min-w-[120px] text-xs rounded-lg border-border/60 bg-background"><SelectValue placeholder="Chương trình" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Tất cả CT</SelectItem>{filterOptions.programs.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 w-auto min-w-[90px] text-xs rounded-lg border-border/60 bg-background"><SelectValue placeholder="Loại" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="group">Nhóm</SelectItem>
              <SelectItem value="private">1-1</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterRoom} onValueChange={setFilterRoom}>
            <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs rounded-lg border-border/60 bg-background"><SelectValue placeholder="Phòng" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Tất cả phòng</SelectItem>{filterOptions.rooms.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => { setFilterTeacher("all"); setFilterLevel("all"); setFilterProgram("all"); setFilterType("all"); setFilterRoom("all"); }}>
              <XCircle className="h-3 w-3" />Xóa ({activeFilterCount})
            </Button>
          )}

          <div className="ml-auto flex items-center gap-3 text-xs">
            {!isLoading && (
              <>
                <span className="text-muted-foreground tabular-nums"><span className="font-semibold text-foreground">{filteredSessions.length}</span> buổi</span>
                {conflictIds.size > 0 && (
                  <span className="flex items-center gap-1.5 text-destructive font-semibold px-2 py-0.5 rounded-full bg-destructive/10 border border-destructive/20">
                    <AlertTriangle className="h-3 w-3" />{Math.floor(conflictIds.size / 2)} xung đột
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {isLoading && <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}

      {!isLoading && viewMode === "day" && (
        filteredSessions.length === 0 ? <div className="text-center py-8 text-sm text-muted-foreground">Không có buổi học</div> : <div className="space-y-2">{filteredSessions.map((s) => <AdminSessionCard key={s.entry.id} s={s} conflicted={conflictIds.has(s.entry.id)} />)}</div>
      )}

      {!isLoading && viewMode === "week" && (
        !isMobile ? <AdminWeeklyGrid sessions={filteredSessions} weekDates={weekDates} conflictIds={conflictIds} /> : (
          <div className="space-y-3">
            <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
              {weekDates.map((d, i) => {
                const dayNum = d.getDay();
                const count = filteredSessions.filter((s) => s.entry.entry_date === format(d, "yyyy-MM-dd")).length;
                const isSelected = mobileWeekDay === dayNum;
                return (
                  <button key={i} onClick={() => setMobileWeekDay(dayNum)} className={cn("flex flex-col items-center px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors min-w-[44px]", isSelected ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted", isToday(d) && !isSelected && "ring-1 ring-primary/40")}>
                    <span className="text-[10px]">{DAY_LABELS[dayNum]}</span>
                    <span className="font-bold">{format(d, "dd")}</span>
                    {count > 0 && <span className={cn("w-1.5 h-1.5 rounded-full mt-0.5", isSelected ? "bg-primary-foreground" : "bg-primary")} />}
                  </button>
                );
              })}
            </div>
            {dayViewSessions.length === 0 ? <div className="text-center py-6 text-xs text-muted-foreground">Không có buổi học</div> : <div className="space-y-2">{dayViewSessions.map((s) => <AdminSessionCard key={s.entry.id} s={s} conflicted={conflictIds.has(s.entry.id)} />)}</div>}
          </div>
        )
      )}

      {!isLoading && viewMode === "month" && (
        <div className="overflow-x-auto">
          <div className="grid grid-cols-7 min-w-[600px]">
            {WEEK_DAYS_ORDER.map((d) => <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1 border-b">{DAY_LABELS[d]}</div>)}
            {monthDays.map((d, i) => {
              const ds = format(d, "yyyy-MM-dd");
              const daySessions = monthSessionsByDate.get(ds) || [];
              const isCurrentMonth = d.getMonth() === selectedDate.getMonth();
              const hasConflict = daySessions.some((s) => conflictIds.has(s.entry.id));
              return (
                <button key={i} onClick={() => { setSelectedDate(d); setViewMode("day"); }} className={cn("border-b border-r p-1 min-h-[72px] text-left hover:bg-muted/50 transition-colors", !isCurrentMonth && "opacity-30", isToday(d) && "bg-primary/5", hasConflict && "ring-1 ring-inset ring-destructive/40")}>
                  <span className={cn("text-[11px] font-medium", isToday(d) && "text-primary font-bold")}>{format(d, "d")}</span>
                  <div className="space-y-0.5 mt-0.5">
                    {daySessions.slice(0, 3).map((s) => {
                      const isPrivate = s.cls?.class_type === "private";
                      return <div key={s.entry.id} className={cn("text-[8px] leading-tight truncate rounded px-1 py-0.5", isPrivate ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400")}>{fmtTime(s.entry.start_time)} {s.cls?.class_name?.slice(0, 10) || "—"}</div>;
                    })}
                    {daySessions.length > 3 && <span className="text-[8px] text-muted-foreground">+{daySessions.length - 3} thêm</span>}
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

export function AvailabilityDraftsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useTeacherAvailability();
  const [teacherFilter, setTeacherFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});
  const [actingId, setActingId] = useState<string | null>(null);

  const drafts = data?.drafts || [];
  const teachers = data?.teachers || [];
  const classes = data?.classes || [];
  const classSessions = data?.classSessions || [];
  const teacherMap = useMemo(() => new Map(teachers.map((t) => [t.id, t])), [teachers]);

  const filteredDrafts = useMemo(() => drafts.filter((draft) => {
    if (teacherFilter !== "all" && draft.teacher_id !== teacherFilter) return false;
    if (statusFilter !== "all" && draft.status !== statusFilter) return false;
    return true;
  }), [drafts, statusFilter, teacherFilter]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["teacher-availability-admin"] });
  };

  const updateDraftStatus = async (draftId: string, status: string) => {
    setActingId(draftId);
    const note = reviewNote[draftId]?.trim() || null;
    const { error } = await (supabase.from as any)("teacher_availability_drafts")
      .update({ status, review_note: note, reviewed_at: new Date().toISOString(), reviewed_by: user?.id || null, updated_at: new Date().toISOString() })
      .eq("id", draftId);
    setActingId(null);
    if (error) {
      toast.error(`Không thể cập nhật draft: ${error.message}`);
      return;
    }
    toast.success(
      status === "needs_changes"
        ? "Đã yêu cầu giáo viên chỉnh sửa"
        : status === "rejected"
          ? "Đã từ chối draft"
          : status === "approved"
            ? "Đã duyệt draft"
            : "Đã cập nhật trạng thái",
    );
    refresh();
  };

  const approveAndApply = async (draft: TeacherAvailabilityDraft) => {
    setActingId(draft.id);
    const rules = normalizeRules(draft.availability_rules, draft.teacher_id);
    const exceptions = normalizeExceptions(draft.availability_exceptions, draft.teacher_id);
    const validation = validateAvailabilityDraft(draft, classes, classSessions);
    if (!validation.can_apply) {
      toast.error("Draft chưa đủ điều kiện apply: cần cách hiện tại ít nhất 2 tuần và không conflict lịch lớp.");
      setActingId(null);
      return;
    }

    const rulesTable = (supabase.from as any)("teacher_availability_rules");
    const exceptionsTable = (supabase.from as any)("teacher_availability_exceptions");
    const draftsTable = (supabase.from as any)("teacher_availability_drafts");

    const { error: deleteRulesError } = await rulesTable.delete().eq("teacher_id", draft.teacher_id).eq("effective_from", draft.effective_from);
    if (deleteRulesError && !relationMissing(deleteRulesError)) {
      toast.error(deleteRulesError.message);
      setActingId(null);
      return;
    }

    const exceptionDates = exceptions.map((item) => item.exception_date);
    if (exceptionDates.length > 0) {
      const { error: deleteExceptionsError } = await exceptionsTable.delete().eq("teacher_id", draft.teacher_id).in("exception_date", exceptionDates);
      if (deleteExceptionsError && !relationMissing(deleteExceptionsError)) {
        toast.error(deleteExceptionsError.message);
        setActingId(null);
        return;
      }
    }

    if (rules.length > 0) {
      const { error: insertRulesError } = await rulesTable.insert(rules.map((rule) => ({ ...rule, updated_at: new Date().toISOString() })));
      if (insertRulesError) {
        toast.error(insertRulesError.message);
        setActingId(null);
        return;
      }
    }
    if (exceptions.length > 0) {
      const { error: insertExceptionsError } = await exceptionsTable.insert(exceptions.map((item) => ({ ...item, updated_at: new Date().toISOString() })));
      if (insertExceptionsError) {
        toast.error(insertExceptionsError.message);
        setActingId(null);
        return;
      }
    }

    const { error: updateDraftError } = await draftsTable
      .update({
        status: "applied",
        review_note: reviewNote[draft.id]?.trim() || null,
        validation_summary: validation,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", draft.id);

    setActingId(null);
    if (updateDraftError) {
      toast.error(updateDraftError.message);
      return;
    }
    toast.success("Đã duyệt và apply lịch rảnh vào DB gốc");
    refresh();
  };

  if (data?.setupMissing) {
    return <ScheduleSetupNotice title="Module lịch rảnh đang chờ DB schema" message={data.setupMessage} />;
  }

  if (data?.setupState === "unavailable") {
    return <TeacherAvailabilityStateNotice message={data.setupMessage} />;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-muted/30 to-transparent p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-background border border-border/60 flex items-center justify-center shadow-sm shrink-0">
              <Clock3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-base md:text-lg font-bold tracking-tight">Duyệt đăng ký lịch rảnh</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Cần ≥ 14 ngày lead time và không xung đột với lớp đang dạy</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={teacherFilter} onValueChange={setTeacherFilter}>
              <SelectTrigger className="h-9 min-w-[160px] text-xs rounded-lg border-border/60 bg-background"><SelectValue placeholder="Giáo viên" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Tất cả giáo viên</SelectItem>{teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 min-w-[150px] text-xs rounded-lg border-border/60 bg-background"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="pending">Chờ duyệt</SelectItem>
                <SelectItem value="needs_changes">Cần sửa</SelectItem>
                <SelectItem value="rejected">Từ chối</SelectItem>
                <SelectItem value="applied">Đã áp dụng</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isLoading ? <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : filteredDrafts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 py-16 text-center text-muted-foreground flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-muted/40 flex items-center justify-center">
            <Clock3 className="h-5 w-5 opacity-50" />
          </div>
          <p className="text-sm font-medium text-foreground">Chưa có draft nào</p>
          <p className="text-xs">Không có đăng ký lịch rảnh khớp với bộ lọc hiện tại</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDrafts.map((draft) => {
            const teacher = teacherMap.get(draft.teacher_id);
            const validation = validateAvailabilityDraft(draft, classes, classSessions);
            const rules = normalizeRules(draft.availability_rules, draft.teacher_id);
            const exceptions = normalizeExceptions(draft.availability_exceptions, draft.teacher_id);
            const isBusy = actingId === draft.id;

            return (
              <Card key={draft.id} className="overflow-hidden border-border/60 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-4 bg-gradient-to-b from-muted/20 to-transparent border-b border-border/40">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base tracking-tight truncate">{teacher?.full_name || draft.teacher_id}</CardTitle>
                        <Badge variant={draft.status === "applied" ? "default" : "secondary"} className="text-[10px] uppercase tracking-wide">
                          {draft.status === "pending" && "Chờ duyệt"}
                          {draft.status === "needs_changes" && "Cần sửa"}
                          {draft.status === "approved" && "Đã duyệt"}
                          {draft.status === "applied" && "Đã áp dụng"}
                          {draft.status === "rejected" && "Từ chối"}
                          {!["pending", "needs_changes", "approved", "applied", "rejected"].includes(draft.status) && draft.status}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">
                        Hiệu lực từ <span className="font-semibold text-foreground tabular-nums">{draft.effective_from}</span>
                        {" · "}
                        {draft.status === "approved"
                          ? "Đã được duyệt, sẵn sàng apply"
                          : validation.can_apply
                            ? "Đủ điều kiện apply ngay"
                            : "Chưa đủ điều kiện apply"}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium border",
                        validation.lead_time_ok
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/25"
                          : "bg-orange-50 text-orange-700 border-orange-200/70 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/25",
                      )}>
                        {validation.lead_time_ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                        Lead time {validation.lead_time_days}d
                      </span>
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium border",
                        validation.conflict_count === 0
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/25"
                          : "bg-rose-50 text-rose-700 border-rose-200/70 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/25",
                      )}>
                        {validation.conflict_count === 0 ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {validation.conflict_count} xung đột
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-5">
                  <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Layers className="h-3 w-3" />Slot định kỳ
                          <span className="text-muted-foreground/60 normal-case font-normal">({rules.length})</span>
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {rules.length === 0
                            ? <span className="text-xs text-muted-foreground italic">Không có slot recurring</span>
                            : rules.map((rule, idx) => <Badge key={`${draft.id}-rule-${idx}`} variant="outline" className="text-[11px] font-normal bg-muted/40 border-border/50">{describeRule(rule)}</Badge>)}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                          <CalendarDays className="h-3 w-3" />Ngoại lệ
                          <span className="text-muted-foreground/60 normal-case font-normal">({exceptions.length})</span>
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {exceptions.length === 0
                            ? <span className="text-xs text-muted-foreground italic">Không có ngoại lệ</span>
                            : exceptions.map((item, idx) => <Badge key={`${draft.id}-exception-${idx}`} variant="outline" className="text-[11px] font-normal bg-muted/40 border-border/50">{describeException(item)}</Badge>)}
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-muted/20 p-3.5 space-y-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tóm tắt kiểm tra</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          {validation.lead_time_ok
                            ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            : <XCircle className="h-4 w-4 text-destructive" />}
                          <span>Lead time ≥ 2 tuần</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {validation.conflict_count === 0
                            ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            : <XCircle className="h-4 w-4 text-destructive" />}
                          <span>Không xung đột lớp đang dạy</span>
                        </div>
                      </div>
                      {validation.conflicts.length > 0 && (
                        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-2.5 text-xs space-y-1 max-h-36 overflow-auto">
                          {validation.conflicts.map((conflict, idx) => (
                            <p key={`${draft.id}-conflict-${idx}`} className="flex items-center gap-1.5 text-muted-foreground">
                              <span className="h-1 w-1 rounded-full bg-destructive/70 shrink-0" />
                              <span className="font-medium text-foreground">{conflict.class_name}</span>
                              <span className="opacity-50">·</span>
                              <span className="tabular-nums">{conflict.date || DAY_LABELS[conflict.weekday ?? 0]} {fmtTime(conflict.start_time)}–{fmtTime(conflict.end_time)}</span>
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <Textarea
                    placeholder="Ghi chú review cho giáo viên..."
                    value={reviewNote[draft.id] || draft.review_note || ""}
                    onChange={(e) => setReviewNote((prev) => ({ ...prev, [draft.id]: e.target.value }))}
                    className="min-h-[80px] rounded-xl border-border/60 bg-card resize-none"
                  />

                  <div className="flex flex-wrap gap-2 justify-end pt-1">
                    <Button variant="outline" size="sm" disabled={isBusy} className="border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300 dark:border-orange-500/30 dark:text-orange-300 dark:hover:bg-orange-500/10" onClick={() => updateDraftStatus(draft.id, "needs_changes")}>Yêu cầu sửa</Button>
                    <Button variant="outline" size="sm" disabled={isBusy} className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10" onClick={() => updateDraftStatus(draft.id, "rejected")}>Từ chối</Button>
                    <Button variant="outline" size="sm" disabled={isBusy} onClick={() => updateDraftStatus(draft.id, "approved")}>Duyệt</Button>
                    <Button size="sm" disabled={isBusy || !validation.can_apply} onClick={() => approveAndApply(draft)} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 gap-1.5">
                      {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Duyệt & Áp dụng
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ClassOpeningTab() {
  const { user } = useAuth();
  const { programs } = usePrograms();
  const queryClient = useQueryClient();
  const { data, isLoading } = useTeacherAvailability();
  const [className, setClassName] = useState("");
  const [targetDate, setTargetDate] = useState(() => format(addDays(new Date(), 14), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("19:00");
  const [endTime, setEndTime] = useState("20:30");
  const [level, setLevel] = useState("all");
  const [program, setProgram] = useState("all");
  const [mode, setMode] = useState<"online" | "offline" | "hybrid">("hybrid");
  const [room, setRoom] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);

  const teachers = data?.teachers || [];
  const classes = data?.classes || [];
  const rules = data?.rules || [];
  const exceptions = data?.exceptions || [];
  const capabilities = data?.capabilities || [];
  const classSessions = data?.classSessions || [];

  const levelOptions = useMemo(() => [...new Set(classes.map((cls) => cls.level).filter(Boolean))].sort(), [classes]);
  const programOptions = useMemo(() => {
    const dbPrograms = programs.map((item) => item.name).filter(Boolean);
    const classPrograms = classes.map((cls) => cls.program).filter(Boolean) as string[];
    return [...new Set([...dbPrograms, ...classPrograms])].sort();
  }, [classes, programs]);

  const candidates = useMemo<CandidateMatchResult[]>(() => {
    if (!targetDate || !startTime || !endTime) return [];
    return matchTeachersForClassOpening({
      teachers,
      capabilities,
      rules,
      exceptions,
      classes,
      classSessions,
      date: targetDate,
      start_time: startTime,
      end_time: endTime,
      level: level === "all" ? null : level,
      program: program === "all" ? null : program,
      mode,
    });
  }, [capabilities, classes, classSessions, endTime, exceptions, level, mode, program, rules, startTime, targetDate, teachers]);

  const selectedCandidate = useMemo(() => candidates.find((item) => item.teacher.id === selectedTeacherId), [candidates, selectedTeacherId]);

  useEffect(() => {
    if (!selectedTeacherId) return;
    if (!candidates.some((item) => item.teacher.id === selectedTeacherId)) setSelectedTeacherId("");
  }, [candidates, selectedTeacherId]);

  const createClass = async () => {
    if (!className.trim()) { toast.error("Nhập tên lớp trước"); return; }
    if (!selectedCandidate) { toast.error("Chọn giáo viên phù hợp trước"); return; }
    setCreating(true);
    const weekday = DAY_LABELS[new Date(`${targetDate}T00:00:00`).getDay()];
    const schedule = `${weekday} (${startTime}-${endTime})`;
    const selectedProgram = program === "all" ? null : program;
    const selectedLevel = level === "all" ? null : level;

    const { error } = await (supabase as any).from("classes" as any).insert({
      teachngo_class_id: `AUTO-${Date.now()}`,
      class_name: className.trim(),
      teacher_id: selectedCandidate.teacher.id,
      teacher_name: selectedCandidate.teacher.full_name,
      class_type: "group",
      data_source: "manual",
      level: selectedLevel,
      program: selectedProgram,
      schedule,
      start_date: targetDate,
      room: room.trim() || null,
      course_title: selectedProgram,
      status: "active",
      default_start_time: startTime,
      default_end_time: endTime,
      notes: note.trim() || null,
    } as any);

    setCreating(false);
    if (error) {
      toast.error(`Không thể mở lớp: ${error.message}`);
      return;
    }
    toast.success(`Đã mở lớp và gán cho ${selectedCandidate.teacher.full_name}`);
    setClassName("");
    setRoom("");
    setNote("");
    setSelectedTeacherId("");
    await queryClient.invalidateQueries({ queryKey: ["admin-schedule"] });
    await queryClient.invalidateQueries({ queryKey: ["teacher-availability-admin"] });
  };

  if (data?.setupMissing) {
    return <ScheduleSetupNotice title="Matching giáo viên cần schema availability" message={data.setupMessage} />;
  }

  if (data?.setupState === "unavailable") {
    return <TeacherAvailabilityStateNotice message={data.setupMessage} />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold flex items-center gap-2"><FilePlus2 className="h-5 w-5 text-primary" />Mở lớp theo slot mong muốn</h2>
        <p className="text-xs text-muted-foreground mt-1">Nhập ngày/giờ, level, chương trình và mode dạy; hệ thống chỉ hiện các giáo viên thật sự cover được slot đó.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thông tin lớp cần mở</CardTitle>
            <CardDescription>Filter theo lịch rảnh + level/khoá dạy được + online/offline + workload hiện tại.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Tên lớp</p>
                <Input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="VD: IELTS Foundation T4-T6" />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Ngày mở lớp</p>
                <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Giờ bắt đầu</p>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Giờ kết thúc</p>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Level lớp</p>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger><SelectValue placeholder="Chọn level" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Bất kỳ level</SelectItem>{levelOptions.map((item) => <SelectItem key={item} value={item!}>{item}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Chương trình</p>
                <Select value={program} onValueChange={setProgram}>
                  <SelectTrigger><SelectValue placeholder="Chọn chương trình" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Bất kỳ chương trình</SelectItem>{programOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Hình thức dạy</p>
                <Select value={mode} onValueChange={(value: any) => setMode(value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hybrid">Hybrid / linh hoạt</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Phòng học</p>
                <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="VD: Room 301" />
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Ghi chú mở lớp</p>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: cần teacher có kinh nghiệm foundation + ưu tiên đã từng dạy evening slot" className="min-h-[90px]" />
            </div>

            <div className="rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
              <p>• Slot yêu cầu: <span className="text-foreground font-medium">{targetDate} · {startTime}–{endTime}</span></p>
              <p>• Hệ thống sort giáo viên theo <span className="text-foreground font-medium">ít lớp hơn</span> rồi đến <span className="text-foreground font-medium">ít phút dạy trong tuần hơn</span>.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base">Giáo viên có thể dạy</CardTitle>
                <CardDescription>{candidates.length} giáo viên khớp slot hiện tại.</CardDescription>
              </div>
              <Badge variant="outline" className="gap-1"><Search className="h-3 w-3" />Auto match</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : candidates.length === 0 ? (
              <div className="rounded-xl border border-dashed p-10 text-center space-y-2">
                <Sparkles className="h-6 w-6 text-muted-foreground mx-auto" />
                <p className="text-sm font-medium">Không tìm thấy giáo viên phù hợp</p>
                <p className="text-xs text-muted-foreground">Thử nới điều kiện level/chương trình hoặc đổi slot dạy.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chọn</TableHead>
                    <TableHead>Giáo viên</TableHead>
                    <TableHead>Lý do match</TableHead>
                    <TableHead className="text-right">Workload</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((candidate) => {
                    const selected = selectedTeacherId === candidate.teacher.id;
                    return (
                      <TableRow key={candidate.teacher.id} className={cn(selected && "bg-primary/5")}> 
                        <TableCell className="w-16">
                          <Button variant={selected ? "default" : "outline"} size="sm" className="h-8" onClick={() => setSelectedTeacherId(candidate.teacher.id)}>
                            {selected ? "Đã chọn" : "Chọn"}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{candidate.teacher.full_name}</p>
                            <p className="text-xs text-muted-foreground">{candidate.teacher.email || candidate.teacher.phone || "Chưa có email/SĐT"}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">{candidate.matchingReasons.map((reason) => <Badge key={`${candidate.teacher.id}-${reason}`} variant="outline">{reason}</Badge>)}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <p>{candidate.activeClassCount} lớp active</p>
                            <p>{Math.round(candidate.weeklyMinutes / 60)}h/tuần</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {selectedCandidate && (
              <div className="rounded-xl border bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Sẽ mở lớp cho: {selectedCandidate.teacher.full_name}</p>
                  <p className="text-xs text-muted-foreground mt-1">Workload hiện tại: {selectedCandidate.activeClassCount} lớp · {Math.round(selectedCandidate.weeklyMinutes / 60)}h/tuần</p>
                </div>
                <Button onClick={createClass} disabled={creating || !className.trim()}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
                  Mở lớp ngay
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminSchedulePage() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-5">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center shrink-0">
          <CalendarDays className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-xl md:text-2xl font-bold tracking-tight">Lịch học & phân bổ giáo viên</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Quản lý lịch dạy, duyệt draft lịch rảnh và mở lớp mới theo slot mong muốn</p>
        </div>
      </div>

      <Tabs defaultValue="calendar" className="space-y-5">
        <TabsList className="h-auto w-full justify-start rounded-xl bg-muted/60 p-1 flex-wrap gap-1">
          <TabsTrigger value="calendar" className="gap-1.5 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold"><CalendarDays className="h-3.5 w-3.5" />Lịch học</TabsTrigger>
          <TabsTrigger value="availability" className="gap-1.5 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold"><Clock3 className="h-3.5 w-3.5" />Duyệt lịch rảnh</TabsTrigger>
          <TabsTrigger value="opening" className="gap-1.5 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold"><FilePlus2 className="h-3.5 w-3.5" />Mở lớp</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar"><ScheduleCalendarTab /></TabsContent>
        <TabsContent value="availability"><AvailabilityDraftsTab /></TabsContent>
        <TabsContent value="opening"><ClassOpeningTab /></TabsContent>
      </Tabs>
    </div>
  );
}
