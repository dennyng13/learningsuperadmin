import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2, Clock, AlertTriangle, BookOpen, Target,
  TrendingUp, Layers, FileText, Info,
} from "lucide-react";
import { cn } from "@shared/lib/utils";
import {
  calcStudentProgress,
  calcAutoIeltsScores,
  calcOverallFromSkills,
  type StudentProgress,
} from "@shared/utils/progressTracking";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";

interface Props {
  userId: string;
}

const STATUS_CONFIG = {
  completed: { label: "Hoàn thành", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800" },
  on_track: { label: "Đúng tiến độ", icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800" },
  delayed: { label: "Chậm tiến độ", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800" },
};

export default function StudentProgressCard({ userId }: Props) {
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [planCount, setPlanCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    fetchProgress();
  }, [userId]);

  async function fetchProgress() {
    setLoading(true);

    // Find teachngo_student linked to this user
    const { data: tsData } = await supabase
      .from("teachngo_students")
      .select("teachngo_id")
      .eq("linked_user_id", userId);

    const teachngoIds = (tsData || []).map((t: any) => t.teachngo_id);

    // Also find plans via class enrollment
    const { data: classEnrollments } = await supabase
      .from("teachngo_class_students")
      .select("class_id, teachngo_student_id")
      .in("teachngo_student_id", teachngoIds.length > 0 ? teachngoIds : ["__none__"]);

    const classIds = [...new Set((classEnrollments || []).map((e: any) => e.class_id))];

    // Fetch all study plans assigned to this student
    const { data: plans } = await supabase
      .from("study_plans")
      .select("id, current_score, plan_name")
      .or(
        [
          teachngoIds.length > 0 ? `teachngo_student_id.in.(${teachngoIds.join(",")})` : null,
          teachngoIds.length > 0 ? `student_ids.cs.[${teachngoIds.map(id => `"${id}"`).join(",")}]` : null,
          classIds.length > 0 ? `class_ids.cs.[${classIds.map(id => `"${id}"`).join(",")}]` : null,
        ].filter(Boolean).join(",")
      );

    if (!plans || plans.length === 0) {
      setProgress(null);
      setPlanCount(0);
      setLoading(false);
      return;
    }

    setPlanCount(plans.length);
    const planIds = plans.map((p: any) => p.id);

    // Fetch entries for all plans
    const { data: entries } = await supabase
      .from("study_plan_entries")
      .select("entry_date, plan_status, exercise_ids, assessment_ids")
      .in("plan_id", planIds);

    // Fetch test results for scoring
    const { data: testResults } = await supabase
      .from("test_results")
      .select("section_type, score, created_at, assessment_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    // Fetch practice results for exercise completion
    const { data: practiceResults } = await supabase
      .from("practice_results")
      .select("exercise_id")
      .eq("user_id", userId);

    const completedExerciseIds = [...new Set((practiceResults || []).map((r: any) => r.exercise_id))];
    const completedTestIds = [...new Set((testResults || []).map((r: any) => r.assessment_id))];

    // Check for manual scores
    const manualScores = plans[0]?.current_score as Record<string, number | null> | null;
    const hasManualScores = manualScores && typeof manualScores === "object" &&
      Object.values(manualScores).some(v => v != null && v !== 0);

    const p = calcStudentProgress(
      (entries || []) as any[],
      completedExerciseIds,
      completedTestIds,
      hasManualScores ? manualScores : null,
      (testResults || []) as any[]
    );

    setProgress(p);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-4 animate-pulse">
        <div className="h-4 w-32 bg-muted rounded mb-3" />
        <div className="h-20 bg-muted rounded" />
      </div>
    );
  }

  if (!progress || planCount === 0) return null;

  const statusCfg = STATUS_CONFIG[progress.overallStatus];
  const StatusIcon = statusCfg.icon;

  return (
    <div className={cn("rounded-xl border bg-card p-4 space-y-4", statusCfg.border)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold">Tiến độ học tập</h3>
          <span className="text-[10px] text-muted-foreground">({planCount} kế hoạch)</span>
        </div>
        <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold", statusCfg.bg, statusCfg.color)}>
          <StatusIcon className="h-3.5 w-3.5" />
          {statusCfg.label}
        </div>
      </div>

      {/* IELTS Score */}
      {progress.overallScore != null && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
          <div className="relative" style={{ width: 48, height: 48 }}>
            <svg width={48} height={48} className="-rotate-90">
              <circle cx={24} cy={24} r={20} fill="none" stroke="hsl(var(--border))" strokeWidth={4} />
              <circle
                cx={24} cy={24} r={20} fill="none"
                stroke="hsl(var(--primary))" strokeWidth={4}
                strokeDasharray={2 * Math.PI * 20}
                strokeDashoffset={2 * Math.PI * 20 * (1 - Math.min(progress.overallScore / 9, 1))}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold">{progress.overallScore}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold">Điểm IELTS hiện tại</p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-xs">
                    {progress.scoreSource === "auto"
                      ? "Tự động tính TB từ 3 bài thi gần nhất mỗi kỹ năng"
                      : "Do giáo viên/admin nhập thủ công"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex gap-3 mt-1">
              {["READING", "LISTENING", "WRITING", "SPEAKING"].map(sk => (
                <div key={sk} className="text-center">
                  <p className="text-[10px] text-muted-foreground">{sk[0]}</p>
                  <p className="text-xs font-bold">{progress.currentScores[sk] ?? "—"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Progress Bars */}
      <div className="space-y-3">
        {/* Sessions */}
        <ProgressBar
          icon={BookOpen}
          label="Buổi học"
          completed={progress.doneSessions}
          total={progress.totalSessions}
          rate={progress.sessionCompletionRate}
          delayed={progress.delayedSessions}
        />

        {/* Exercises */}
        {progress.totalAssignedExercises > 0 && (
          <ProgressBar
            icon={Layers}
            label="Bài tập"
            completed={progress.completedExercises}
            total={progress.totalAssignedExercises}
            rate={progress.exerciseCompletionRate}
          />
        )}

        {/* Tests */}
        {progress.totalAssignedTests > 0 && (
          <ProgressBar
            icon={FileText}
            label="Bài thi"
            completed={progress.completedTests}
            total={progress.totalAssignedTests}
            rate={progress.testCompletionRate}
          />
        )}
      </div>
    </div>
  );
}

function ProgressBar({
  icon: Icon,
  label,
  completed,
  total,
  rate,
  delayed,
}: {
  icon: any;
  label: string;
  completed: number;
  total: number;
  rate: number;
  delayed?: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {delayed != null && delayed > 0 && (
            <span className="text-[10px] text-amber-600 font-medium flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {delayed} trễ
            </span>
          )}
          <span className="text-xs font-semibold">{completed}/{total}</span>
          <span className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
            rate >= 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" :
            rate >= 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" :
            "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
          )}>
            {rate}%
          </span>
        </div>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            rate >= 80 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-500" : "bg-red-500"
          )}
          style={{ width: `${rate}%` }}
        />
      </div>
    </div>
  );
}
