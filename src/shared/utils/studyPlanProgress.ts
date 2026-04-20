// src/utils/studyPlanProgress.ts
// Timeline-aware study plan progress tracking

/* ───── Types ───── */

export interface SessionProgress {
  sessionNumber: number;
  entryDate: string;
  status: "done" | "delayed" | "today" | "upcoming" | "skipped";
  daysOverdue: number;
}

export interface PlanProgress {
  // Session counts
  totalSessions: number;
  doneSessions: number;
  delayedSessions: number;
  upcomingSessions: number;
  todaySessions: number;

  // Timeline position
  expectedSessionByToday: number;
  actualDoneSessions: number;
  sessionsBehind: number;
  sessionsAhead: number;

  // Percentage
  completionPercent: number;
  expectedPercent: number;
  progressDelta: number;

  // Status
  overallStatus: "completed" | "on_track" | "slightly_behind" | "behind" | "critical" | "not_started";
  statusLabel: string;
  statusColor: string;

  // Pace
  remainingSessions: number;
  remainingDays: number;
  sessionsPerWeekNeeded: number;
  currentPacePerWeek: number;

  // Per-session details
  sessions: SessionProgress[];
}

/* ───── Single-entry status (replaces getEffectiveStatus) ───── */

export function getEntryStatus(
  entryDate: string,
  planStatus: string | null
): "done" | "delayed" | "today" | "upcoming" | "skipped" {
  if (planStatus === "done") return "done";
  if (planStatus === "skipped") return "skipped";
  if (planStatus === "delayed") return "delayed";

  const todayStr = new Date().toISOString().split("T")[0];
  if (entryDate === todayStr) return "today";
  if (entryDate < todayStr) return "delayed";
  return "upcoming";
}

/* ───── Plan-level progress ───── */

export function calcPlanProgress(
  entries: { entry_date: string; plan_status: string | null; session_number?: number }[],
  _planStartDate?: string | null,
  _planEndDate?: string | null,
): PlanProgress {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  const sorted = [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  const totalSessions = sorted.length;

  // Classify each session
  const sessions: SessionProgress[] = sorted.map((entry, idx) => {
    const sessionNumber = entry.session_number || idx + 1;
    const entryDate = entry.entry_date;
    const isPast = entryDate < todayStr;
    const isToday = entryDate === todayStr;

    let status: SessionProgress["status"];
    let daysOverdue = 0;

    if (entry.plan_status === "done") {
      status = "done";
    } else if (entry.plan_status === "skipped") {
      status = "skipped";
    } else if (isToday) {
      status = "today";
    } else if (isPast) {
      status = "delayed";
      daysOverdue = Math.floor((today.getTime() - new Date(entryDate + "T00:00:00").getTime()) / 86400000);
    } else {
      status = "upcoming";
    }

    return { sessionNumber, entryDate, status, daysOverdue };
  });

  const doneSessions = sessions.filter(s => s.status === "done").length;
  const delayedSessions = sessions.filter(s => s.status === "delayed").length;
  const todaySessions = sessions.filter(s => s.status === "today").length;
  const upcomingSessions = sessions.filter(s => s.status === "upcoming").length;

  // Expected position
  const expectedSessionByToday = sessions.filter(s => s.entryDate <= todayStr).length;
  const sessionsBehind = Math.max(0, expectedSessionByToday - doneSessions);
  const sessionsAhead = Math.max(0, doneSessions - expectedSessionByToday);

  // Percentages
  const completionPercent = totalSessions > 0 ? Math.round((doneSessions / totalSessions) * 100) : 0;
  const expectedPercent = totalSessions > 0 ? Math.round((expectedSessionByToday / totalSessions) * 100) : 0;
  const progressDelta = completionPercent - expectedPercent;

  // Remaining
  const remainingSessions = totalSessions - doneSessions;
  const lastDate = sorted[sorted.length - 1]?.entry_date;
  const remainingDays = lastDate
    ? Math.max(0, Math.floor((new Date(lastDate + "T00:00:00").getTime() - today.getTime()) / 86400000))
    : 0;

  // Pace
  const sessionsPerWeekNeeded = remainingDays > 0
    ? Math.round((remainingSessions / (remainingDays / 7)) * 10) / 10
    : 0;

  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const twoWeeksAgoStr = twoWeeksAgo.toISOString().split("T")[0];
  const recentDone = sessions.filter(s =>
    s.status === "done" && s.entryDate >= twoWeeksAgoStr
  ).length;
  const currentPacePerWeek = Math.round((recentDone / 2) * 10) / 10;

  // Overall status
  let overallStatus: PlanProgress["overallStatus"];
  let statusLabel: string;
  let statusColor: string;

  if (doneSessions === totalSessions && totalSessions > 0) {
    overallStatus = "completed";
    statusLabel = "Hoàn thành";
    statusColor = "text-emerald-600 bg-emerald-500/10";
  } else if (totalSessions === 0 || (doneSessions === 0 && expectedSessionByToday === 0)) {
    overallStatus = "not_started";
    statusLabel = "Chưa bắt đầu";
    statusColor = "text-muted-foreground bg-muted/50";
  } else if (sessionsBehind === 0) {
    overallStatus = "on_track";
    statusLabel = "Đúng tiến độ";
    statusColor = "text-emerald-600 bg-emerald-500/10";
  } else if (sessionsBehind <= 2) {
    overallStatus = "slightly_behind";
    statusLabel = `Chậm ${sessionsBehind} buổi`;
    statusColor = "text-amber-600 bg-amber-500/10";
  } else if (sessionsBehind <= Math.ceil(totalSessions * 0.3)) {
    overallStatus = "behind";
    statusLabel = `Chậm ${sessionsBehind} buổi`;
    statusColor = "text-orange-600 bg-orange-500/10";
  } else {
    overallStatus = "critical";
    statusLabel = `Chậm ${sessionsBehind} buổi — cần chú ý`;
    statusColor = "text-red-600 bg-red-500/10";
  }

  return {
    totalSessions, doneSessions, delayedSessions, upcomingSessions, todaySessions,
    expectedSessionByToday, actualDoneSessions: doneSessions,
    sessionsBehind, sessionsAhead,
    completionPercent, expectedPercent, progressDelta,
    overallStatus, statusLabel, statusColor,
    remainingSessions, remainingDays, sessionsPerWeekNeeded, currentPacePerWeek,
    sessions,
  };
}

/* ───── Class-level aggregation ───── */

export function calcClassPlanProgress(
  studentProgresses: { studentName: string; progress: PlanProgress }[]
) {
  if (studentProgresses.length === 0) return null;

  const avgCompletion = Math.round(
    studentProgresses.reduce((s, p) => s + p.progress.completionPercent, 0) / studentProgresses.length
  );
  const avgExpected = Math.round(
    studentProgresses.reduce((s, p) => s + p.progress.expectedPercent, 0) / studentProgresses.length
  );
  const totalBehind = studentProgresses.filter(p => p.progress.sessionsBehind > 0).length;
  const totalOnTrack = studentProgresses.filter(p =>
    p.progress.sessionsBehind === 0 && p.progress.completionPercent < 100
  ).length;
  const totalCompleted = studentProgresses.filter(p => p.progress.overallStatus === "completed").length;
  const criticalStudents = studentProgresses
    .filter(p => p.progress.overallStatus === "critical" || p.progress.overallStatus === "behind")
    .sort((a, b) => b.progress.sessionsBehind - a.progress.sessionsBehind);

  return {
    studentCount: studentProgresses.length,
    avgCompletion,
    avgExpected,
    avgDelta: avgCompletion - avgExpected,
    totalOnTrack,
    totalBehind,
    totalCompleted,
    criticalStudents,
  };
}
