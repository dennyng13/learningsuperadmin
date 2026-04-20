import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@shared/lib/utils";
import {
  TrendingUp, TrendingDown, Minus, Clock, Activity,
  Users, Zap,
} from "lucide-react";
import { subDays, format } from "date-fns";

interface ScorecardData {
  avgImprovement: number | null;
  avgImprovementPrev: number | null;
  avgFeedbackHours: number | null;
  avgFeedbackHoursPrev: number | null;
  retentionPct: number | null;
  retentionPctPrev: number | null;
  engagementScore: number | null;
  engagementScorePrev: number | null;
}

interface Props {
  linkedUserIds: string[];
  /** All teachngo_student_ids for the teacher */
  teachngoStudentIds: string[];
  classIds: string[];
}

export default function TeacherScorecard({ linkedUserIds, teachngoStudentIds, classIds }: Props) {
  const [data, setData] = useState<ScorecardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (linkedUserIds.length === 0) {
      setLoading(false);
      return;
    }
    load();
  }, [linkedUserIds.join(",")]);

  async function load() {
    setLoading(true);
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    const sixtyDaysAgo = subDays(now, 60);
    const fourteenDaysAgo = subDays(now, 14);
    const twentyEightDaysAgo = subDays(now, 28);

    const safeIds = linkedUserIds.length > 0 ? linkedUserIds : ["__none__"];

    // Parallel fetches
    const [
      { data: testResults },
      { data: writingFb },
      { data: speakingFb },
      { data: activityRecent },
      { data: activityPrev },
    ] = await Promise.all([
      supabase
        .from("test_results" as any)
        .select("user_id, section_type, score, created_at")
        .in("user_id", safeIds)
        .order("created_at", { ascending: true }) as any,
      supabase
        .from("writing_feedback" as any)
        .select("result_id, student_id, created_at")
        .in("student_id", safeIds) as any,
      supabase
        .from("speaking_feedback")
        .select("result_id, student_id, created_at")
        .in("student_id", safeIds) as any,
      supabase
        .from("activity_log" as any)
        .select("user_id, activity_date, time_minutes")
        .in("user_id", safeIds)
        .gte("activity_date", format(fourteenDaysAgo, "yyyy-MM-dd")) as any,
      supabase
        .from("activity_log" as any)
        .select("user_id, activity_date, time_minutes")
        .in("user_id", safeIds)
        .gte("activity_date", format(twentyEightDaysAgo, "yyyy-MM-dd"))
        .lt("activity_date", format(fourteenDaysAgo, "yyyy-MM-dd")) as any,
    ]);

    // 1. Student improvement (current period = last 30 days, prev = 30-60 days)
    const avgImprovement = calcImprovement(testResults || [], safeIds);
    // For prev trend, we'd need older data – simplified: compare with 60-day window
    const avgImprovementPrev = calcImprovementPrev(testResults || [], safeIds, thirtyDaysAgo);

    // 2. Feedback response time
    const testResultMap: Record<string, string> = {};
    for (const tr of testResults || []) {
      testResultMap[tr.id || ""] = tr.created_at;
    }

    // Need test_results with IDs for matching
    const { data: testResultsWithIds } = await supabase
      .from("test_results" as any)
      .select("id, created_at, section_type")
      .in("user_id", safeIds) as any;

    const trMap: Record<string, string> = {};
    for (const tr of testResultsWithIds || []) {
      trMap[tr.id] = tr.created_at;
    }

    const { current: fbTimeCurrent, prev: fbTimePrev } = calcFeedbackTime(
      trMap, writingFb || [], speakingFb || [], thirtyDaysAgo
    );

    // 3. Student retention
    const activeRecent = new Set((activityRecent || []).map((a: any) => a.user_id));
    const activePrev = new Set((activityPrev || []).map((a: any) => a.user_id));
    const retentionPct = linkedUserIds.length > 0
      ? Math.round((activeRecent.size / linkedUserIds.length) * 100) : null;
    const retentionPctPrev = linkedUserIds.length > 0
      ? Math.round((activePrev.size / linkedUserIds.length) * 100) : null;

    // 4. Engagement score
    const weeklyMinutes = (activityRecent || []).reduce((s: number, a: any) => s + (a.time_minutes || 0), 0);
    const avgWeeklyMin = linkedUserIds.length > 0 ? weeklyMinutes / linkedUserIds.length : 0;
    const feedbackSpeed = fbTimeCurrent != null && fbTimeCurrent > 0 ? Math.min(100, 48 / fbTimeCurrent * 50) : 50;
    const improvementFactor = avgImprovement != null ? Math.max(0, 50 + avgImprovement * 100) : 50;
    const engagementScore = Math.round(
      (Math.min(100, avgWeeklyMin / 2) * 0.4) + (feedbackSpeed * 0.3) + (improvementFactor * 0.3)
    );

    const weeklyMinutesPrev = (activityPrev || []).reduce((s: number, a: any) => s + (a.time_minutes || 0), 0);
    const avgWeeklyMinPrev = linkedUserIds.length > 0 ? weeklyMinutesPrev / linkedUserIds.length : 0;
    const feedbackSpeedPrev = fbTimePrev != null && fbTimePrev > 0 ? Math.min(100, 48 / fbTimePrev * 50) : 50;
    const improvementFactorPrev = avgImprovementPrev != null ? Math.max(0, 50 + avgImprovementPrev * 100) : 50;
    const engagementScorePrev = Math.round(
      (Math.min(100, avgWeeklyMinPrev / 2) * 0.4) + (feedbackSpeedPrev * 0.3) + (improvementFactorPrev * 0.3)
    );

    setData({
      avgImprovement,
      avgImprovementPrev,
      avgFeedbackHours: fbTimeCurrent,
      avgFeedbackHoursPrev: fbTimePrev,
      retentionPct,
      retentionPctPrev,
      engagementScore,
      engagementScorePrev,
    });
    setLoading(false);
  }

  if (loading || !data) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <MetricCard
        icon={TrendingUp}
        label="Cải thiện TB"
        value={data.avgImprovement != null ? `${data.avgImprovement > 0 ? "+" : ""}${data.avgImprovement.toFixed(1)}` : "—"}
        unit="band"
        current={data.avgImprovement}
        prev={data.avgImprovementPrev}
        higherIsBetter
        color="text-emerald-600"
      />
      <MetricCard
        icon={Clock}
        label="Chấm bài TB"
        value={data.avgFeedbackHours != null ? formatHours(data.avgFeedbackHours) : "—"}
        unit=""
        current={data.avgFeedbackHours}
        prev={data.avgFeedbackHoursPrev}
        higherIsBetter={false}
        color="text-blue-600"
      />
      <MetricCard
        icon={Users}
        label="Retention 14d"
        value={data.retentionPct != null ? `${data.retentionPct}` : "—"}
        unit="%"
        current={data.retentionPct}
        prev={data.retentionPctPrev}
        higherIsBetter
        color="text-violet-600"
      />
      <MetricCard
        icon={Zap}
        label="Engagement"
        value={data.engagementScore != null ? `${data.engagementScore}` : "—"}
        unit="/100"
        current={data.engagementScore}
        prev={data.engagementScorePrev}
        higherIsBetter
        color="text-orange-600"
      />
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  unit,
  current,
  prev,
  higherIsBetter,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  unit: string;
  current: number | null;
  prev: number | null;
  higherIsBetter: boolean;
  color: string;
}) {
  let trend: "up" | "down" | "same" = "same";
  if (current != null && prev != null) {
    const diff = current - prev;
    if (Math.abs(diff) > 0.05) trend = diff > 0 ? "up" : "down";
  }

  const trendPositive = higherIsBetter ? trend === "up" : trend === "down";
  const trendNegative = higherIsBetter ? trend === "down" : trend === "up";

  return (
    <div className="rounded-xl border bg-card p-3 md:p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center bg-primary/10", color)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-[10px] md:text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <div className="flex items-end gap-1.5">
        <span className="text-xl md:text-2xl font-bold">{value}</span>
        {unit && <span className="text-xs text-muted-foreground mb-0.5">{unit}</span>}
        {trend !== "same" && (
          <span className={cn(
            "flex items-center text-[10px] font-semibold mb-0.5 ml-auto",
            trendPositive ? "text-emerald-600" : trendNegative ? "text-red-500" : "text-muted-foreground",
          )}>
            {trend === "up" ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
            vs trước
          </span>
        )}
        {trend === "same" && (
          <span className="flex items-center text-[10px] text-muted-foreground mb-0.5 ml-auto">
            <Minus className="h-3 w-3 mr-0.5" /> ổn định
          </span>
        )}
      </div>
    </div>
  );
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

function calcImprovement(results: any[], userIds: string[]): number | null {
  const improvements: number[] = [];
  for (const uid of userIds) {
    const userResults = results.filter((r: any) => r.user_id === uid && r.score != null);
    if (userResults.length < 2) continue;
    const skills = [...new Set(userResults.map((r: any) => r.section_type))];
    let totalDiff = 0;
    let skillCount = 0;
    for (const skill of skills) {
      const skillResults = userResults.filter((r: any) => r.section_type === skill);
      if (skillResults.length < 2) continue;
      const earliest = skillResults[0];
      const latest = skillResults[skillResults.length - 1];
      totalDiff += (latest.score - earliest.score);
      skillCount++;
    }
    if (skillCount > 0) improvements.push(totalDiff / skillCount);
  }
  if (improvements.length === 0) return null;
  return improvements.reduce((a, b) => a + b, 0) / improvements.length;
}

function calcImprovementPrev(results: any[], userIds: string[], cutoff: Date): number | null {
  const cutoffStr = cutoff.toISOString();
  const filtered = results.filter((r: any) => r.created_at < cutoffStr);
  return calcImprovement(filtered, userIds);
}

function calcFeedbackTime(
  trMap: Record<string, string>,
  writingFb: any[],
  speakingFb: any[],
  periodCutoff: Date,
): { current: number | null; prev: number | null } {
  const allFb = [
    ...writingFb.map(f => ({ resultId: f.result_id, fbCreated: f.created_at })),
    ...speakingFb.map(f => ({ resultId: f.result_id, fbCreated: f.created_at })),
  ];

  const currentHours: number[] = [];
  const prevHours: number[] = [];

  for (const fb of allFb) {
    const trCreated = trMap[fb.resultId];
    if (!trCreated || !fb.fbCreated) continue;
    const diffMs = new Date(fb.fbCreated).getTime() - new Date(trCreated).getTime();
    if (diffMs < 0) continue;
    const hours = diffMs / (1000 * 60 * 60);
    if (new Date(fb.fbCreated) >= periodCutoff) {
      currentHours.push(hours);
    } else {
      prevHours.push(hours);
    }
  }

  return {
    current: currentHours.length > 0 ? currentHours.reduce((a, b) => a + b, 0) / currentHours.length : null,
    prev: prevHours.length > 0 ? prevHours.reduce((a, b) => a + b, 0) / prevHours.length : null,
  };
}
