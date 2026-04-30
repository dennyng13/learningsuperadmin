export interface WizardClassInfo {
  class_name: string;
  course_title: string;
  /** uuid trỏ vào `courses.id` — chỉ set khi program có courses (hiện tại chỉ
   *  IELTS) và admin pick. Wizard gọi `set_class_course_id` post-create để
   *  gắn class với course. WRE/Customized: luôn null (Course dropdown ẩn). */
  course_id: string | null;
  /** Backend program_key — lowercase: "ielts" | "wre" | "customized". */
  program: string;
  level: string;              // empty for non-IELTS
  /** FORMAT của lớp (KHÔNG phải delivery mode):
   *   - standard: lớp tiêu chuẩn (nhiều HV)
   *   - private: lớp 1-1 (gia sư riêng)
   *  Delivery mode (onsite/online/hybrid) là `slot.mode` ở Step 2. */
  class_type: "standard" | "private";
  start_date: string;         // YYYY-MM-DD
  end_date: string;
  max_students: number | null;
  description: string;
  study_plan_id: string | null;
  leaderboard_enabled: boolean;
  /** uuid trỏ vào `rooms.id` — set khi admin pick room ở Step 3 wizard.
   *  Wired vào p_sessions[].room_id payload của create_class_atomic. */
  room_id: string | null;
  /** True khi user override warning để chọn room có buổi conflict. */
  room_force_conflict: boolean;
}

export type ScheduleMode = "by-slot" | "by-revenue" | "by-teacher";
export type DeliveryMode = "online" | "offline" | "hybrid";
export type TeacherRole = "primary" | "ta";

export interface WizardSlot {
  weekdays: number[];   // Backend convention: Sun=0, Mon=1..Sat=6
  start_time: string;   // "HH:MM"
  end_time: string;
  mode: DeliveryMode;
}

export interface AssignedTeacher {
  teacher_id: string;
  full_name: string;
  role: TeacherRole;
}

export interface DraftSession {
  id: string;            // local uid
  session_date: string;  // YYYY-MM-DD
  weekday: number;
  start_time: string;
  end_time: string;
  mode: DeliveryMode;
  room: string;
  teacher_id: string;
  cancelled: boolean;
}

export const EMPTY_CLASS_INFO: WizardClassInfo = {
  class_name: "",
  course_title: "",
  course_id: null,
  program: "",
  level: "",
  class_type: "standard",
  start_date: "",
  end_date: "",
  max_students: null,
  description: "",
  study_plan_id: null,
  leaderboard_enabled: false,
  room_id: null,
  room_force_conflict: false,
};

// Display order T2..CN; values follow backend convention (Sun=0..Sat=6).
export const WEEKDAY_LABELS: { value: number; label: string }[] = [
  { value: 1, label: "T2" },
  { value: 2, label: "T3" },
  { value: 3, label: "T4" },
  { value: 4, label: "T5" },
  { value: 5, label: "T6" },
  { value: 6, label: "T7" },
  { value: 0, label: "CN" },
];

// Convert wizard numeric weekday (Sun=0..Sat=6) → key string ('sun'/'mon'/...)
// matching study_plan_templates.schedule_pattern.days format used by the
// create_class_with_template_atomic RPC and CloneTemplateDialog.
export const WEEKDAY_KEY_MAP: Record<number, string> = {
  0: "sun",
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: "sat",
};

/** Generate sessions between start..end for given weekdays + times, default
 *  teacher = first primary. Per-session `room` text defaults to "" — admin có
 *  thể override per-session ở Step 4 Sessions Preview, hoặc gán room_id qua
 *  Step 3 RoomPicker (FK level class). Optional `maxSessions` cap loop early
 *  để defensive-stop khi đã đủ buổi (avoid generating beyond Study Plan
 *  total_sessions ngay cả khi end_date dài hơn mức cần). */
export function generateSessions(
  startDate: string,
  endDate: string,
  weekdays: number[],
  startTime: string,
  endTime: string,
  mode: DeliveryMode,
  defaultTeacherId: string,
  maxSessions?: number,
): DraftSession[] {
  if (!startDate || !endDate || weekdays.length === 0) return [];
  const out: DraftSession[] = [];
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    // JS getDay returns 0=Sun..6=Sat — already matches backend convention.
    const wd = d.getDay();
    if (!weekdays.includes(wd)) continue;
    out.push({
      id: `${d.toISOString().slice(0, 10)}-${startTime}`,
      session_date: d.toISOString().slice(0, 10),
      weekday: wd,
      start_time: startTime,
      end_time: endTime,
      mode,
      room: "",
      teacher_id: defaultTeacherId,
      cancelled: false,
    });
    if (maxSessions != null && out.length >= maxSessions) break;
  }
  return out;
}

/** Compute end_date sao cho count buổi (matching weekdays) từ startDate đạt
 *  totalSessions. Trả về startDate nếu không tính được (invalid input). Safety
 *  bound 730 days (~2 years) để tránh infinite loop nếu weekdays config sai. */
export function computeEndDateForSessions(
  startDate: string,
  weekdays: number[],
  totalSessions: number,
): string {
  if (!startDate || weekdays.length === 0 || totalSessions <= 0) return startDate;
  const cur = new Date(startDate + "T00:00:00");
  if (Number.isNaN(cur.getTime())) return startDate;
  let count = 0;
  for (let i = 0; i < 730; i++) {
    if (weekdays.includes(cur.getDay())) {
      count++;
      if (count === totalSessions) return cur.toISOString().slice(0, 10);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return startDate;
}

/** Walk BACKWARD từ endDate để compute start_date — sao cho count buổi đạt
 *  totalSessions giữa start..end với weekdays đã chọn. Dùng khi user đổi
 *  end_date manual và chọn "Tự động đổi ngày khai giảng" để giữ N buổi. */
export function computeStartDateForSessions(
  endDate: string,
  weekdays: number[],
  totalSessions: number,
): string {
  if (!endDate || weekdays.length === 0 || totalSessions <= 0) return endDate;
  const cur = new Date(endDate + "T00:00:00");
  if (Number.isNaN(cur.getTime())) return endDate;
  let count = 0;
  for (let i = 0; i < 730; i++) {
    if (weekdays.includes(cur.getDay())) {
      count++;
      if (count === totalSessions) return cur.toISOString().slice(0, 10);
    }
    cur.setDate(cur.getDate() - 1);
  }
  return endDate;
}