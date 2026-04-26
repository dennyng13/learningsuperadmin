// Local types for Stage 2 Timesheet (admin portal).
// Mirrors SQL definitions in
// ieltspractice/supabase/migrations/20260501_stage_2_timesheet.sql
// until `npm run sync:types` regenerates Database['public'].

export type TimesheetPeriodStatus =
  | "open"
  | "submitted"
  | "revision_requested"
  | "approved"
  | "locked";

export type TimesheetEntryStatus =
  | "planned"
  | "taught"
  | "cancelled"
  | "teacher_absent"
  | "substituted";

export interface TimesheetPeriodListItem {
  id: string;
  teacher_id: string;
  teacher_full_name: string;
  month_start: string; // ISO date "YYYY-MM-01"
  status: TimesheetPeriodStatus;
  submitted_at: string | null;
  approved_at: string | null;
  locked_at: string | null;
  total_minutes: number;
  total_taught_count: number;
  pending_count: number;
  admin_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimesheetEntryRow {
  id: string;
  period_id: string;
  class_session_id: string | null;
  class_id: string | null;
  class_name_snapshot: string | null;
  entry_date: string;
  planned_start: string;
  planned_end: string;
  actual_start: string | null;
  actual_end: string | null;
  duration_minutes: number;
  status: TimesheetEntryStatus;
  substitute_teacher_id: string | null;
  substitute_teacher_name: string | null;
  notes: string | null;
  reason: string | null;
  confirmed_at: string | null;
}

export interface TimesheetPeriodWithEntries {
  period: {
    id: string;
    teacher_id: string;
    teacher_full_name: string | null;
    month_start: string;
    status: TimesheetPeriodStatus;
    submitted_at: string | null;
    approved_at: string | null;
    locked_at: string | null;
    admin_message: string | null;
    total_minutes: number;
    total_taught_count: number;
    created_at: string;
    updated_at: string;
  };
  entries: TimesheetEntryRow[];
}

export const TIMESHEET_PERIOD_STATUS_LABELS: Record<TimesheetPeriodStatus, string> = {
  open: "Đang mở",
  submitted: "Đã gửi",
  revision_requested: "Yêu cầu sửa",
  approved: "Đã duyệt",
  locked: "Đã khoá",
};

export const TIMESHEET_ENTRY_STATUS_LABELS: Record<TimesheetEntryStatus, string> = {
  planned: "Chưa xác nhận",
  taught: "Đã dạy",
  cancelled: "Lớp huỷ",
  teacher_absent: "GV vắng",
  substituted: "Có người dạy thay",
};
