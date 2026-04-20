import { differenceInCalendarDays, format, parseISO, startOfWeek, endOfWeek } from "date-fns";
import type {
  AvailabilityMode,
  AvailabilityValidationResult,
  BusyBlock,
  CandidateMatchResult,
  TeachngoClassLite,
  TeacherAvailabilityDraft,
  TeacherAvailabilityException,
  TeacherAvailabilityRule,
  TeacherCapability,
  TeacherRecordLite,
} from "@shared/types/availability";

export const WEEKDAY_LABELS: Record<number, string> = {
  0: "CN",
  1: "T2",
  2: "T3",
  3: "T4",
  4: "T5",
  5: "T6",
  6: "T7",
};

const WEEKDAY_FROM_TOKEN: Record<string, number> = {
  CN: 0,
  T2: 1,
  T3: 2,
  T4: 3,
  T5: 4,
  T6: 5,
  T7: 6,
};

export function normalizeTime(raw?: string | null): string {
  if (!raw) return "00:00";
  const text = raw.trim();
  const match = text.match(/(\d{1,2})[:hH](\d{2})/);
  if (match) {
    return `${match[1].padStart(2, "0")}:${match[2]}`;
  }
  const simple = text.match(/^(\d{1,2})$/);
  if (simple) return `${simple[1].padStart(2, "0")}:00`;
  return text.slice(0, 5);
}

export function timeToMinutes(value?: string | null): number {
  const normalized = normalizeTime(value);
  const [h, m] = normalized.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function overlaps(startA: string, endA: string, startB: string, endB: string): boolean {
  const a1 = timeToMinutes(startA);
  const a2 = timeToMinutes(endA);
  const b1 = timeToMinutes(startB);
  const b2 = timeToMinutes(endB);
  return a1 < b2 && b1 < a2;
}

export function covers(slotStart: string, slotEnd: string, desiredStart: string, desiredEnd: string): boolean {
  const s1 = timeToMinutes(slotStart);
  const s2 = timeToMinutes(slotEnd);
  const d1 = timeToMinutes(desiredStart);
  const d2 = timeToMinutes(desiredEnd);
  return s1 <= d1 && d2 <= s2;
}

export function modeMatches(slotMode?: AvailabilityMode | null, requestedMode?: AvailabilityMode | null): boolean {
  if (!requestedMode || requestedMode === "hybrid") return true;
  if (!slotMode || slotMode === "hybrid") return true;
  return slotMode === requestedMode;
}

function parseWeekdayTokens(schedule?: string | null): number[] {
  const tokens = (schedule || "").toUpperCase().match(/CN|T[2-7]/g) || [];
  return [...new Set(tokens.map((token) => WEEKDAY_FROM_TOKEN[token]).filter((v) => v !== undefined))];
}

function parseScheduleTimeRange(schedule?: string | null, fallbackStart?: string | null, fallbackEnd?: string | null) {
  const match = (schedule || "").match(/(\d{1,2}[:hH]\d{2})\s*[-–]\s*(\d{1,2}[:hH]\d{2})/);
  return {
    start_time: normalizeTime(match?.[1] || fallbackStart || null),
    end_time: normalizeTime(match?.[2] || fallbackEnd || null),
  };
}

export function parseTeachngoSchedule(schedule?: string | null, fallbackStart?: string | null, fallbackEnd?: string | null) {
  const weekdays = parseWeekdayTokens(schedule);
  const timeRange = parseScheduleTimeRange(schedule, fallbackStart, fallbackEnd);
  if (!weekdays.length || !timeRange.start_time || !timeRange.end_time) return [] as Array<Pick<BusyBlock, "weekday" | "start_time" | "end_time">>;
  return weekdays.map((weekday) => ({ weekday, start_time: timeRange.start_time, end_time: timeRange.end_time }));
}

export function normalizeRules(input: unknown, teacherId?: string): TeacherAvailabilityRule[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((row: any) => ({
      id: row?.id,
      teacher_id: row?.teacher_id || teacherId,
      weekday: Number(row?.weekday),
      start_time: normalizeTime(row?.start_time),
      end_time: normalizeTime(row?.end_time),
      effective_from: row?.effective_from,
      effective_to: row?.effective_to || null,
      mode: row?.mode || "hybrid",
      note: row?.note || null,
    }))
    .filter((row) => Number.isInteger(row.weekday) && row.weekday >= 0 && row.weekday <= 6 && !!row.effective_from && row.start_time < row.end_time);
}

export function normalizeExceptions(input: unknown, teacherId?: string): TeacherAvailabilityException[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((row: any) => ({
      id: row?.id,
      teacher_id: row?.teacher_id || teacherId,
      exception_date: row?.exception_date || row?.date,
      action: row?.action === "available" ? "available" : "unavailable",
      start_time: normalizeTime(row?.start_time),
      end_time: normalizeTime(row?.end_time),
      mode: row?.mode || "hybrid",
      note: row?.note || null,
    }))
    .filter((row) => !!row.exception_date && row.start_time < row.end_time);
}

function extractSessionDate(row: any): string | null {
  return row?.session_date || row?.entry_date || row?.date || row?.class_date || null;
}

function extractSessionStart(row: any): string | null {
  return normalizeTime(row?.start_time || row?.starts_at || row?.start || null);
}

function extractSessionEnd(row: any): string | null {
  return normalizeTime(row?.end_time || row?.ends_at || row?.end || null);
}

export function isRuleActiveOnDate(rule: TeacherAvailabilityRule, date: string): boolean {
  if (date < rule.effective_from) return false;
  if (rule.effective_to && date > rule.effective_to) return false;
  return true;
}

export function getTeacherBusyBlocks(
  teacherId: string,
  classes: TeachngoClassLite[],
  classSessions: any[],
): BusyBlock[] {
  const teacherClasses = classes.filter((cls) => cls.teacher_id === teacherId && (cls.status ?? "active") !== "archived");
  const classMap = new Map(teacherClasses.map((cls) => [cls.id, cls]));
  const recurringBusy = teacherClasses.flatMap((cls) =>
    parseTeachngoSchedule(cls.schedule, cls.default_start_time, cls.default_end_time).map((slot) => ({
      source: "class_schedule" as const,
      class_id: cls.id,
      class_name: cls.class_name,
      teacher_id: teacherId,
      weekday: slot.weekday,
      start_time: slot.start_time,
      end_time: slot.end_time,
      level: cls.level,
      program: cls.program,
      room: cls.room,
    })),
  );

  const datedBusy = (classSessions || [])
    .map((session: any) => {
      const cls = classMap.get(session?.class_id);
      const sessionTeacherId = session?.teacher_id || cls?.teacher_id;
      const date = extractSessionDate(session);
      const start_time = extractSessionStart(session);
      const end_time = extractSessionEnd(session);
      if (!cls || sessionTeacherId !== teacherId || !date || !start_time || !end_time) return null;
      return {
        source: "class_session" as const,
        class_id: cls.id,
        class_name: cls.class_name,
        teacher_id: teacherId,
        date,
        weekday: new Date(`${date}T00:00:00`).getDay(),
        start_time,
        end_time,
        level: cls.level,
        program: cls.program,
        room: session?.room || cls.room,
      } satisfies BusyBlock;
    })
    .filter(Boolean) as BusyBlock[];

  return [...datedBusy, ...recurringBusy];
}

export function validateAvailabilityDraft(
  draft: Pick<TeacherAvailabilityDraft, "effective_from" | "teacher_id" | "availability_rules">,
  classes: TeachngoClassLite[],
  classSessions: any[],
): AvailabilityValidationResult {
  const rules = normalizeRules(draft.availability_rules, draft.teacher_id);
  const busyBlocks = getTeacherBusyBlocks(draft.teacher_id, classes, classSessions);
  const today = format(new Date(), "yyyy-MM-dd");
  const lead_time_days = differenceInCalendarDays(parseISO(draft.effective_from), parseISO(today));
  const conflicts: BusyBlock[] = [];

  for (const rule of rules) {
    for (const busy of busyBlocks) {
      const sameWeekday = busy.weekday === rule.weekday;
      const datedConflict = !!busy.date && busy.date >= draft.effective_from && isRuleActiveOnDate(rule, busy.date);
      const recurringConflict = !busy.date && sameWeekday;
      if (!(datedConflict || recurringConflict)) continue;
      if (!overlaps(rule.start_time, rule.end_time, busy.start_time, busy.end_time)) continue;
      conflicts.push(busy);
    }
  }

  return {
    lead_time_days,
    lead_time_ok: lead_time_days >= 14,
    conflicts,
    conflict_count: conflicts.length,
    can_apply: lead_time_days >= 14 && conflicts.length === 0,
  };
}

export function isTeacherAvailableForSlot(args: {
  teacher: TeacherRecordLite;
  date: string;
  start_time: string;
  end_time: string;
  mode?: AvailabilityMode | null;
  rules: TeacherAvailabilityRule[];
  exceptions: TeacherAvailabilityException[];
  classes: TeachngoClassLite[];
  classSessions: any[];
}): { ok: boolean; conflicts: BusyBlock[]; reason?: string } {
  const weekday = new Date(`${args.date}T00:00:00`).getDay();
  const teacherRules = args.rules.filter((rule) => rule.teacher_id === args.teacher.id);
  const teacherExceptions = args.exceptions.filter((item) => item.teacher_id === args.teacher.id && item.exception_date === args.date);

  const explicitAvailable = teacherExceptions.some((item) => item.action === "available" && covers(item.start_time, item.end_time, args.start_time, args.end_time) && modeMatches(item.mode, args.mode));
  const availableByRule = teacherRules.some((rule) => rule.weekday === weekday && isRuleActiveOnDate(rule, args.date) && covers(rule.start_time, rule.end_time, args.start_time, args.end_time) && modeMatches(rule.mode, args.mode));
  const blockedByException = teacherExceptions.some((item) => item.action === "unavailable" && overlaps(item.start_time, item.end_time, args.start_time, args.end_time));

  if (!(explicitAvailable || availableByRule) || blockedByException) {
    return { ok: false, conflicts: [], reason: blockedByException ? "Có exception chặn slot này" : "Ngoài lịch rảnh đã đăng ký" };
  }

  const busyBlocks = getTeacherBusyBlocks(args.teacher.id, args.classes, args.classSessions).filter((busy) => {
    if (busy.date && busy.date !== args.date) return false;
    if (!busy.date && busy.weekday !== weekday) return false;
    return overlaps(args.start_time, args.end_time, busy.start_time, busy.end_time);
  });

  if (busyBlocks.length > 0) {
    return { ok: false, conflicts: busyBlocks, reason: "Trùng lịch lớp đang dạy" };
  }

  return { ok: true, conflicts: [] };
}

function textIncludes(source: string | null | undefined, target: string | null | undefined) {
  if (!source || !target) return false;
  return source.toLowerCase().includes(target.toLowerCase());
}

export function teacherMatchesCapability(args: {
  teacher: TeacherRecordLite;
  capability?: TeacherCapability | null;
  level?: string | null;
  program?: string | null;
  mode?: AvailabilityMode | null;
}): { ok: boolean; reasons: string[]; blockingReason?: string } {
  const reasons: string[] = [];
  const cap = args.capability;
  const level = args.level?.trim();
  const program = args.program?.trim();
  const mode = args.mode;

  if (level) {
    const capLevels = cap?.level_keys?.map((item) => item.toLowerCase()) || [];
    const levelOk = capLevels.length > 0 ? capLevels.includes(level.toLowerCase()) : textIncludes(args.teacher.classes, level) || textIncludes(args.teacher.subjects, level);
    if (!levelOk) return { ok: false, reasons, blockingReason: `Chưa khai báo dạy được level ${level}` };
    reasons.push(`Dạy được level ${level}`);
  }

  if (program) {
    const capPrograms = cap?.program_keys?.map((item) => item.toLowerCase()) || [];
    const programOk = capPrograms.length > 0 ? capPrograms.includes(program.toLowerCase()) : textIncludes(args.teacher.classes, program) || textIncludes(args.teacher.subjects, program);
    if (!programOk) return { ok: false, reasons, blockingReason: `Chưa khai báo dạy chương trình ${program}` };
    reasons.push(`Khớp chương trình ${program}`);
  }

  if (mode === "online" && cap?.can_teach_online === false) {
    return { ok: false, reasons, blockingReason: "Không nhận dạy online" };
  }
  if (mode === "offline" && cap?.can_teach_offline === false) {
    return { ok: false, reasons, blockingReason: "Không nhận dạy offline" };
  }
  if (mode === "online") reasons.push("Nhận dạy online");
  if (mode === "offline") reasons.push("Nhận dạy offline");

  return { ok: true, reasons };
}

export function getTeacherWorkload(teacherId: string, classes: TeachngoClassLite[], classSessions: any[], targetDate?: string) {
  const activeClassCount = classes.filter((cls) => cls.teacher_id === teacherId && (cls.status ?? "active") === "active").length;
  if (!targetDate) return { activeClassCount, weeklyMinutes: 0 };
  const weekStart = format(startOfWeek(new Date(`${targetDate}T00:00:00`), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(new Date(`${targetDate}T00:00:00`), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weeklyMinutes = (classSessions || []).reduce((sum: number, row: any) => {
    const date = extractSessionDate(row);
    const start = extractSessionStart(row);
    const end = extractSessionEnd(row);
    if (!date || date < weekStart || date > weekEnd) return sum;
    if ((row?.teacher_id || null) !== teacherId) return sum;
    if (!start || !end) return sum;
    return sum + Math.max(0, timeToMinutes(end) - timeToMinutes(start));
  }, 0);
  return { activeClassCount, weeklyMinutes };
}

export function matchTeachersForClassOpening(args: {
  teachers: TeacherRecordLite[];
  capabilities: TeacherCapability[];
  rules: TeacherAvailabilityRule[];
  exceptions: TeacherAvailabilityException[];
  classes: TeachngoClassLite[];
  classSessions: any[];
  date: string;
  start_time: string;
  end_time: string;
  level?: string | null;
  program?: string | null;
  mode?: AvailabilityMode | null;
}) {
  const capabilityMap = new Map(args.capabilities.map((item) => [item.teacher_id, item]));
  const candidates: CandidateMatchResult[] = [];

  for (const teacher of args.teachers.filter((item) => (item.status ?? "active") !== "inactive")) {
    const capability = capabilityMap.get(teacher.id) || null;
    const skillCheck = teacherMatchesCapability({ teacher, capability, level: args.level, program: args.program, mode: args.mode });
    if (!skillCheck.ok) continue;

    const availabilityCheck = isTeacherAvailableForSlot({
      teacher,
      date: args.date,
      start_time: args.start_time,
      end_time: args.end_time,
      mode: args.mode,
      rules: args.rules,
      exceptions: args.exceptions,
      classes: args.classes,
      classSessions: args.classSessions,
    });
    if (!availabilityCheck.ok) continue;

    const workload = getTeacherWorkload(teacher.id, args.classes, args.classSessions, args.date);
    candidates.push({
      teacher,
      capability,
      activeClassCount: workload.activeClassCount,
      weeklyMinutes: workload.weeklyMinutes,
      matchingReasons: [...skillCheck.reasons, "Khớp lịch rảnh"],
      availabilityOk: true,
      conflicts: availabilityCheck.conflicts,
    });
  }

  return candidates.sort((a, b) => {
    if (a.activeClassCount !== b.activeClassCount) return a.activeClassCount - b.activeClassCount;
    if (a.weeklyMinutes !== b.weeklyMinutes) return a.weeklyMinutes - b.weeklyMinutes;
    return a.teacher.full_name.localeCompare(b.teacher.full_name, "vi");
  });
}

export function describeRule(rule: TeacherAvailabilityRule) {
  return `${WEEKDAY_LABELS[rule.weekday]} · ${normalizeTime(rule.start_time)}–${normalizeTime(rule.end_time)} · ${rule.mode || "hybrid"}`;
}

export function describeException(item: TeacherAvailabilityException) {
  return `${item.exception_date} · ${normalizeTime(item.start_time)}–${normalizeTime(item.end_time)} · ${item.action === "available" ? "mở thêm" : "nghỉ"}`;
}

export function relationMissing(error: unknown) {
  const message = typeof error === "object" && error && "message" in error ? String((error as any).message) : "";
  return /does not exist|could not find the table|schema cache/i.test(message.toLowerCase());
}
