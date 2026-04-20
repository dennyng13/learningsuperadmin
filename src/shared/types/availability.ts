export type AvailabilityMode = "online" | "offline" | "hybrid";
export type AvailabilityExceptionAction = "available" | "unavailable";
export type AvailabilityDraftStatus = "pending" | "needs_changes" | "approved" | "rejected" | "applied";

export interface TeacherAvailabilityRule {
  id?: string;
  teacher_id?: string;
  weekday: number;
  start_time: string;
  end_time: string;
  effective_from: string;
  effective_to?: string | null;
  mode?: AvailabilityMode | null;
  note?: string | null;
}

export interface TeacherAvailabilityException {
  id?: string;
  teacher_id?: string;
  exception_date: string;
  action: AvailabilityExceptionAction;
  start_time: string;
  end_time: string;
  mode?: AvailabilityMode | null;
  note?: string | null;
}

export interface TeacherAvailabilityDraft {
  id: string;
  teacher_id: string;
  effective_from: string;
  status: AvailabilityDraftStatus | string;
  availability_rules: TeacherAvailabilityRule[] | unknown;
  availability_exceptions: TeacherAvailabilityException[] | unknown;
  validation_summary?: Record<string, unknown> | null;
  review_note?: string | null;
  created_at?: string;
  updated_at?: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
}

export interface TeacherCapability {
  id?: string;
  teacher_id: string;
  level_keys?: string[] | null;
  program_keys?: string[] | null;
  can_teach_online?: boolean | null;
  can_teach_offline?: boolean | null;
  max_hours_per_week?: number | null;
  notes?: string | null;
}

export interface TeacherRecordLite {
  id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  linked_user_id?: string | null;
  subjects?: string | null;
  classes?: string | null;
}

export interface TeachngoClassLite {
  id: string;
  class_name: string;
  teacher_id?: string | null;
  status?: string | null;
  level?: string | null;
  program?: string | null;
  schedule?: string | null;
  class_type?: string | null;
  room?: string | null;
  default_start_time?: string | null;
  default_end_time?: string | null;
}

export interface BusyBlock {
  source: "class_session" | "class_schedule";
  class_id?: string;
  class_name: string;
  teacher_id?: string | null;
  weekday?: number;
  date?: string;
  start_time: string;
  end_time: string;
  level?: string | null;
  program?: string | null;
  room?: string | null;
}

export interface AvailabilityValidationResult {
  lead_time_days: number;
  lead_time_ok: boolean;
  conflicts: BusyBlock[];
  conflict_count: number;
  can_apply: boolean;
}

export interface CandidateMatchResult {
  teacher: TeacherRecordLite;
  capability?: TeacherCapability | null;
  activeClassCount: number;
  weeklyMinutes: number;
  matchingReasons: string[];
  blockingReason?: string;
  availabilityOk: boolean;
  conflicts: BusyBlock[];
}
