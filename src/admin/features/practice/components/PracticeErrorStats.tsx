import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, BookOpen, Headphones, PenLine, Mic, ArrowRight } from "lucide-react";
import { cn } from "@shared/lib/utils";
import {
  type AnalyticsRange,
  AnalyticsRangeBadge,
  formatRangeLabel,
} from "@shared/components/dashboard/analyticsRange";

interface PracticeResultRow {
  exercise_id: string;
  exercise_title: string;
  skill: string;
  question_type: string;
  correct_answers: number;
  total_questions: number;
}

interface Props {
  results: PracticeResultRow[];
  range?: AnalyticsRange;
}

interface ExerciseStat {
  exerciseId: string;
  title: string;
  skill: string;
  questionType: string;
  wrongCount: number;
  totalCount: number;
  wrongRate: number;
  attempts: number;
}

const SKILL_LABELS: Record<string, string> = {
  reading: "R",
  listening: "L",
  writing: "W",
  speaking: "S",
};

const SKILL_FILTERS = [
  { key: "ALL", label: "Tất cả" },
  { key: "reading", label: "Reading", icon: BookOpen },
  { key: "listening", label: "Listening", icon: Headphones },
  { key: "writing", label: "Writing", icon: PenLine },
  { key: "speaking", label: "Speaking", icon: Mic },
];

function analyzePracticeErrors(results: PracticeResultRow[]): ExerciseStat[] {
  const stats: Record<string, { title: string; skill: string; questionType: string; wrong: number; total: number; attempts: number }> = {};

  for (const r of results) {
    if (!r.total_questions || r.total_questions === 0) continue;
    const key = r.exercise_id;
    if (!stats[key]) {
      stats[key] = {
        title: r.exercise_title,
        skill: r.skill,
        questionType: r.question_type,
        wrong: 0,
        total: 0,
        attempts: 0,
      };
    }
    const wrong = r.total_questions - r.correct_answers;
    stats[key].wrong += wrong;
    stats[key].total += r.total_questions;
    stats[key].attempts++;
  }

  return Object.entries(stats)
    .filter(([_, s]) => s.total >= 3)
    .map(([id, s]) => ({
      exerciseId: id,
      title: s.title,
      skill: s.skill,
      questionType: s.questionType,
      wrongCount: s.wrong,
      totalCount: s.total,
      wrongRate: s.wrong / s.total,
      attempts: s.attempts,
    }))
    .filter(s => s.wrongRate > 0.2)
    .sort((a, b) => b.wrongRate - a.wrongRate)
    .slice(0, 8);
}

export default function PracticeErrorStats({ results, range }: Props) {
  const navigate = useNavigate();
  const [skillFilter, setSkillFilter] = useState("ALL");
  const weakExercises = useMemo(() => analyzePracticeErrors(results), [results]);
  const filtered = useMemo(
    () => skillFilter === "ALL" ? weakExercises : weakExercises.filter(w => w.skill === skillFilter),
    [weakExercises, skillFilter],
  );

  if (weakExercises.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
          Bài tập hay sai nhất
          {range && <AnalyticsRangeBadge range={range} className="normal-case tracking-normal" />}
        </h2>
        <div className="flex gap-1">
          {SKILL_FILTERS.map(sf => (
            <button
              key={sf.key}
              onClick={() => setSkillFilter(sf.key)}
              className={cn(
                "text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors",
                skillFilter === sf.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {sf.label}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="grid gap-0 divide-y">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">Không có dữ liệu</div>
          ) : (
            filtered.map((w) => {
              const pct = Math.round(w.wrongRate * 100);
              return (
                <button
                  key={w.exerciseId}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors group"
                  onClick={() => navigate(`/practice/${w.exerciseId}/stats`)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{w.title}</span>
                      <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-muted rounded shrink-0">
                        {SKILL_LABELS[w.skill] || w.skill}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {w.questionType.replace(/_/g, " ")} · {w.attempts} lượt làm
                    </p>
                    <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          pct >= 70 ? "bg-red-500" : pct >= 50 ? "bg-orange-500" : "bg-amber-500",
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={cn(
                      "text-sm font-bold",
                      pct >= 70 ? "text-red-600 dark:text-red-400" : pct >= 50 ? "text-orange-600 dark:text-orange-400" : "text-amber-600 dark:text-amber-400",
                    )}>
                      {pct}%
                    </span>
                    <p className="text-[10px] text-muted-foreground">{w.wrongCount}/{w.totalCount} sai</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
