import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import { format, addDays, startOfWeek, endOfWeek, isToday, isBefore, isSameDay } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@shared/lib/utils";
import {
  ChevronLeft, ChevronRight, Loader2,
  Layers, FileText, Library, Users, User, Clock, CalendarDays,
} from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Progress } from "@shared/components/ui/progress";
import SessionPopover from "@shared/components/schedule/SessionPopover";

interface StudentScheduleProps {
  /** "hub" = show only next session card; "full" = full weekly list */
  mode?: "hub" | "full";
}

interface SessionRow {
  entry: any;
  cls: any;
  sessionNumber: number;
  totalSessions: number;
}

const DAY_LABELS: Record<number, string> = { 0: "CN", 1: "T2", 2: "T3", 3: "T4", 4: "T5", 5: "T6", 6: "T7" };

function fmtTime(t: string | null) {
  if (!t) return "—:—";
  return t.slice(0, 5);
}

async function fetchStudentSchedule(userId: string, weekStart: string, weekEnd: string) {
  // 1. Get student record
  const { data: student } = await supabase
    .from("teachngo_students")
    .select("teachngo_id")
    .eq("linked_user_id", userId)
    .maybeSingle();
  if (!student) return { sessions: [] };

  // 2. Get enrollments
  const { data: enrollments } = await supabase
    .from("teachngo_class_students")
    .select("class_id")
    .eq("teachngo_student_id", student.teachngo_id)
    .eq("status", "enrolled");
  if (!enrollments || enrollments.length === 0) return { sessions: [] };

  const classIds = enrollments.map(e => e.class_id);

  // 3. Get class details
  const { data: classes } = await supabase
    .from("teachngo_classes")
    .select("id, class_name, class_type, level, teacher_name, room, study_plan_id, default_start_time, default_end_time")
    .in("id", classIds);
  if (!classes || classes.length === 0) return { sessions: [] };

  const planToClass = new Map<string, any>();
  for (const c of classes) {
    if (c.study_plan_id) planToClass.set(c.study_plan_id, c);
  }
  const planIds = [...planToClass.keys()];
  if (planIds.length === 0) return { sessions: [] };

  // 4. Get week sessions
  const { data: entries } = await supabase
    .from("study_plan_entries")
    .select("*")
    .in("plan_id", planIds)
    .gte("entry_date", weekStart)
    .lte("entry_date", weekEnd)
    .order("entry_date")
    .order("start_time", { ascending: true, nullsFirst: false });

  // 5. Get plan totals
  const { data: allEntries } = await supabase
    .from("study_plan_entries")
    .select("plan_id, plan_status")
    .in("plan_id", planIds);

  const planStats = new Map<string, { total: number }>();
  for (const e of allEntries || []) {
    const s = planStats.get(e.plan_id) || { total: 0 };
    s.total++;
    planStats.set(e.plan_id, s);
  }

  const sessions: SessionRow[] = (entries || []).map((entry: any) => {
    const cls = planToClass.get(entry.plan_id);
    const stats = planStats.get(entry.plan_id) || { total: 0 };
    if (!entry.start_time && cls?.default_start_time) entry.start_time = cls.default_start_time;
    if (!entry.end_time && cls?.default_end_time) entry.end_time = cls.default_end_time;
    if (!entry.room && cls?.room) entry.room = cls.room;
    return {
      entry,
      cls,
      sessionNumber: entry.session_number || 0,
      totalSessions: stats.total,
    };
  });

  return { sessions };
}

function SessionStatus({ entry }: { entry: any }) {
  const entryDate = new Date(entry.entry_date + "T00:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);

  if (entry.plan_status === "done") {
    return <Badge variant="secondary"className="text-[9px] px-1.5 py-0 h-4 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"> Đã hoàn thành</Badge>;
  }
  if (entry.plan_status === "delayed") {
    return <Badge variant="secondary"className="text-[9px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"> Hoãn</Badge>;
  }
  if (isSameDay(entryDate, today)) {
    return <Badge variant="secondary"className="text-[9px] px-1.5 py-0 h-4 bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"> Hôm nay</Badge>;
  }
  if (isBefore(entryDate, today)) {
    return <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-muted text-muted-foreground">⏳ Đã qua</Badge>;
  }
  return <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-muted text-muted-foreground">⏳ Sắp tới</Badge>;
}

function StudentSessionCard({ s, onClick }: { s: SessionRow; onClick?: () => void }) {
  const isPrivate = s.cls?.class_type === "private";
  const exCount = Array.isArray(s.entry.exercise_ids) ? s.entry.exercise_ids.length : 0;
  const assCount = Array.isArray(s.entry.assessment_ids) ? s.entry.assessment_ids.length : 0;
  const fsCount = Array.isArray(s.entry.flashcard_set_ids) ? s.entry.flashcard_set_ids.length : 0;
  const entryDate = new Date(s.entry.entry_date + "T00:00:00");
  const isTodaySession = isToday(entryDate);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border p-3 transition-colors hover:bg-muted/50 flex gap-3",
        isTodaySession && "ring-2 ring-primary/40 bg-primary/[0.03]",
        s.entry.plan_status === "done" && "opacity-60",
      )}
    >
      {/* Accent bar */}
      <div className={cn("w-1 shrink-0 rounded-full self-stretch", isPrivate ? "bg-destructive" : "bg-emerald-500")} />

      {/* Time */}
      <div className="shrink-0 w-14 flex flex-col items-start">
        <span className="font-display text-sm font-bold leading-tight">{fmtTime(s.entry.start_time)}</span>
        {s.entry.end_time && (
          <span className="text-[10px] text-muted-foreground leading-tight">{fmtTime(s.entry.end_time)}</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {isPrivate
                ? <User className="h-3 w-3 text-destructive shrink-0" />
                : <Users className="h-3 w-3 text-emerald-500 shrink-0" />}
              <span className="font-display font-bold text-sm truncate">{s.cls?.class_name || "—"}</span>
            </div>
            {s.entry.homework && (
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                {s.sessionNumber > 0 && `Buổi ${s.sessionNumber}: `}{s.entry.homework}
              </p>
            )}
          </div>
          {s.entry.room && <span className="text-[10px] bg-muted rounded px-1.5 py-0.5 shrink-0 text-muted-foreground">{s.entry.room}</span>}
        </div>

        {/* Assigned content */}
        {(exCount > 0 || assCount > 0 || fsCount > 0) && (
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {exCount > 0 && <span className="flex items-center gap-0.5"><Layers className="h-3 w-3" /> {exCount} bài tập</span>}
            {assCount > 0 && <span className="flex items-center gap-0.5"><FileText className="h-3 w-3" /> {assCount} bài thi</span>}
            {fsCount > 0 && <span className="flex items-center gap-0.5"><Library className="h-3 w-3" /> {fsCount} từ vựng</span>}
          </div>
        )}

        {/* Teacher + status */}
        <div className="flex items-center gap-2 flex-wrap">
          {s.cls?.teacher_name && (
            <span className="text-[10px] text-muted-foreground">GV: {s.cls.teacher_name}</span>
          )}
          <SessionStatus entry={s.entry} />
        </div>
      </div>
    </button>
  );
}

export default function StudentSchedule({ mode = "full" }: StudentScheduleProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const wsStr = format(weekStart, "yyyy-MM-dd");
  const weStr = format(weekEnd, "yyyy-MM-dd");

  const { data, isLoading } = useQuery({
    queryKey: ["student-schedule", user?.id, wsStr],
    queryFn: () => fetchStudentSchedule(user!.id, wsStr, weStr),
    enabled: !!user,
    staleTime: 60_000,
  });

  const sessions = data?.sessions || [];

  // Next upcoming session (today or future, not done)
  const todayStr = format(now, "yyyy-MM-dd");
  const nextSession = useMemo(() => {
    return sessions.find(s => {
      if (s.entry.plan_status === "done") return false;
      return s.entry.entry_date >= todayStr;
    });
  }, [sessions, todayStr]);

  // Today's sessions
  const todaySessions = useMemo(() => sessions.filter(s => s.entry.entry_date === todayStr), [sessions, todayStr]);

  // Group by date for full view
  const groupedByDate = useMemo(() => {
    const map = new Map<string, SessionRow[]>();
    for (const s of sessions) {
      const d = s.entry.entry_date;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(s);
    }
    return map;
  }, [sessions]);

  const handleSessionClick = (s: SessionRow) => {
    if (s.cls) navigate(`/study-plan?session=${s.entry.id}`);
  };

  // ─── HUB MODE: only next session card ───
  if (mode === "hub") {
    if (isLoading) return null; // Don't show loading in hub embed
    if (!nextSession && todaySessions.length === 0) return null; // Nothing to show

    return (
      <div className="space-y-2">
        {/* Today's session — gradient card */}
        {todaySessions.length > 0 && todaySessions[0].entry.plan_status !== "done" && (
          <button
            onClick={() => handleSessionClick(todaySessions[0])}
            className="w-full bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl border border-primary/20 p-4 text-left group"
          >
            <div className="flex items-center gap-2 text-xs text-primary font-medium mb-1">
              <CalendarDays className="h-3.5 w-3.5" />
              Hôm nay
            </div>
            <p className="font-display font-bold text-sm">
              {todaySessions[0].entry.homework
                ? `${todaySessions[0].sessionNumber > 0 ? `Buổi ${todaySessions[0].sessionNumber}: ` : ""}${todaySessions[0].entry.homework}`
                : todaySessions[0].sessionNumber > 0
                  ? `Buổi ${todaySessions[0].sessionNumber}`
                  : todaySessions[0].cls?.class_name || "Buổi học"}
            </p>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              {todaySessions[0].entry.start_time && <span>⏰ {fmtTime(todaySessions[0].entry.start_time)}</span>}
              {(() => {
                const exC = Array.isArray(todaySessions[0].entry.exercise_ids) ? todaySessions[0].entry.exercise_ids.length : 0;
                const asC = Array.isArray(todaySessions[0].entry.assessment_ids) ? todaySessions[0].entry.assessment_ids.length : 0;
                const total = exC + asC;
                return total > 0 ? <span> {total} bài tập</span> : null;
              })()}
              {todaySessions[0].cls?.class_name && <span>{todaySessions[0].cls.class_name}</span>}
            </div>
          </button>
        )}

        {/* Next upcoming (if not today) */}
        {nextSession && nextSession.entry.entry_date !== todayStr && (
          <button
            onClick={() => handleSessionClick(nextSession)}
            className="w-full bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl border border-primary/20 p-4 text-left group"
          >
            <div className="flex items-center gap-2 text-xs text-primary font-medium mb-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {DAY_LABELS[new Date(nextSession.entry.entry_date + "T00:00:00").getDay()]}, {format(new Date(nextSession.entry.entry_date + "T00:00:00"), "dd/MM")}
            </div>
            <p className="font-display font-bold text-sm">
              {nextSession.entry.homework
                ? `${nextSession.sessionNumber > 0 ? `Buổi ${nextSession.sessionNumber}: ` : ""}${nextSession.entry.homework}`
                : nextSession.sessionNumber > 0
                  ? `Buổi ${nextSession.sessionNumber}`
                  : nextSession.cls?.class_name || "Buổi học"}
            </p>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              {nextSession.entry.start_time && <span>⏰ {fmtTime(nextSession.entry.start_time)}</span>}
              {(() => {
                const exC = Array.isArray(nextSession.entry.exercise_ids) ? nextSession.entry.exercise_ids.length : 0;
                const asC = Array.isArray(nextSession.entry.assessment_ids) ? nextSession.entry.assessment_ids.length : 0;
                const total = exC + asC;
                return total > 0 ? <span> {total} bài tập</span> : null;
              })()}
              {nextSession.cls?.class_name && <span>{nextSession.cls.class_name}</span>}
            </div>
          </button>
        )}
      </div>
    );
  }

  // ─── FULL MODE: weekly list ───
  return (
    <div className="space-y-4">
      {/* Week header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4 text-primary" />
          Tuần {format(weekStart, "dd/MM")} – {format(weekEnd, "dd/MM/yyyy")}
        </h3>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && sessions.length === 0 && (
        <div className="text-center py-6 space-y-1">
          <span className="text-2xl"></span>
          <p className="text-sm text-muted-foreground">Không có buổi học tuần này</p>
        </div>
      )}

      {!isLoading && sessions.length > 0 && (
        <div className="space-y-4">
          {[...groupedByDate.entries()].map(([dateStr, daySessions]) => {
            const d = new Date(dateStr + "T00:00:00");
            const dayIsToday = isToday(d);
            return (
              <div key={dateStr}>
                <p className={cn(
                  "text-xs font-bold mb-2 flex items-center gap-1.5",
                  dayIsToday ? "text-primary" : "text-muted-foreground",
                )}>
                  {DAY_LABELS[d.getDay()]}, {format(d, "dd/MM")}
                  {dayIsToday && <span className="text-[10px] font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">Hôm nay</span>}
                </p>
                <div className="space-y-2">
                  {daySessions.map(s => (
                    <SessionPopover
                      key={s.entry.id}
                      session={s.entry}
                      classInfo={{
                        id: s.cls?.id,
                        class_name: s.cls?.class_name || "—",
                        class_type: s.cls?.class_type || "group",
                        level: s.cls?.level,
                        teacher_name: s.cls?.teacher_name,
                        room: s.entry.room || s.cls?.room,
                        total_sessions: s.totalSessions,
                      }}
                      role="student"
                    >
                      <StudentSessionCard s={s} onClick={() => handleSessionClick(s)} />
                    </SessionPopover>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
