import { getEffectiveStatus } from "./studyPlanStatus";

/* ───── Types ───── */
export interface StudentProgress {
  /** Study plan session stats */
  totalSessions: number;
  doneSessions: number;
  delayedSessions: number;
  pendingSessions: number;
  sessionCompletionRate: number; // 0-100

  /** Assigned exercises completed */
  totalAssignedExercises: number;
  completedExercises: number;
  exerciseCompletionRate: number; // 0-100

  /** Assigned tests completed */
  totalAssignedTests: number;
  completedTests: number;
  testCompletionRate: number; // 0-100

  /** Overall progress status */
  overallStatus: "completed" | "on_track" | "delayed";

  /** IELTS current score (avg of last 3 tests per skill) */
  currentScores: Record<string, number | null>;
  overallScore: number | null;
  scoreSource: "auto" | "manual";
}

export interface ClassProgress {
  classId: string;
  className: string;
  level: string | null;
  program: string | null;
  studentCount: number;
  avgSessionCompletion: number;
  avgExerciseCompletion: number;
  avgTestCompletion: number;
  avgOverallScore: number | null;
  studentProgresses: { userId: string; name: string; progress: StudentProgress }[];
}

export interface TeacherSummary {
  teacherId: string;
  teacherName: string;
  totalClasses: number;
  totalStudents: number;
  avgSessionCompletion: number;
  avgExerciseCompletion: number;
  avgOverallScore: number | null;
  classes: ClassProgress[];
}

/* ───── IELTS Band Rounding ───── */

/**
 * Round a raw score to the nearest IELTS 0.5 band.
 * Rules (n = decimal part):
 *   n < 0.25  → round down to .0
 *   0.25 ≤ n < 0.5 → round up to .5
 *   0.5 ≤ n < 0.75 → round down to .5
 *   n ≥ 0.75 → round up to next .0
 * Clamps result to 0–9.
 */
export function roundToIeltsBand(raw: number): number {
  const whole = Math.floor(raw);
  const decimal = raw - whole;
  let result: number;
  if (decimal < 0.25) result = whole;
  else if (decimal < 0.5) result = whole + 0.5;
  else if (decimal < 0.75) result = whole + 0.5;
  else result = whole + 1;
  return Math.max(0, Math.min(9, result));
}

/* ───── IELTS Score Calculation ───── */

/**
 * Calculate avg of last 3 test_results per section_type.
 * Returns per-skill scores (rounded to IELTS band) + overall average.
 */
export function calcAutoIeltsScores(
  testResults: { section_type: string; score: number | null; created_at: string }[]
): Record<string, number | null> {
  const skills = ["READING", "LISTENING", "WRITING", "SPEAKING"];
  const scores: Record<string, number | null> = {};

  for (const skill of skills) {
    const skillResults = testResults
      .filter(r => r.section_type === skill && r.score != null)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3);

    if (skillResults.length > 0) {
      const avg = skillResults.reduce((sum, r) => sum + Number(r.score), 0) / skillResults.length;
      scores[skill] = roundToIeltsBand(avg);
    } else {
      scores[skill] = null;
    }
  }

  return scores;
}

export function calcOverallFromSkills(scores: Record<string, number | null>): number | null {
  const vals = Object.values(scores).filter((v): v is number => v != null);
  if (vals.length === 0) return null;
  const raw = vals.reduce((a, b) => a + b, 0) / vals.length;
  return roundToIeltsBand(raw);
}

/* ───── Study Plan Progress ───── */

export function calcStudentProgress(
  entries: { entry_date: string; plan_status: string | null; exercise_ids: any; assessment_ids?: any }[],
  practiceResultExerciseIds: string[],
  testResultAssessmentIds: string[],
  manualScores?: Record<string, number | null> | null,
  testResults?: { section_type: string; score: number | null; created_at: string }[]
): StudentProgress {
  let doneSessions = 0;
  let delayedSessions = 0;
  let pendingSessions = 0;
  let totalAssignedExercises = 0;
  let completedExercises = 0;
  let totalAssignedTests = 0;
  let completedTests = 0;

  for (const entry of entries) {
    const status = getEffectiveStatus(entry.entry_date, entry.plan_status);
    if (status === "done") doneSessions++;
    else if (status === "delayed") delayedSessions++;
    else pendingSessions++;

    // Count assigned exercises
    const exerciseIds = parseJsonArray(entry.exercise_ids);
    totalAssignedExercises += exerciseIds.length;
    completedExercises += exerciseIds.filter(id => practiceResultExerciseIds.includes(id)).length;

    // Count assigned tests
    const assessmentIds = parseJsonArray(entry.assessment_ids);
    totalAssignedTests += assessmentIds.length;
    completedTests += assessmentIds.filter(id => testResultAssessmentIds.includes(id)).length;
  }

  const totalSessions = entries.length;
  const sessionCompletionRate = totalSessions > 0 ? Math.round((doneSessions / totalSessions) * 100) : 0;
  const exerciseCompletionRate = totalAssignedExercises > 0 ? Math.round((completedExercises / totalAssignedExercises) * 100) : 0;
  const testCompletionRate = totalAssignedTests > 0 ? Math.round((completedTests / totalAssignedTests) * 100) : 0;

  // Overall status
  let overallStatus: "completed" | "on_track" | "delayed" = "on_track";
  if (totalSessions > 0 && doneSessions === totalSessions) {
    overallStatus = "completed";
  } else if (delayedSessions > 0) {
    overallStatus = "delayed";
  }

  // Scores
  let currentScores: Record<string, number | null> = {};
  let scoreSource: "auto" | "manual" = "auto";

  if (manualScores && Object.values(manualScores).some(v => v != null)) {
    currentScores = manualScores;
    scoreSource = "manual";
  } else if (testResults) {
    currentScores = calcAutoIeltsScores(testResults);
  }

  const overallScore = calcOverallFromSkills(currentScores);

  return {
    totalSessions,
    doneSessions,
    delayedSessions,
    pendingSessions,
    sessionCompletionRate,
    totalAssignedExercises,
    completedExercises,
    exerciseCompletionRate,
    totalAssignedTests,
    completedTests,
    testCompletionRate,
    overallStatus,
    currentScores,
    overallScore,
    scoreSource,
  };
}

/* ───── Class-level aggregation ───── */

export function calcClassProgress(studentProgresses: StudentProgress[]): {
  avgSessionCompletion: number;
  avgExerciseCompletion: number;
  avgTestCompletion: number;
  avgOverallScore: number | null;
} {
  if (studentProgresses.length === 0) {
    return { avgSessionCompletion: 0, avgExerciseCompletion: 0, avgTestCompletion: 0, avgOverallScore: null };
  }

  const avgSession = Math.round(
    studentProgresses.reduce((s, p) => s + p.sessionCompletionRate, 0) / studentProgresses.length
  );
  const avgExercise = Math.round(
    studentProgresses.reduce((s, p) => s + p.exerciseCompletionRate, 0) / studentProgresses.length
  );
  const avgTest = Math.round(
    studentProgresses.reduce((s, p) => s + p.testCompletionRate, 0) / studentProgresses.length
  );

  const scores = studentProgresses.filter(p => p.overallScore != null).map(p => p.overallScore!);
  const avgScore = scores.length > 0 ? roundToIeltsBand(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  return { avgSessionCompletion: avgSession, avgExerciseCompletion: avgExercise, avgTestCompletion: avgTest, avgOverallScore: avgScore };
}

/* ───── Helpers ───── */

function parseJsonArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String);
  try {
    const parsed = typeof val === "string" ? JSON.parse(val) : val;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
