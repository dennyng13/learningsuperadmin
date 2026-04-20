/**
 * Performance utilities — single source of truth cho điểm số học viên/lớp.
 * KHÔNG tự tính lại điểm — chỉ format/label/derive từ data RPC trả về.
 */

export type AttentionFlag =
  | "score_regression"
  | "attendance_low"
  | "no_recent_activity"
  | "low_practice_score";

export const ATTENTION_FLAG_LABELS: Record<AttentionFlag, { label: string; description: string }> = {
  score_regression: { label: "Điểm thi giảm", description: "Bài thi gần nhất thấp hơn TB 3 bài trước ≥0.5 band" },
  attendance_low: { label: "Vắng nhiều", description: "Vắng ≥2 trong 3 buổi gần nhất" },
  no_recent_activity: { label: "Ngừng hoạt động", description: "Không có hoạt động học tập 7 ngày qua" },
  low_practice_score: { label: "Bài tập kém", description: "Điểm TB bài tập 30 ngày <50%" },
};

/** IELTS band 0-9 → score 0-100 */
export function bandToScore(band: number | null | undefined): number | null {
  if (band == null || isNaN(band)) return null;
  return Math.round((band * 100) / 9 * 10) / 10;
}

/** IELTS rounding rule: <0.25 → .0, 0.25-0.74 → .5, ≥0.75 → +1.0 */
export function roundToIeltsBand(value: number): number {
  const whole = Math.floor(value);
  const frac = value - whole;
  if (frac < 0.25) return whole;
  if (frac < 0.75) return whole + 0.5;
  return whole + 1;
}

export interface PerformanceLabel {
  label: string;
  color: string;
  bg: string;
}

/** 0-100 → label & color tokens (semantic) */
export function getPerformanceLabel(score: number | null): PerformanceLabel {
  if (score == null) return { label: "Chưa có dữ liệu", color: "text-muted-foreground", bg: "bg-muted" };
  if (score >= 80) return { label: "Xuất sắc", color: "text-emerald-600", bg: "bg-emerald-100" };
  if (score >= 65) return { label: "Tốt", color: "text-blue-600", bg: "bg-blue-100" };
  if (score >= 50) return { label: "Trung bình", color: "text-amber-600", bg: "bg-amber-100" };
  return { label: "Cần chú ý", color: "text-destructive", bg: "bg-destructive/10" };
}

export interface ForecastInput {
  currentBand: number | null;
  targetBand: number | null;
  examDate: string | null; // ISO date
  recentTestCount: number;
}

export type ForecastStatus = "on_track" | "needs_acceleration" | "unlikely" | "no_data";

export interface ForecastResult {
  status: ForecastStatus;
  label: string;
  daysToExam: number | null;
  bandGap: number | null;
}

export function getForecast({ currentBand, targetBand, examDate }: ForecastInput): ForecastResult {
  if (currentBand == null || targetBand == null || !examDate) {
    return { status: "no_data", label: "Chưa đủ dữ liệu dự báo", daysToExam: null, bandGap: null };
  }
  const days = Math.ceil((new Date(examDate).getTime() - Date.now()) / 86_400_000);
  const gap = targetBand - currentBand;
  if (gap <= 0) return { status: "on_track", label: "Đã đạt mục tiêu", daysToExam: days, bandGap: gap };
  // ~0.5 band needs ~6 weeks (42 days) of consistent study
  const neededDays = gap * 84;
  if (days >= neededDays) return { status: "on_track", label: "Đúng tiến độ", daysToExam: days, bandGap: gap };
  if (days >= neededDays * 0.6) return { status: "needs_acceleration", label: "Cần tăng tốc", daysToExam: days, bandGap: gap };
  return { status: "unlikely", label: "Khó kịp tiến độ", daysToExam: days, bandGap: gap };
}

/* ───── Types matching RPC payloads ───── */

export interface ScoreHistoryEntry {
  section_type: string;
  score: number;
  assessment_name: string;
  created_at: string;
}

export interface SkillInsightItem {
  type: string;
  accuracy: number;
}

export interface StudentLifetime {
  student_id: string;
  full_name: string;
  target_band: number | null;
  target_exam_date: string | null;
  current_level: string | null;
  overall_band: number | null;
  band_per_skill: Record<string, number>;
  score_history: ScoreHistoryEntry[];
  activity_stats: {
    total_minutes: number;
    reading: number;
    listening: number;
    writing: number;
    speaking: number;
    last_activity_date: string | null;
  };
  attendance_summary: { attended: number; total_past: number; rate: number | null };
  skill_insights: { weak_types: SkillInsightItem[]; strong_types: SkillInsightItem[] };
  attention_flags: AttentionFlag[];
  lifetime_score: number | null;
}

export interface CourseGrade {
  class_id: string;
  class_name: string;
  period_start: string;
  period_end: string;
  final_exam_score: number | null;
  exercise_avg: number;
  attendance_rate: number;
  course_grade: number | null;
  breakdown: { exercises_count: number; attended_count: number; total_sessions: number };
}

export interface ClassOverview {
  student_count: number;
  avg_lifetime_score: number;
  avg_attendance_rate: number;
}

export interface TeacherOverview {
  class_count: number;
  student_count: number;
  avg_lifetime_score: number;
}

export interface SchoolOverview {
  active_students: number;
  active_classes: number;
  avg_lifetime_score: number;
}
