import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, BookOpen, Headphones, PenLine, Mic, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { cn } from "@shared/lib/utils";
import { format, subDays } from "date-fns";
import { CourseAssignmentPanel } from "@shared/components/study-plan/CourseAssignmentPanel";

const SKILL_ICON: Record<string, typeof BookOpen> = {
  reading: BookOpen,
  listening: Headphones,
  writing: PenLine,
  speaking: Mic,
};

interface Exercise {
  id: string;
  title: string;
  skill: string;
  question_type: string;
  questions: any[];
  status: string;
  difficulty: string;
  course_level: string | null;
}

interface PracticeResult {
  id: string;
  user_id: string;
  answers: Record<string, string> | null;
  correct_answers: number;
  total_questions: number;
  created_at: string;
}

interface QuestionStat {
  id: string;
  text: string;
  correctAnswer: string;
  totalAttempts: number;
  wrongCount: number;
  wrongRate: number;
  commonWrongAnswers: { answer: string; count: number }[];
}

export default function PracticeExerciseDetailPage() {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const navigate = useNavigate();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [results, setResults] = useState<PracticeResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!exerciseId) return;
    async function fetch() {
      setLoading(true);
      const thirtyDaysAgo = subDays(new Date(), 90).toISOString();

      // Fetch from assessments (unified) table
      const [{ data: assessmentData }, { data: res }] = await Promise.all([
        supabase.from("assessments").select("id, name, section_type, difficulty, status, course_level, question_types, total_questions").eq("id", exerciseId).single(),
        supabase.from("practice_results").select("id, user_id, answers, correct_answers, total_questions, created_at").eq("exercise_id", exerciseId).gte("created_at", thirtyDaysAgo).order("created_at", { ascending: false }),
      ]);

      // Also fetch questions from relational structure
      const { data: parts } = await supabase.from("parts").select("id").eq("assessment_id", exerciseId);
      const partIds = parts?.map(p => p.id) || [];
      let allQuestions: any[] = [];
      if (partIds.length > 0) {
        const { data: qgs } = await supabase.from("question_groups").select("id").in("part_id", partIds);
        const qgIds = qgs?.map(q => q.id) || [];
        if (qgIds.length > 0) {
          const { data: qs } = await supabase.from("questions").select("*").in("question_group_id", qgIds).order("question_number");
          allQuestions = qs || [];
        }
      }

      if (assessmentData) {
        setExercise({
          id: assessmentData.id,
          title: (assessmentData as any).name,
          skill: (assessmentData as any).section_type?.toLowerCase() || "reading",
          question_type: Array.isArray((assessmentData as any).question_types) && (assessmentData as any).question_types.length > 0
            ? (assessmentData as any).question_types[0]
            : "multiple_choice",
          questions: allQuestions.map((q: any) => ({
            id: q.id,
            text: q.text || q.title || `Câu ${q.question_number}`,
            correct_answer: q.correct_answer,
            question_number: q.question_number,
          })),
          status: assessmentData.status,
          difficulty: (assessmentData as any).difficulty || "medium",
          course_level: (assessmentData as any).course_level,
        });
      }
      setResults((res || []) as any);
      setLoading(false);
    }
    fetch();
  }, [exerciseId]);

  // Flatten questions from groups or legacy format
  const flatQuestions = useMemo(() => {
    if (!exercise?.questions) return [];
    const raw = exercise.questions as any[];
    // Groups format: [{question_type, questions: [...]}]
    if (raw.length > 0 && raw[0]?.question_type && Array.isArray(raw[0]?.questions)) {
      return raw.flatMap((g: any) => g.questions || []);
    }
    // Legacy flat array
    return raw;
  }, [exercise]);

  const questionStats = useMemo<QuestionStat[]>(() => {
    if (flatQuestions.length === 0 || results.length === 0) return [];

    return flatQuestions.map((q: any, idx: number) => {
      const qId = q.id || `q${q.questionNumber || q.question_number || idx + 1}`;
      const correctAnswer = (q.correct || q.correctAnswer || q.correct_answer || "").toString().trim();
      let totalAttempts = 0;
      let wrongCount = 0;
      const wrongAnswerMap: Record<string, number> = {};

      for (const r of results) {
        if (!r.answers || typeof r.answers !== "object") continue;
        const ans = (r.answers as Record<string, string>)[qId];
        if (ans === undefined || ans === null || ans === "") continue;
        totalAttempts++;
        const studentAns = ans.toString().trim();
        const alts = correctAnswer.split("|").map(a => a.trim().toLowerCase()).filter(Boolean);
        if (!alts.some(a => studentAns.toLowerCase() === a)) {
          wrongCount++;
          wrongAnswerMap[studentAns] = (wrongAnswerMap[studentAns] || 0) + 1;
        }
      }

      const commonWrongAnswers = Object.entries(wrongAnswerMap)
        .map(([answer, count]) => ({ answer, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      return {
        id: qId,
        text: q.text || q.title || q.question || `Câu ${idx + 1}`,
        correctAnswer,
        totalAttempts,
        wrongCount,
        wrongRate: totalAttempts > 0 ? wrongCount / totalAttempts : 0,
        commonWrongAnswers,
      };
    });
  }, [flatQuestions, results]);

  const sortedStats = useMemo(
    () => [...questionStats].sort((a, b) => b.wrongRate - a.wrongRate),
    [questionStats],
  );

  const uniqueStudents = useMemo(
    () => new Set(results.map(r => r.user_id)).size,
    [results],
  );

  const avgScore = useMemo(() => {
    if (results.length === 0) return 0;
    const total = results.reduce((s, r) => s + (r.total_questions > 0 ? r.correct_answers / r.total_questions : 0), 0);
    return Math.round((total / results.length) * 100);
  }, [results]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Không tìm thấy bài tập.
        <Button variant="ghost" className="ml-2" onClick={() => navigate("/tests?type=exercise")}>Quay lại</Button>
      </div>
    );
  }

  const SkillIcon = SKILL_ICON[exercise.skill] || BookOpen;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="shrink-0 mt-0.5" onClick={() => navigate("/tests?type=exercise")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl md:text-2xl font-extrabold truncate">{exercise.title}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              <SkillIcon className="h-3 w-3" /> {exercise.skill}
            </span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {exercise.question_type.replace(/_/g, " ")}
            </span>
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              exercise.status === "published" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
            )}>
              {exercise.status === "published" ? "Published" : "Nháp"}
            </span>
          </div>
        </div>
      </div>

      {/* Course assignments — drives global Study Plan filtering */}
      {exerciseId && (
        <div className="bg-card rounded-xl border p-3">
          <CourseAssignmentPanel kind="exercise" resourceId={exerciseId} />
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Lượt làm" value={results.length} />
        <SummaryCard label="Học viên" value={uniqueStudents} />
        <SummaryCard label="Số câu hỏi" value={flatQuestions.length} />
        <SummaryCard label="Điểm TB" value={`${avgScore}%`} highlight={avgScore < 50} />
      </div>

      {/* Per-question Stats */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
          Thống kê từng câu hỏi (sắp xếp theo tỷ lệ sai)
        </h2>

        {sortedStats.length === 0 ? (
          <div className="bg-card rounded-xl border p-8 text-center text-muted-foreground text-sm">
            Chưa có dữ liệu. Cần có học viên làm bài tập này.
          </div>
        ) : (
          <div className="rounded-xl border bg-card overflow-hidden divide-y">
            {sortedStats.map((q, idx) => {
              const pct = Math.round(q.wrongRate * 100);
              const hasData = q.totalAttempts > 0;
              return (
                <div key={q.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold mt-0.5",
                      !hasData ? "bg-muted text-muted-foreground"
                        : pct >= 60 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : pct >= 40 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                    )}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-relaxed">{q.text}</p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> {q.correctAnswer}
                        </span>
                        {hasData && (
                          <>
                            <span className="text-[11px] text-muted-foreground">
                              {q.totalAttempts} lượt · {q.wrongCount} sai
                            </span>
                            {q.commonWrongAnswers.length > 0 && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-red-500">
                                <XCircle className="h-3 w-3" />
                                Hay chọn sai: {q.commonWrongAnswers.map(a => `"${a.answer}" (${a.count})`).join(", ")}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      {hasData && (
                        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden max-w-xs">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              pct >= 60 ? "bg-red-500" : pct >= 40 ? "bg-orange-500" : "bg-emerald-500",
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                    {hasData && (
                      <div className="text-right shrink-0">
                        <span className={cn(
                          "text-lg font-bold",
                          pct >= 60 ? "text-red-600 dark:text-red-400" : pct >= 40 ? "text-orange-600 dark:text-orange-400" : "text-emerald-600 dark:text-emerald-400",
                        )}>
                          {pct}%
                        </span>
                        <p className="text-[10px] text-muted-foreground">sai</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Results */}
      {results.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Lượt làm gần đây
          </h2>
          <div className="rounded-xl border bg-card overflow-hidden divide-y">
            {results.slice(0, 10).map(r => {
              const score = r.total_questions > 0 ? Math.round((r.correct_answers / r.total_questions) * 100) : 0;
              return (
                <div key={r.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground text-xs">
                    {format(new Date(r.created_at), "dd/MM/yyyy HH:mm")}
                  </span>
                  <span className={cn(
                    "font-semibold",
                    score >= 70 ? "text-emerald-600 dark:text-emerald-400" : score >= 50 ? "text-orange-600 dark:text-orange-400" : "text-red-600 dark:text-red-400",
                  )}>
                    {r.correct_answers}/{r.total_questions} ({score}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={cn(
      "bg-card rounded-xl border p-3 md:p-4",
      highlight && "border-red-300 dark:border-red-800",
    )}>
      <p className={cn("text-lg md:text-xl font-bold", highlight && "text-red-600 dark:text-red-400")}>{value}</p>
      <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
