/**
 * CenterScheduleWidget — Day 7 S1 dashboard "Lịch toàn trung tâm".
 *
 * Compact 7-day rolling view of all class sessions across the center,
 * with filter chips for Program / Course / Teacher / Room. Grouped by
 * session_date, click row → navigate to class detail.
 *
 * Distinct from /schedule full page (calendar grid). This widget is
 * dashboard-level "what's happening this week" at-a-glance.
 *
 * Data: class_sessions LEFT JOIN classes (id, name, program, course_id,
 * room) + LEFT JOIN teachers (full_name). Filter by class.* fields, not
 * session-level (admins typically think class-first).
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar, CalendarDays, Filter, Clock, GraduationCap, MapPin, ChevronRight,
  Loader2, List as ListIcon, LayoutGrid,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@shared/lib/utils";
import { formatDateDDMMYYYY } from "@shared/utils/dateFormat";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import { Badge } from "@shared/components/ui/badge";

interface SessionRow {
  id: string;
  class_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  status: string;
  room: string | null;
  room_id: string | null;
  teacher_id: string | null;
}

interface ClassRow {
  id: string;
  name: string | null;
  class_name: string | null;
  class_code: string | null;
  program: string | null;
  course_id: string | null;
  course_name: string | null;
  room: string | null;
  teacher_id: string | null;
  teacher_name: string | null;
}

interface TeacherRow {
  id: string;
  full_name: string | null;
}

const DAY_VI = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function plusDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtTime(t: string | null): string {
  if (!t) return "—";
  return t.slice(0, 5);
}

export function CenterScheduleWidget() {
  const navigate = useNavigate();

  const [program, setProgram] = useState<string>("__all__");
  const [courseId, setCourseId] = useState<string>("__all__");
  const [teacherId, setTeacherId] = useState<string>("__all__");
  const [room, setRoom] = useState<string>("__all__");
  const [windowDays, setWindowDays] = useState<7 | 14 | 30>(7);
  /* View mode toggle (Day 7 user request "Tích hợp xem theo 2 views toggle
     dạng lịch và view theo list"). Persist in localStorage cho UX. */
  const [view, setView] = useState<"list" | "calendar">(() => {
    if (typeof window === "undefined") return "list";
    const stored = window.localStorage.getItem("center-schedule-view");
    return stored === "calendar" ? "calendar" : "list";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem("center-schedule-view", view); } catch { /* ignore */ }
  }, [view]);

  const startDate = useMemo(() => todayIso(), []);
  const endDate = useMemo(() => plusDaysIso(windowDays - 1), [windowDays]);

  /* ─── Sessions in window ─── */
  const sessionsQ = useQuery({
    queryKey: ["center-schedule-sessions", startDate, endDate],
    queryFn: async (): Promise<SessionRow[]> => {
      const { data, error } = await (supabase as any)
        .from("class_sessions")
        .select("id, class_id, session_date, start_time, end_time, status, room, room_id, teacher_id")
        .gte("session_date", startDate)
        .lte("session_date", endDate)
        .order("session_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as SessionRow[];
    },
    staleTime: 60_000,
  });

  /* ─── Classes for sessions in window ─── */
  const classIds = useMemo(
    () => Array.from(new Set((sessionsQ.data ?? []).map((s) => s.class_id))),
    [sessionsQ.data],
  );

  const classesQ = useQuery({
    queryKey: ["center-schedule-classes", classIds.sort().join(",")],
    enabled: classIds.length > 0,
    queryFn: async (): Promise<ClassRow[]> => {
      const { data, error } = await (supabase as any)
        .from("classes")
        .select("id, name, class_name, class_code, program, course_id, course_name, room, teacher_id, teacher_name")
        .in("id", classIds);
      if (error) throw error;
      return (data ?? []) as ClassRow[];
    },
    staleTime: 60_000,
  });

  const classMap = useMemo(() => {
    const m = new Map<string, ClassRow>();
    (classesQ.data ?? []).forEach((c) => m.set(c.id, c));
    return m;
  }, [classesQ.data]);

  /* ─── Teachers (for filter list + display fallback) ─── */
  const teacherIds = useMemo(() => {
    const ids = new Set<string>();
    (classesQ.data ?? []).forEach((c) => { if (c.teacher_id) ids.add(c.teacher_id); });
    (sessionsQ.data ?? []).forEach((s) => { if (s.teacher_id) ids.add(s.teacher_id); });
    return Array.from(ids);
  }, [classesQ.data, sessionsQ.data]);

  const teachersQ = useQuery({
    queryKey: ["center-schedule-teachers", teacherIds.sort().join(",")],
    enabled: teacherIds.length > 0,
    queryFn: async (): Promise<TeacherRow[]> => {
      const { data, error } = await (supabase as any)
        .from("teachers")
        .select("id, full_name")
        .in("id", teacherIds);
      if (error) throw error;
      return (data ?? []) as TeacherRow[];
    },
    staleTime: 5 * 60_000,
  });

  const teacherMap = useMemo(() => {
    const m = new Map<string, string>();
    (teachersQ.data ?? []).forEach((t) => m.set(t.id, t.full_name ?? "(không tên)"));
    return m;
  }, [teachersQ.data]);

  /* ─── Filter options derived from current data ─── */
  const programOptions = useMemo(() => {
    const set = new Set<string>();
    (classesQ.data ?? []).forEach((c) => { if (c.program) set.add(c.program); });
    return Array.from(set).sort();
  }, [classesQ.data]);

  const courseOptions = useMemo(() => {
    const m = new Map<string, string>();
    (classesQ.data ?? []).forEach((c) => {
      if (c.course_id) m.set(c.course_id, c.course_name ?? c.course_id.slice(0, 8));
    });
    return Array.from(m.entries()).map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [classesQ.data]);

  const teacherOptions = useMemo(() => {
    return Array.from(teacherMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [teacherMap]);

  const roomOptions = useMemo(() => {
    const set = new Set<string>();
    (classesQ.data ?? []).forEach((c) => { if (c.room) set.add(c.room); });
    (sessionsQ.data ?? []).forEach((s) => { if (s.room) set.add(s.room); });
    return Array.from(set).sort();
  }, [classesQ.data, sessionsQ.data]);

  /* ─── Apply filters ─── */
  const filteredSessions = useMemo(() => {
    const sessions = sessionsQ.data ?? [];
    return sessions.filter((s) => {
      const cls = classMap.get(s.class_id);
      if (program !== "__all__" && cls?.program !== program) return false;
      if (courseId !== "__all__" && cls?.course_id !== courseId) return false;
      const effectiveTeacher = s.teacher_id ?? cls?.teacher_id ?? "";
      if (teacherId !== "__all__" && effectiveTeacher !== teacherId) return false;
      const effectiveRoom = s.room ?? cls?.room ?? "";
      if (room !== "__all__" && effectiveRoom !== room) return false;
      return true;
    });
  }, [sessionsQ.data, classMap, program, courseId, teacherId, room]);

  /* Group by date for display. */
  const grouped = useMemo(() => {
    const m = new Map<string, SessionRow[]>();
    filteredSessions.forEach((s) => {
      const arr = m.get(s.session_date) ?? [];
      arr.push(s);
      m.set(s.session_date, arr);
    });
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredSessions]);

  const totalSessions = filteredSessions.length;
  const isLoading = sessionsQ.isLoading || classesQ.isLoading;
  const hasFilter = program !== "__all__" || courseId !== "__all__" ||
    teacherId !== "__all__" || room !== "__all__";

  const resetFilters = () => {
    setProgram("__all__");
    setCourseId("__all__");
    setTeacherId("__all__");
    setRoom("__all__");
  };

  return (
    <div className="rounded-pop-lg border-[2.5px] border-lp-ink bg-white shadow-pop p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-display text-sm font-extrabold text-lp-body uppercase tracking-[0.12em] inline-flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5" /> Lịch toàn trung tâm
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode toggle (list ↔ calendar) */}
          <div role="tablist" aria-label="Chế độ hiển thị" className="flex items-center rounded-pop border-[1.5px] border-lp-ink/60 bg-white overflow-hidden">
            <button
              type="button"
              role="tab"
              aria-selected={view === "list"}
              onClick={() => setView("list")}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 text-[10px] font-display font-bold transition-colors",
                view === "list" ? "bg-lp-yellow text-lp-ink" : "text-lp-body hover:bg-lp-yellow/20",
              )}
              aria-label="View list"
            >
              <ListIcon className="h-3 w-3" /> List
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "calendar"}
              onClick={() => setView("calendar")}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 text-[10px] font-display font-bold transition-colors border-l-[1.5px] border-lp-ink/60",
                view === "calendar" ? "bg-lp-yellow text-lp-ink" : "text-lp-body hover:bg-lp-yellow/20",
              )}
              aria-label="View calendar"
            >
              <LayoutGrid className="h-3 w-3" /> Lịch
            </button>
          </div>
          <Select value={String(windowDays)} onValueChange={(v) => setWindowDays(Number(v) as 7 | 14 | 30)}>
            <SelectTrigger className="h-7 w-[110px] text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7" className="text-xs">7 ngày tới</SelectItem>
              <SelectItem value="14" className="text-xs">14 ngày tới</SelectItem>
              <SelectItem value="30" className="text-xs">30 ngày tới</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-[11px] text-lp-body tabular-nums">
            <strong className="font-display font-extrabold text-lp-ink">{totalSessions}</strong> buổi
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <FilterSelect
          label="Program"
          value={program}
          onChange={setProgram}
          options={programOptions.map((p) => ({ value: p, label: p }))}
        />
        <FilterSelect
          label="Course"
          value={courseId}
          onChange={setCourseId}
          options={courseOptions.map((c) => ({ value: c.id, label: c.name }))}
        />
        <FilterSelect
          label="Giáo viên"
          value={teacherId}
          onChange={setTeacherId}
          options={teacherOptions.map((t) => ({ value: t.id, label: t.name }))}
        />
        <FilterSelect
          label="Phòng"
          value={room}
          onChange={setRoom}
          options={roomOptions.map((r) => ({ value: r, label: r }))}
        />
      </div>

      {hasFilter && (
        <button
          type="button"
          onClick={resetFilters}
          className="text-[10px] font-display font-bold text-lp-coral hover:underline inline-flex items-center gap-1"
        >
          <Filter className="h-3 w-3" /> Reset filter
        </button>
      )}

      {/* Body */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-lp-teal" />
        </div>
      ) : sessionsQ.error ? (
        <div className="text-xs text-destructive p-3 rounded-md bg-destructive/5 border border-destructive/30">
          Lỗi tải lịch: {(sessionsQ.error as Error).message}
        </div>
      ) : grouped.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-10 space-y-2">
          <Calendar className="h-7 w-7 mx-auto text-muted-foreground/50" />
          <p>{hasFilter ? "Không có buổi học khớp filter." : `Không có buổi học trong ${windowDays} ngày tới.`}</p>
        </div>
      ) : view === "calendar" ? (
        /* Calendar view — horizontal scroll of day columns. Each column shows
           sessions stacked vertically (compact agenda). Hôm nay highlight
           coral header. Click session → navigate /classes/:id. */
        <div className="overflow-x-auto pb-2">
          <div
            className="grid gap-2 min-w-fit"
            style={{ gridTemplateColumns: `repeat(${windowDays}, minmax(140px, 1fr))` }}
          >
            {Array.from({ length: windowDays }).map((_, i) => {
              const dateStr = plusDaysIso(i);
              const sessions = (grouped.find(([d]) => d === dateStr)?.[1]) ?? [];
              const d = new Date(dateStr + "T00:00:00");
              const dow = DAY_VI[d.getDay()];
              const isToday = dateStr === todayIso();
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div
                  key={dateStr}
                  className={cn(
                    "rounded-pop border-[1.5px] flex flex-col min-h-[180px]",
                    isToday ? "border-lp-coral bg-lp-coral/5" : "border-lp-ink/15 bg-white",
                    isWeekend && !isToday && "bg-muted/20",
                  )}
                >
                  <div className={cn(
                    "px-2 py-1.5 border-b-[1.5px] flex items-center justify-between gap-1",
                    isToday ? "border-lp-coral/40 bg-lp-coral text-white" : "border-lp-ink/10",
                  )}>
                    <span className="text-[10px] font-display font-extrabold uppercase tracking-wider">
                      {dow}
                    </span>
                    <span className={cn(
                      "text-[10px] font-mono tabular-nums",
                      isToday ? "text-white/90" : "text-muted-foreground",
                    )}>
                      {dateStr.slice(8)}/{dateStr.slice(5, 7)}
                    </span>
                  </div>
                  <div className="flex-1 p-1.5 space-y-1">
                    {sessions.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground/60 italic text-center py-4">
                        —
                      </p>
                    ) : sessions.map((s) => {
                      const cls = classMap.get(s.class_id);
                      const tName = (s.teacher_id && teacherMap.get(s.teacher_id))
                        ?? (cls?.teacher_id && teacherMap.get(cls.teacher_id))
                        ?? cls?.teacher_name
                        ?? "";
                      const className = cls?.name ?? cls?.class_name ?? cls?.class_code ?? "?";
                      const effectiveRoom = s.room ?? cls?.room ?? "";
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => navigate(`/classes/${s.class_id}`)}
                          className="w-full text-left p-1.5 rounded border-[1.5px] border-lp-ink/15 bg-white hover:border-lp-ink/50 hover:shadow-pop-xs transition-all group"
                        >
                          <p className="text-[9px] font-mono font-bold text-lp-ink tabular-nums leading-tight">
                            {fmtTime(s.start_time)}–{fmtTime(s.end_time)}
                          </p>
                          <p className="text-[10px] font-display font-bold text-lp-ink truncate leading-tight mt-0.5">
                            {className}
                          </p>
                          {(tName || effectiveRoom) && (
                            <p className="text-[9px] text-muted-foreground truncate leading-tight">
                              {tName} {tName && effectiveRoom && "·"} {effectiveRoom}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <ul className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
          {grouped.map(([date, sessions]) => {
            const d = new Date(date + "T00:00:00");
            const dow = DAY_VI[d.getDay()];
            const isToday = date === todayIso();
            return (
              <li key={date}>
                <div className={cn(
                  "sticky top-0 z-10 bg-white py-1 mb-1 flex items-center gap-2",
                  isToday && "text-lp-coral",
                )}>
                  <span className={cn(
                    "inline-flex items-center justify-center h-6 w-6 rounded-pop text-[10px] font-display font-extrabold border-[1.5px]",
                    isToday ? "bg-lp-coral text-white border-lp-coral" : "border-lp-ink/40 text-lp-ink",
                  )}>
                    {dow}
                  </span>
                  <span className="text-xs font-display font-bold text-lp-ink">
                    {formatDateDDMMYYYY(date)}
                  </span>
                  {isToday && <Badge variant="outline" className="text-[9px] border-lp-coral text-lp-coral">Hôm nay</Badge>}
                  <span className="text-[10px] text-muted-foreground ml-auto">{sessions.length} buổi</span>
                </div>
                <ul className="space-y-1">
                  {sessions.map((s) => {
                    const cls = classMap.get(s.class_id);
                    const tName = (s.teacher_id && teacherMap.get(s.teacher_id))
                      ?? (cls?.teacher_id && teacherMap.get(cls.teacher_id))
                      ?? cls?.teacher_name
                      ?? "—";
                    const className = cls?.name ?? cls?.class_name ?? cls?.class_code ?? "(không tên)";
                    const effectiveRoom = s.room ?? cls?.room ?? "—";
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => navigate(`/classes/${s.class_id}`)}
                          className="w-full text-left flex items-center gap-3 p-2 rounded-pop border-[1.5px] border-lp-ink/10 hover:border-lp-ink/40 hover:bg-lp-yellow/10 transition-colors group"
                        >
                          <div className="shrink-0 inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-lp-ink tabular-nums">
                            <Clock className="h-3 w-3" />
                            {fmtTime(s.start_time)}–{fmtTime(s.end_time)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-display font-bold text-lp-ink truncate">
                              {className}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                              {cls?.program && <span>{cls.program}</span>}
                              <span className="inline-flex items-center gap-0.5">
                                <GraduationCap className="h-2.5 w-2.5" /> {tName}
                              </span>
                              <span className="inline-flex items-center gap-0.5">
                                <MapPin className="h-2.5 w-2.5" /> {effectiveRoom}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-lp-ink shrink-0 transition-colors" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: { value: string; label: string }[];
}

function FilterSelect({ label, value, onChange, options }: FilterSelectProps) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Tất cả" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__" className="text-xs">Tất cả</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
