// Stage P2 — redesigned Step 2 of the create-class wizard.
//
// 3 pill tabs:
//   • "Theo khung thời gian" (by-slot)   — find_available_teachers_for_slot_v2
//                                           with capability/workload/revenue
//                                           scoring badges per row.
//   • "Theo doanh thu thấp"  (by-revenue) — NEW. Surfaces top-N teachers
//                                           with the lowest 6-mo avg gross
//                                           payroll (and new teachers first).
//                                           Admin picks one → switches to
//                                           by-teacher mode with that teacher
//                                           pre-selected.
//   • "Theo giáo viên"       (by-teacher) — manual pick + show common slots.

import { Label } from "@shared/components/ui/label";
import { Input } from "@shared/components/ui/input";
import { Checkbox } from "@shared/components/ui/checkbox";
import { Button } from "@shared/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@shared/components/ui/popover";
import { Calendar } from "@shared/components/ui/calendar";
import {
  AlertTriangle, Award, BookOpen, CalendarDays, CheckCircle2, Loader2, Search, Sparkles, TrendingDown, Users, Wallet,
} from "lucide-react";
import { useAvailableTeachersV2, AvailableTeacherV2 } from "@shared/hooks/useAvailableTeachersV2";
import { useLowestRevenueTeachers } from "@shared/hooks/useLowestRevenueTeachers";
import { useTeacherSlots } from "@shared/hooks/useTeacherSlots";
import { useStudyPlanTemplates } from "@shared/hooks/useStudyPlanTemplates";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { addDays, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday, startOfMonth, startOfWeek } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@shared/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  AdminWeeklyGrid, fetchAllScheduleData, detectConflicts,
  type SessionWithClass,
} from "@admin/features/schedule/pages/AdminSchedulePage";
import {
  AssignedTeacher, DeliveryMode, ScheduleMode, WizardClassInfo, WizardSlot,
  WEEKDAY_LABELS, countSessionsInRange, toLocalISODate,
} from "./wizardTypes";

interface Props {
  classInfo: WizardClassInfo;
  scheduleMode: ScheduleMode;
  setScheduleMode: (m: ScheduleMode) => void;
  slot: WizardSlot;
  setSlot: (s: WizardSlot) => void;
  teachers: AssignedTeacher[];
  setTeachers: (t: AssignedTeacher[]) => void;
  selectedSlotKeys: string[];
  setSelectedSlotKeys: (k: string[]) => void;
  /** F2.1: setter cho study_plan_id. Wizard parent owns classInfo state — Step2
   *  gọi callback này khi user pick template từ dropdown filter-by-course_id. */
  setStudyPlanId: (id: string | null) => void;
  /** F2.2: expectedSessions = REQUIRED số buổi (hours-adjusted, post-#C1).
   *  Computed in parent: ceil(total_sessions × session_duration / slotDurationMinutes).
   *  null khi chưa pick template (Customized class) — mismatch indicator ẩn. */
  expectedSessions: number | null;
  /** Issue #C2: total hours từ template (display transparency).
   *  null khi chưa pick template. */
  planTotalHours: number | null;
  /** Issue #C2: slot duration phút (display transparency). 0 khi chưa set time. */
  slotDurationMinutes: number;
  /** Issue #1 v2: end_date moved from Step 1 → Step 2.
   *  endDateManuallyOverridden: true nếu user đã manual edit (skip auto-calc).
   *  onEndDateChange: gọi khi user edit end_date Input — parent quyết định mở
   *    confirm dialog (Batch 1) hoặc set thẳng.
   *  onEndDateAutoReset: gọi khi user click "Tính lại từ Study Plan". */
  endDateManuallyOverridden: boolean;
  onEndDateChange: (newDate: string) => void;
  onEndDateAutoReset: () => void;
}

const VND_FMT = new Intl.NumberFormat("vi-VN");

function fmtVND(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return "—";
  return `${VND_FMT.format(Math.round(n))} ₫`;
}

export default function Step2Schedule(props: Props) {
  const pill = (mode: ScheduleMode, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => props.setScheduleMode(mode)}
      className={`px-4 py-2 rounded-full border text-sm font-medium inline-flex items-center gap-2 transition ${
        props.scheduleMode === mode
          ? "bg-primary text-primary-foreground border-primary shadow-sm"
          : "bg-background hover:bg-accent/40 border-border"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Top: template picker only */}
      <TemplatePickerSection
        classInfo={props.classInfo}
        setStudyPlanId={props.setStudyPlanId}
      />

      {/* Mode picker pills + subcomponent (chứa weekdays + time picker) */}
      <div className="flex flex-wrap gap-2">
        {pill("by-slot",    "Theo khung thời gian", <Search className="h-3.5 w-3.5" />)}
        {pill("by-revenue", "Theo doanh thu thấp",  <TrendingDown className="h-3.5 w-3.5" />)}
        {pill("by-teacher", "Theo giáo viên",       <Users className="h-3.5 w-3.5" />)}
      </div>

      {props.scheduleMode === "by-slot"    && <ModeAByTimeSlotV2 {...props} />}
      {props.scheduleMode === "by-revenue" && <ModeRevenueBased  {...props} />}
      {props.scheduleMode === "by-teacher" && <ModeBByTeacher    {...props} />}

      {/* Issue #A3: end_date + mismatch indicators moved AFTER mode subcomponent
          (after weekdays picker). Logical UX flow — user picks weekdays first, then
          sees computed end_date + mismatch warnings. */}
      <EndDateMismatchSection
        classInfo={props.classInfo}
        slot={props.slot}
        expectedSessions={props.expectedSessions}
        planTotalHours={props.planTotalHours}
        slotDurationMinutes={props.slotDurationMinutes}
        endDateManuallyOverridden={props.endDateManuallyOverridden}
        onEndDateChange={props.onEndDateChange}
        onEndDateAutoReset={props.onEndDateAutoReset}
      />

      {/* CenterScheduleEmbed moved to Step 1 (F2.7 quick-win) — admin có visual
          context lịch trung tâm ngay từ khi pick start_date. */}
    </div>
  );
}

/* ───────────── F2.5 mini — Center Schedule Calendar (read-only) ─────────────
   Reuses AdminWeeklyGrid + fetchAllScheduleData + detectConflicts đã exported
   từ AdminSchedulePage. Read-only single-week view khởi điểm từ classInfo.start_date
   (hoặc tuần hiện tại nếu chưa set) — admin có visual context lịch trung tâm khi
   pick weekdays/slot ở Step 2.

   Defer Full F2.5 features: drag/quẹt pick time range, occupancy heat coloring,
   week navigation prev/next. */

type CalendarViewMode = "week" | "month";

export function CenterScheduleEmbed({
  startDate, selectedTeachers,
}: {
  startDate: string;
  selectedTeachers: AssignedTeacher[];
}) {
  const [viewMode, setViewMode] = useState<CalendarViewMode>("week");
  // F2.5+ teacher filter — auto-enable khi user pick teachers ở Step 2 picker.
  // User có thể disable manually (clear button) để xem all sessions trở lại.
  const [filterEnabled, setFilterEnabled] = useState(true);

  // Anchor — chứa classInfo.start_date hoặc today nếu chưa set.
  const anchor = useMemo(() => {
    const a = startDate ? new Date(startDate + "T00:00:00") : new Date();
    if (Number.isNaN(a.getTime())) a.setTime(Date.now());
    return a;
  }, [startDate]);

  // Week mode: 7-day window starting Monday
  const weekDates = useMemo(() => {
    const monday = startOfWeek(anchor, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, [anchor]);

  // Month mode: full calendar grid (Mon..Sun, 5-6 rows tuỳ tháng)
  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(anchor);
    const monthEnd = endOfMonth(anchor);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [anchor]);

  // Range query — adapts to viewMode
  const range = useMemo(() => {
    if (viewMode === "week") {
      return { start: format(weekDates[0], "yyyy-MM-dd"), end: format(weekDates[6], "yyyy-MM-dd") };
    }
    return {
      start: format(monthDays[0], "yyyy-MM-dd"),
      end: format(monthDays[monthDays.length - 1], "yyyy-MM-dd"),
    };
  }, [viewMode, weekDates, monthDays]);

  const dataQ = useQuery({
    queryKey: ["wizard-center-schedule", range.start, range.end],
    queryFn: () => fetchAllScheduleData(range.start, range.end),
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const allSessions = dataQ.data?.sessions ?? [];

  // F2.5+ teacher filter — only sessions from selected teachers shown khi
  // filterEnabled + có teachers picked. Empty selection or filterEnabled=false → all.
  const teacherIdSet = useMemo(
    () => new Set(selectedTeachers.map((t) => t.teacher_id)),
    [selectedTeachers],
  );
  const filterActive = filterEnabled && teacherIdSet.size > 0;
  const sessions = useMemo(() => {
    if (!filterActive) return allSessions;
    return allSessions.filter((s) => s.cls?.teacher_id && teacherIdSet.has(s.cls.teacher_id));
  }, [allSessions, filterActive, teacherIdSet]);

  const conflictIds = useMemo(() => detectConflicts(sessions), [sessions]);

  const teacherFilterLabel = useMemo(() => {
    if (!filterActive) return null;
    if (selectedTeachers.length === 1) return selectedTeachers[0].full_name;
    return `${selectedTeachers.length} giáo viên`;
  }, [filterActive, selectedTeachers]);

  const rangeLabel = useMemo(() => {
    if (viewMode === "week") {
      return `Tuần ${format(weekDates[0], "dd/MM", { locale: vi })} → ${format(weekDates[6], "dd/MM/yyyy", { locale: vi })}`;
    }
    return `Tháng ${format(anchor, "MM/yyyy", { locale: vi })}`;
  }, [viewMode, weekDates, anchor]);

  return (
    <div className="border-t-2 pt-4 mt-2">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
        <div>
          <h3 className="font-display text-sm font-bold inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-primary" /> Lịch trung tâm (tham khảo)
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {rangeLabel} — xem occupancy của trung tâm để pick weekdays + giờ phù hợp.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* F2.5+ week/month view toggle */}
          <div className="inline-flex rounded-md border bg-background p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={cn(
                "px-2.5 py-1 rounded transition-colors font-semibold",
                viewMode === "week" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Tuần
            </button>
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={cn(
                "px-2.5 py-1 rounded transition-colors font-semibold",
                viewMode === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Tháng
            </button>
          </div>
          {dataQ.isFetching && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Đang tải…
            </span>
          )}
        </div>
      </div>

      {/* F2.5+ teacher filter indicator — auto-shows khi có teachers selected */}
      {teacherIdSet.size > 0 && (
        <div className="mb-2 flex items-center gap-2 flex-wrap">
          {filterActive ? (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary border border-primary/30 px-2.5 py-0.5 text-[11px] font-medium">
                <Users className="h-3 w-3" /> Lọc theo: <strong>{teacherFilterLabel}</strong>
              </span>
              <button
                type="button"
                onClick={() => setFilterEnabled(false)}
                className="text-[11px] underline text-muted-foreground hover:text-foreground"
              >
                Xem tất cả
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setFilterEnabled(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-muted text-muted-foreground border px-2.5 py-0.5 text-[11px] font-medium hover:text-foreground"
            >
              <Users className="h-3 w-3" /> Bật lọc theo {selectedTeachers.length === 1 ? selectedTeachers[0].full_name : `${selectedTeachers.length} GV`}
            </button>
          )}
        </div>
      )}

      {dataQ.error ? (
        <p className="text-xs text-destructive">Lỗi tải lịch: {(dataQ.error as Error).message}</p>
      ) : !dataQ.isLoading && sessions.length === 0 ? (
        <div className="rounded-lg border-dashed border-2 bg-muted/20 p-4 text-center text-xs text-muted-foreground">
          Chưa có buổi học nào trong {viewMode === "week" ? "tuần" : "tháng"} này.
        </div>
      ) : viewMode === "week" ? (
        <div className="rounded-lg border bg-card overflow-hidden">
          <AdminWeeklyGrid sessions={sessions} weekDates={weekDates} conflictIds={conflictIds} />
        </div>
      ) : (
        <MonthlyCompactGrid sessions={sessions} monthDays={monthDays} anchor={anchor} />
      )}
    </div>
  );
}

/* F2.5+ MonthlyCompactGrid — compact calendar grid showing session chips per day.
   Cells outside current month dimmed. Sessions shown as small colored chips,
   first 2 visible + "+N" overflow indicator. Reuses fetchAllScheduleData. */
function MonthlyCompactGrid({
  sessions, monthDays, anchor,
}: {
  sessions: SessionWithClass[];
  monthDays: Date[];
  anchor: Date;
}) {
  const sessionsByDay = useMemo(() => {
    const map = new Map<string, SessionWithClass[]>();
    for (const s of sessions) {
      const date = s.entry.entry_date;
      if (!date) continue;
      const arr = map.get(date) ?? [];
      arr.push(s);
      map.set(date, arr);
    }
    return map;
  }, [sessions]);

  // Header labels follow display order T2..CN (matches WEEKDAY_LABELS)
  const headerOrder = [1, 2, 3, 4, 5, 6, 0];
  const dayLabel = (n: number) => WEEKDAY_LABELS.find((l) => l.value === n)?.label ?? "";

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="grid grid-cols-7 gap-px bg-border">
        {headerOrder.map((wd) => (
          <div key={wd} className="bg-muted/50 p-2 text-center text-[11px] font-semibold">
            {dayLabel(wd)}
          </div>
        ))}
        {monthDays.map((d) => {
          const isCurrentMonth = isSameMonth(d, anchor);
          const dateKey = toLocalISODate(d);
          const daySessions = sessionsByDay.get(dateKey) ?? [];
          const isPast = d < new Date(new Date().setHours(0, 0, 0, 0));
          return (
            <div
              key={dateKey}
              className={cn(
                "bg-card p-1.5 min-h-[64px] flex flex-col gap-0.5 text-xs",
                !isCurrentMonth && "opacity-40 bg-muted/20",
                isToday(d) && "ring-2 ring-primary ring-inset",
                isPast && isCurrentMonth && "bg-muted/10",
              )}
            >
              <span className={cn(
                "font-medium tabular-nums text-[11px]",
                isToday(d) && "text-primary font-bold",
              )}>
                {d.getDate()}
              </span>
              {daySessions.length > 0 && (
                <div className="flex flex-wrap gap-0.5">
                  {daySessions.slice(0, 2).map((s, idx) => (
                    <span
                      key={`${s.entry.id ?? idx}`}
                      className={cn(
                        "text-[9px] px-1 py-0.5 rounded truncate max-w-full",
                        s.cls?.class_type === "private"
                          ? "bg-destructive/15 text-destructive"
                          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
                      )}
                      title={s.cls?.class_name ?? ""}
                    >
                      {s.cls?.class_name ?? "—"}
                    </span>
                  ))}
                  {daySessions.length > 2 && (
                    <span className="text-[9px] text-muted-foreground font-medium">
                      +{daySessions.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────── F2.1 + F2.2 + Issue #A3 — Study Plan + End_Date sections ─────────────
   Issue #A3 split: TemplatePickerSection (top of Step 2) + EndDateMismatchSection
   (after mode subcomponent — sau khi user pick weekdays). Logical UX flow.

   Both sections share queries via TanStack cache (same queryKeys → single fetch). */

/** Hook to fetch eligible templates filtered by course_study_plans junction.
 *  Cached 5min (Tier 1 pattern). Used by both TemplatePickerSection +
 *  EndDateMismatchSection — single fetch shared via queryKey cache. */
function useEligibleTemplates(courseId: string | null) {
  const { data: allTemplates } = useStudyPlanTemplates();
  const linksQ = useQuery({
    queryKey: ["wizard-course-study-plans", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("course_study_plans")
        .select("course_id, template_id, is_default, sort_order")
        .eq("course_id", courseId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{ course_id: string; template_id: string; is_default: boolean; sort_order: number }>;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
  const eligibleTemplates = useMemo(() => {
    if (!courseId || !allTemplates) return [];
    const linkedIds = new Set((linksQ.data ?? []).map((l) => l.template_id));
    if (linkedIds.size === 0) return [];
    return allTemplates.filter((t) => linkedIds.has(t.id));
  }, [courseId, allTemplates, linksQ.data]);
  return { eligibleTemplates, linksQ };
}

function TemplatePickerSection({
  classInfo, setStudyPlanId,
}: {
  classInfo: WizardClassInfo;
  setStudyPlanId: (id: string | null) => void;
}) {
  const { eligibleTemplates, linksQ } = useEligibleTemplates(classInfo.course_id);

  const dropdownDisabled = !classInfo.course_id || linksQ.isLoading || eligibleTemplates.length === 0;
  const dropdownPlaceholder = !classInfo.course_id
    ? "Chọn khoá học ở Step 1 (nếu có)"
    : linksQ.isLoading
    ? "Đang tải..."
    : eligibleTemplates.length === 0
    ? "Khoá này chưa có template — lớp sẽ customized"
    : "Chọn template";

  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <Label className="inline-flex items-center gap-1.5 text-sm font-semibold">
        <BookOpen className="h-3.5 w-3.5" /> Study Plan template (tuỳ chọn)
      </Label>
      <Select
        value={classInfo.study_plan_id ?? "none"}
        onValueChange={(v) => setStudyPlanId(v === "none" ? null : v)}
        disabled={dropdownDisabled}
      >
        <SelectTrigger className="mt-1">
          <SelectValue placeholder={dropdownPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">— Không gán (lớp customized) —</SelectItem>
          {eligibleTemplates.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.template_name} · {t.total_sessions} buổi · {t.session_duration}'
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {classInfo.course_id && classInfo.course_title && eligibleTemplates.length > 0 && (
        <p className="text-[11px] text-muted-foreground mt-1">
          Templates link với khoá <strong>{classInfo.course_title}</strong>. Tạo template mới qua trang Mẫu kế hoạch.
        </p>
      )}
      {classInfo.study_plan_id && (
        <p className="text-[11px] text-muted-foreground mt-1">
          ✨ Bản copy của template sẽ được tạo cho lớp này (Tier 2 instance).
        </p>
      )}
    </div>
  );
}

function EndDateMismatchSection({
  classInfo, slot, expectedSessions, planTotalHours, slotDurationMinutes,
  endDateManuallyOverridden, onEndDateChange, onEndDateAutoReset,
}: {
  classInfo: WizardClassInfo;
  slot: WizardSlot;
  expectedSessions: number | null;
  planTotalHours: number | null;
  slotDurationMinutes: number;
  endDateManuallyOverridden: boolean;
  onEndDateChange: (newDate: string) => void;
  onEndDateAutoReset: () => void;
}) {
  const { eligibleTemplates } = useEligibleTemplates(classInfo.course_id);

  const actualSessionCount = useMemo(
    () => countSessionsInRange(classInfo.start_date, classInfo.end_date, slot.weekdays),
    [classInfo.start_date, classInfo.end_date, slot.weekdays],
  );

  // Issue #A4: session duration validation. expectedDuration = template's
  // per-session minutes. slotDurationMinutes now passed from parent (#C1).
  const expectedDuration = useMemo(() => {
    if (!classInfo.study_plan_id) return null;
    const tpl = (eligibleTemplates ?? []).find((t) => t.id === classInfo.study_plan_id);
    return tpl?.session_duration ?? null;
  }, [classInfo.study_plan_id, eligibleTemplates]);

  const durationMismatch =
    expectedDuration != null && slotDurationMinutes > 0 && slotDurationMinutes !== expectedDuration;

  // Template raw count for display transparency (post-#C1 expectedSessions is hours-adjusted)
  const templateSessionCount = useMemo(() => {
    if (!classInfo.study_plan_id) return null;
    const tpl = (eligibleTemplates ?? []).find((t) => t.id === classInfo.study_plan_id);
    return tpl?.total_sessions ?? null;
  }, [classInfo.study_plan_id, eligibleTemplates]);

  // #C10: Date objects cho Calendar `disabled` matcher + selected.
  const [endCalOpen, setEndCalOpen] = useState(false);
  const minEndDate = useMemo(() => {
    if (!classInfo.start_date) return null;
    const d = new Date(classInfo.start_date + "T00:00:00");
    d.setDate(d.getDate() + 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [classInfo.start_date]);
  const endDateObj = useMemo(
    () => (classInfo.end_date ? new Date(classInfo.end_date + "T00:00:00") : undefined),
    [classInfo.end_date],
  );

  const sessionsPerWeek = slot.weekdays.length;

  // #C1-bis: Session list summary — show actual session days for transparency.
  // Eliminates user mental-model gap (week-based expectation vs weekday-based reality).
  // Walks day-by-day same logic as computeEndDateForSessions (forward walk).
  const sessionDates = useMemo(() => {
    if (!classInfo.start_date || slot.weekdays.length === 0 || !expectedSessions) return [];
    const dates: string[] = [];
    const cur = new Date(classInfo.start_date + "T00:00:00");
    if (Number.isNaN(cur.getTime())) return [];
    for (let i = 0; i < 730 && dates.length < expectedSessions; i++) {
      if (slot.weekdays.includes(cur.getDay())) {
        dates.push(toLocalISODate(cur));
      }
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }, [classInfo.start_date, slot.weekdays, expectedSessions]);

  // Format session list for display: short DD/MM, dot-separated.
  // If <= 6 sessions: show all. Else: first 3 ... last 1.
  const sessionListText = useMemo(() => {
    if (sessionDates.length === 0) return "";
    const fmt = (iso: string) => {
      const d = new Date(iso + "T00:00:00");
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    };
    if (sessionDates.length <= 6) return sessionDates.map(fmt).join(" · ");
    const head = sessionDates.slice(0, 3).map(fmt).join(" · ");
    const tail = fmt(sessionDates[sessionDates.length - 1]);
    return `${head} ... ${tail}`;
  }, [sessionDates]);

  // Issue #A2 fix: hasMismatch chỉ fire khi user MANUAL OVERRIDE end_date
  const hasMismatch = expectedSessions != null
    && endDateManuallyOverridden
    && actualSessionCount > 0
    && actualSessionCount !== expectedSessions;
  const isExactMatch = expectedSessions != null && actualSessionCount > 0 && actualSessionCount === expectedSessions;
  const hasNoInputs = expectedSessions != null && actualSessionCount === 0;

  return (
    <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
      <div>
        <Label className="inline-flex items-center gap-1.5 text-sm font-semibold">
          Ngày kết thúc <span className="text-destructive">*</span>
        </Label>
        <Popover open={endCalOpen} onOpenChange={setEndCalOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={!classInfo.start_date}
              className={cn(
                "h-10 w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm flex items-center gap-2 transition-colors",
                "hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                "disabled:cursor-not-allowed disabled:opacity-50",
                !classInfo.end_date && "text-muted-foreground",
              )}
            >
              <CalendarDays className="h-4 w-4 opacity-70 shrink-0" />
              {endDateObj ? format(endDateObj, "dd/MM/yyyy", { locale: vi }) : "Chọn ngày kết thúc"}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDateObj}
              onSelect={(d) => {
                if (d) {
                  onEndDateChange(toLocalISODate(d));
                  setEndCalOpen(false);
                }
              }}
              disabled={(d) => !minEndDate || d < minEndDate}
              defaultMonth={minEndDate ?? undefined}
              locale={vi}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {!classInfo.start_date && (
          <p className="text-[11px] text-muted-foreground mt-1">
            Chọn ngày bắt đầu ở Step 1 trước.
          </p>
        )}
        {classInfo.start_date && expectedSessions != null && sessionsPerWeek === 0 && !endDateManuallyOverridden && (
          <p className="text-[11px] text-muted-foreground mt-1">
            💡 Chọn weekdays bên trên để tự động tính theo {expectedSessions} buổi (
            {planTotalHours ?? 0} hrs / {slotDurationMinutes} phút/buổi).
          </p>
        )}
        {classInfo.start_date && expectedSessions != null && sessionsPerWeek > 0 && !endDateManuallyOverridden && classInfo.end_date && (
          <div className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
            <p>
              ✨ Tự động: <strong className="text-foreground">{expectedSessions}</strong> buổi
              {" × "}
              <strong className="text-foreground">{sessionsPerWeek}</strong> ngày/tuần
              {" → "}kết thúc{" "}
              <strong className="text-foreground">{format(new Date(classInfo.end_date + "T00:00:00"), "dd/MM/yyyy")}</strong>
            </p>
            {sessionListText && (
              <p className="font-mono">
                📅 Buổi học: <span className="text-foreground">{sessionListText}</span>
              </p>
            )}
          </div>
        )}
        {expectedSessions != null && endDateManuallyOverridden && (
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[11px] text-amber-600 dark:text-amber-400">⚠️ Đã chỉnh thủ công</span>
            <button
              type="button"
              onClick={onEndDateAutoReset}
              className="text-[11px] underline text-blue-600 hover:text-blue-800 dark:text-blue-400"
            >
              Tính lại từ Study Plan
            </button>
          </div>
        )}
        {classInfo.start_date && expectedSessions == null && (
          <p className="text-[11px] text-muted-foreground mt-1">
            Lớp customized (không có template) — nhập ngày kết thúc thủ công.
          </p>
        )}
      </div>

      {/* F2.2 — count mismatch indicator. Issue #A2: only fires when overridden. */}
      {expectedSessions != null && (
        <div
          className={`rounded-lg border p-3 text-sm flex items-start gap-2 ${
            isExactMatch
              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-900 dark:text-emerald-200"
              : hasMismatch
              ? "border-amber-500/40 bg-amber-500/5 text-amber-900 dark:text-amber-200"
              : "border-muted bg-card text-muted-foreground"
          }`}
        >
          {isExactMatch ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          ) : hasMismatch ? (
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5 flex-1">
            <p className="font-semibold">
              {isExactMatch
                ? "✅ Khớp số giờ với Study Plan"
                : hasMismatch
                ? "⚠️ Số buổi không khớp Study Plan"
                : hasNoInputs
                ? "Chưa đủ dữ liệu để dự kiến"
                : ""}
            </p>
            {/* #C2-bis: flow order — Study Plan total → Slot config → Required result */}
            <p className="text-xs">
              📊 Study Plan: <strong className="tabular-nums">{planTotalHours ?? 0}</strong> hrs total
              {" "}({templateSessionCount ?? 0} buổi × {expectedDuration ?? 0} phút mỗi buổi)
            </p>
            <p className="text-xs">
              ⚙️ Slot: <strong className="tabular-nums">{slotDurationMinutes}</strong> phút
              {sessionsPerWeek > 0 && (
                <>
                  {" × "}
                  <strong className="tabular-nums">{sessionsPerWeek}</strong> ngày/tuần
                </>
              )}
            </p>
            <p className="text-xs">
              → Cần <strong className="tabular-nums">{expectedSessions ?? 0}</strong> buổi
              {classInfo.end_date && (
                <>
                  {" "}(kết thúc <strong>{format(new Date(classInfo.end_date + "T00:00:00"), "dd/MM/yyyy")}</strong>)
                </>
              )}
            </p>
            {hasMismatch && (
              <p className="text-xs">
                ⚠️ Sẽ tạo: <strong className="tabular-nums">{actualSessionCount}</strong> buổi
                {" · "}
                Khác: <strong className="tabular-nums">{actualSessionCount - (expectedSessions ?? 0) > 0 ? "+" : ""}{actualSessionCount - (expectedSessions ?? 0)}</strong>
              </p>
            )}
            {hasNoInputs && (
              <p className="text-[11px]">Chọn weekdays + ngày kết thúc để xem dự kiến.</p>
            )}
            {hasMismatch && (
              <p className="text-[11px]">
                💡 Sửa weekdays / ngày kết thúc để khớp, hoặc giữ và xác nhận ở Step cuối.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Issue #A4 — duration mismatch warning */}
      {durationMismatch && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm flex items-start gap-2 text-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="space-y-0.5 flex-1">
            <p className="font-semibold">⚠️ Thời lượng buổi học không khớp Study Plan</p>
            <p className="text-xs">
              Template: <strong className="tabular-nums">{expectedDuration}</strong> phút
              {" · "}
              Slot hiện tại: <strong className="tabular-nums">{slotDurationMinutes}</strong> phút
              {" · "}
              Khác: <strong className="tabular-nums">{slotDurationMinutes - (expectedDuration ?? 0) > 0 ? "+" : ""}{slotDurationMinutes - (expectedDuration ?? 0)}</strong> phút
            </p>
            <p className="text-[11px]">
              💡 Sửa giờ bắt đầu/kết thúc bên trên để khớp template, hoặc proceed nếu cố ý đổi thời lượng.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────── Score badge helpers ───────────── */

function scoreToneClass(score: number | undefined): string {
  if (score === undefined) return "bg-muted text-muted-foreground";
  if (score >= 3) return "bg-success/15 text-success border border-success/30";
  if (score >= 2) return "bg-primary/10 text-primary border border-primary/20";
  if (score >= 1) return "bg-warning/15 text-warning border border-warning/30";
  return "bg-muted text-muted-foreground border border-border";
}

function ScoreBadge({
  label, value, max, hint, icon,
}: {
  label: string; value?: number; max: number; hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <span
      title={hint}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${scoreToneClass(value)}`}
    >
      {icon}
      {label} {value ?? "—"}/{max}
    </span>
  );
}

/* ───────────── MODE A — slot v2 ───────────── */

function ModeAByTimeSlotV2({ classInfo, slot, setSlot, teachers, setTeachers }: Props) {
  const [searchTriggered, setSearchTriggered] = useState(false);

  const params = searchTriggered && slot.weekdays.length > 0
    ? {
        weekdays: slot.weekdays,
        start_time: slot.start_time,
        end_time: slot.end_time,
        mode: slot.mode,
        program_key: classInfo.program || null,
        level_key: classInfo.level || null,
      }
    : null;

  const { data: matched, isFetching, error } = useAvailableTeachersV2(params);

  const toggleWeekday = (wd: number) => {
    const next = slot.weekdays.includes(wd) ? slot.weekdays.filter((x) => x !== wd) : [...slot.weekdays, wd].sort();
    setSlot({ ...slot, weekdays: next });
  };

  const toggleTeacher = (tid: string, full_name: string) => {
    const exists = teachers.find((t) => t.teacher_id === tid);
    if (exists) setTeachers(teachers.filter((t) => t.teacher_id !== tid));
    else setTeachers([...teachers, { teacher_id: tid, full_name, role: teachers.length === 0 ? "primary" : "ta" }]);
  };

  const setRole = (tid: string, role: "primary" | "ta") => {
    setTeachers(teachers.map((t) => (t.teacher_id === tid ? { ...t, role } : t)));
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="mb-2 block">Các thứ trong tuần</Label>
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_LABELS.map((d) => {
            const checked = slot.weekdays.includes(d.value);
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleWeekday(d.value)}
                className={`px-3 py-1.5 rounded-full border text-sm font-medium transition ${
                  checked ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent/40"
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label>Giờ bắt đầu</Label>
          <Input type="time" value={slot.start_time} onChange={(e) => setSlot({ ...slot, start_time: e.target.value })} />
        </div>
        <div>
          <Label>Giờ kết thúc</Label>
          <Input type="time" value={slot.end_time} onChange={(e) => setSlot({ ...slot, end_time: e.target.value })} />
        </div>
        <div>
          <Label>Hình thức</Label>
          <Select value={slot.mode} onValueChange={(v) => setSlot({ ...slot, mode: v as DeliveryMode })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        type="button"
        onClick={() => setSearchTriggered(true)}
        disabled={slot.weekdays.length === 0 || !slot.start_time || !slot.end_time}
      >
        <Search className="h-4 w-4" /> Tìm giáo viên có lịch trùng
      </Button>

      {error && (
        <p className="text-sm text-destructive">Lỗi: {(error as Error).message}</p>
      )}

      {isFetching && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tìm…
        </div>
      )}

      {searchTriggered && !isFetching && matched && matched.length === 0 && (
        <div className="rounded-lg border bg-muted/40 p-4 text-sm">
          Không có giáo viên rảnh khung này. Thử khung khác hoặc dùng tab "Theo doanh thu".
        </div>
      )}

      {matched && matched.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground">
            Sắp xếp theo điểm tổng (capability ×3 + workload + revenue − 5 nếu trùng lịch). Càng cao càng phù hợp.
          </p>
          <div className="border rounded-lg divide-y">
            {matched.map((t: AvailableTeacherV2, idx) => {
              const assigned = teachers.find((x) => x.teacher_id === t.teacher_id);
              const ruleTime = t.rule_start && t.rule_end
                ? `${t.rule_start.slice(0, 5)}–${t.rule_end.slice(0, 5)}`
                : null;
              return (
                <div key={t.teacher_id} className="p-3 flex items-start gap-3">
                  <Checkbox
                    className="mt-1"
                    checked={!!assigned}
                    onCheckedChange={() => toggleTeacher(t.teacher_id, t.full_name)}
                  />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {idx === 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/15 text-success px-2 py-0.5 text-[10px] font-semibold border border-success/30">
                          <Sparkles className="h-3 w-3" /> Top match
                        </span>
                      )}
                      <span className="font-medium text-sm">{t.full_name}</span>
                      <span className="text-[11px] text-muted-foreground">
                        Điểm: <strong className="text-foreground tabular-nums">{t.total_score ?? "—"}</strong>
                      </span>
                      {t.has_conflict && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-[10px] font-semibold">
                          <AlertTriangle className="h-3 w-3" /> Trùng lịch
                        </span>
                      )}
                      {t.is_new_teacher && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold border border-primary/20">
                          GV mới
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <ScoreBadge
                        label="Năng lực"
                        value={t.capability_match_score}
                        max={3}
                        icon={<Award className="h-3 w-3" />}
                        hint="3 = khớp program + level, 2 = chỉ program, 1 = fuzzy, 0 = chưa khai báo"
                      />
                      <ScoreBadge
                        label="Tải"
                        value={t.workload_score}
                        max={3}
                        hint={`Số buổi 28 ngày tới: ${t.sessions_next_28d ?? 0}. 3 = rất rảnh, 0 = quá tải`}
                      />
                      <ScoreBadge
                        label="Lương 6mo"
                        value={t.revenue_score}
                        max={3}
                        icon={<Wallet className="h-3 w-3" />}
                        hint={`Avg 6 tháng: ${fmtVND(t.avg_gross_vnd_6mo)}/tháng. Càng thấp càng cần thêm lớp.`}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {ruleTime && <span>Khung rảnh: {ruleTime}</span>}
                      {t.rule_mode && <span> · {t.rule_mode}</span>}
                      {t.email && <span> · {t.email}</span>}
                    </div>
                  </div>
                  {assigned && (
                    <Select value={assigned.role} onValueChange={(v) => setRole(t.teacher_id, v as "primary" | "ta")}>
                      <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primary">Primary</SelectItem>
                        <SelectItem value="ta">TA</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!searchTriggered && (
        <p className="text-xs text-muted-foreground">Chọn khung thời gian rồi bấm "Tìm giáo viên" để xem danh sách (có chấm điểm).</p>
      )}
    </div>
  );
}

/* ───────────── MODE Revenue (NEW) ───────────── */

function ModeRevenueBased({ classInfo, teachers, setTeachers, setScheduleMode }: Props) {
  const [filterByProgram, setFilterByProgram] = useState(true);
  const { data, isFetching, error } = useLowestRevenueTeachers({
    limit: 15,
    program_key: filterByProgram && classInfo.program ? classInfo.program : null,
  });

  const pickAndContinue = (teacher_id: string, full_name: string) => {
    if (!teachers.find((t) => t.teacher_id === teacher_id)) {
      setTeachers([
        ...teachers,
        { teacher_id, full_name, role: teachers.length === 0 ? "primary" : "ta" },
      ]);
    }
    setScheduleMode("by-teacher");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
        <p className="font-medium text-foreground inline-flex items-center gap-1">
          <TrendingDown className="h-3.5 w-3.5" /> Suggest theo doanh thu thấp nhất
        </p>
        <p className="text-muted-foreground">
          Danh sách giáo viên có lương trung bình 6 tháng gần nhất (không tính tháng hiện tại) thấp nhất —
          giáo viên mới chưa có bảng lương được ưu tiên đứng đầu. Chọn 1 giáo viên để chuyển sang tab "Theo giáo viên" và xem khung giờ rảnh của họ.
        </p>
      </div>

      <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
        <Checkbox
          checked={filterByProgram}
          onCheckedChange={(v) => setFilterByProgram(v === true)}
          disabled={!classInfo.program}
        />
        Chỉ hiển thị GV dạy được program <strong className="text-foreground">{classInfo.program || "(chưa chọn)"}</strong>
      </label>

      {error && <p className="text-sm text-destructive">Lỗi: {(error as Error).message}</p>}

      {isFetching && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
        </div>
      )}

      {!isFetching && data && data.length === 0 && (
        <div className="rounded-lg border bg-muted/40 p-4 text-sm">
          Không có giáo viên phù hợp. Bỏ filter program hoặc chọn tab khác.
        </div>
      )}

      {data && data.length > 0 && (
        <div className="border rounded-lg divide-y">
          {data.map((t, idx) => {
            const assigned = teachers.find((x) => x.teacher_id === t.teacher_id);
            return (
              <div key={t.teacher_id} className="p-3 flex items-center gap-3">
                <span className="w-6 text-center text-xs text-muted-foreground tabular-nums font-medium">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm">{t.full_name}</span>
                    {t.is_new_teacher ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold border border-primary/20">
                        GV mới — chưa có bảng lương
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-border">
                        Avg 6mo: {fmtVND(t.avg_gross_vnd_6mo)}
                      </span>
                    )}
                  </div>
                  {t.email && <div className="text-xs text-muted-foreground">{t.email}</div>}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={assigned ? "outline" : "default"}
                  onClick={() => pickAndContinue(t.teacher_id, t.full_name)}
                >
                  {assigned ? "Đã chọn → tiếp tục" : "Chọn"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ───────────── MODE B (unchanged from v1) ───────────── */

function ModeBByTeacher({ classInfo, slot, setSlot, teachers, setTeachers, selectedSlotKeys, setSelectedSlotKeys }: Props) {
  const teachersListQ = useQuery({
    queryKey: ["all-teachers-for-wizard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("id, full_name, status")
        .eq("status", "active")
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
  });

  const slotsParams = teachers.length > 0 && classInfo.start_date && classInfo.end_date
    ? { teacher_ids: teachers.map((t) => t.teacher_id), from_date: classInfo.start_date, to_date: classInfo.end_date, program_key: classInfo.program || null }
    : null;

  const { data: slots, isFetching } = useTeacherSlots(slotsParams);

  const addTeacher = (tid: string) => {
    if (teachers.find((t) => t.teacher_id === tid)) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const found = (teachersListQ.data || []).find((x: any) => x.id === tid);
    if (!found) return;
    setTeachers([...teachers, { teacher_id: tid, full_name: found.full_name, role: teachers.length === 0 ? "primary" : "ta" }]);
  };

  const removeTeacher = (tid: string) => setTeachers(teachers.filter((t) => t.teacher_id !== tid));

  const setRole = (tid: string, role: "primary" | "ta") => {
    setTeachers(teachers.map((t) => (t.teacher_id === tid ? { ...t, role } : t)));
  };

  const slotKey = (s: { weekday: number; start_time: string; end_time: string; mode?: string | null }) =>
    `${s.weekday}|${s.start_time}|${s.end_time}|${s.mode ?? ""}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toggleSlot = (s: any) => {
    const k = slotKey(s);
    if (selectedSlotKeys.includes(k)) setSelectedSlotKeys(selectedSlotKeys.filter((x) => x !== k));
    else {
      setSelectedSlotKeys([...selectedSlotKeys, k]);
      setSlot({
        weekdays: Array.from(new Set([...slot.weekdays, s.weekday])).sort(),
        start_time: slot.start_time || s.start_time,
        end_time: slot.end_time || s.end_time,
        mode: (s.mode as DeliveryMode) || slot.mode,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Chọn giáo viên</Label>
        <Select onValueChange={addTeacher} value="">
          <SelectTrigger><SelectValue placeholder="Thêm giáo viên…" /></SelectTrigger>
          <SelectContent>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(teachersListQ.data || []).map((t: any) => (
              <SelectItem key={t.id} value={t.id} disabled={!!teachers.find((x) => x.teacher_id === t.id)}>
                {t.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {teachers.length > 0 && (
        <div className="border rounded-lg divide-y">
          {teachers.map((t) => (
            <div key={t.teacher_id} className="p-3 flex items-center gap-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-sm font-medium">{t.full_name}</span>
              <Select value={t.role} onValueChange={(v) => setRole(t.teacher_id, v as "primary" | "ta")}>
                <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="ta">TA</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" size="sm" variant="ghost" onClick={() => removeTeacher(t.teacher_id)}>Xoá</Button>
            </div>
          ))}
        </div>
      )}

      {teachers.length > 0 && (
        <div>
          <Label className="mb-2 block">
            Khung giờ rảnh {teachers.length > 1 ? `(intersection — ${teachers.length} giáo viên đều rảnh)` : ""}
          </Label>
          {isFetching && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải khung giờ…
            </div>
          )}
          {!isFetching && slots && slots.length === 0 && (
            <div className="rounded-lg border bg-muted/40 p-4 text-sm">Không có khung giờ chung.</div>
          )}
          {slots && slots.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {slots.map((s) => {
                const k = slotKey(s);
                const checked = selectedSlotKeys.includes(k);
                const wdLabel = WEEKDAY_LABELS.find((x) => x.value === s.weekday)?.label ?? `Wd${s.weekday}`;
                return (
                  <label key={k} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${checked ? "border-primary bg-primary/5" : ""}`}>
                    <Checkbox checked={checked} onCheckedChange={() => toggleSlot(s)} />
                    <span className="text-sm">
                      <span className="font-medium">{wdLabel}</span> {s.start_time}–{s.end_time}
                      {s.mode && <span className="text-muted-foreground ml-2">({s.mode})</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
