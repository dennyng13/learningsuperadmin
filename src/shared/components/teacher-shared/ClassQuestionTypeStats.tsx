import { useMemo, useState } from "react";
import { AlertTriangle, BookOpen, Headphones } from "lucide-react";
import { cn } from "@shared/lib/utils";
import { QUESTION_TYPE_LABELS_VI } from "@shared/utils/questionTypes";
import {
  type AnalyticsRange,
  AnalyticsRangeBadge,
} from "@shared/components/dashboard/analyticsRange";

interface TestResultRow {
  user_id: string;
  section_type: string;
  answers: Record<string, string> | null;
  parts_data: any[] | null;
}

interface Props {
  results: TestResultRow[];
  range?: AnalyticsRange;
}

// QUESTION_TYPE_LABELS_VI is now imported from shared utilities.

interface TypeStat {
  type: string;
  label: string;
  wrongCount: number;
  totalCount: number;
  wrongRate: number;
  skill: string;
}

function analyzeClassQuestionTypes(results: TestResultRow[]): TypeStat[] {
  const typeStats: Record<string, { wrong: number; total: number; skill: string }> = {};

  for (const result of results) {
    const answers = result.answers;
    const parts = result.parts_data;
    if (!answers || !parts || typeof answers !== "object" || Object.keys(answers).length === 0) continue;

    for (const part of parts) {
      const groups = part.questionGroups || part.question_groups || [];
      for (const group of groups) {
        const qType = group.type || group.question_type || "UNKNOWN";
        const questions = group.questions || [];
        for (const q of questions) {
          const qId = q.id || `q${q.questionNumber || q.question_number}`;
          const studentAnswer = answers[qId] || answers[String(q.questionNumber || q.question_number)];
          if (studentAnswer === undefined || studentAnswer === null || studentAnswer === "") continue;

          const key = `${result.section_type}::${qType}`;
          if (!typeStats[key]) typeStats[key] = { wrong: 0, total: 0, skill: result.section_type };
          typeStats[key].total++;

          const correct = (q.correctAnswer || q.correct_answer || "").trim();
          const alts = correct.split("|").map(a => a.trim().toLowerCase()).filter(Boolean);
          const student = String(studentAnswer).trim().toLowerCase();
          if (!alts.some(a => student === a)) {
            typeStats[key].wrong++;
          }
        }
      }
    }
  }

  return Object.entries(typeStats)
    .filter(([_, s]) => s.total >= 3)
    .map(([key, s]) => {
      const qType = key.split("::")[1];
      return {
        type: qType,
        label: QUESTION_TYPE_LABELS_VI[qType] || qType.replace(/_/g, " ").toLowerCase(),
        wrongCount: s.wrong,
        totalCount: s.total,
        wrongRate: s.wrong / s.total,
        skill: s.skill,
      };
    })
    .filter(s => s.wrongRate > 0.25)
    .sort((a, b) => b.wrongRate - a.wrongRate)
    .slice(0, 8);
}

const SKILL_ICON: Record<string, typeof BookOpen> = {
  READING: BookOpen,
  LISTENING: Headphones,
};

const SKILL_FILTERS = [
  { key: "ALL", label: "Tất cả" },
  { key: "READING", label: "Reading", icon: BookOpen },
  { key: "LISTENING", label: "Listening", icon: Headphones },
];

export default function ClassQuestionTypeStats({ results, range }: Props) {
  const [skillFilter, setSkillFilter] = useState("ALL");
  const weakTypes = useMemo(() => analyzeClassQuestionTypes(results), [results]);
  const filtered = useMemo(
    () => skillFilter === "ALL" ? weakTypes : weakTypes.filter(w => w.skill === skillFilter),
    [weakTypes, skillFilter]
  );

  if (weakTypes.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
          Dạng câu hỏi hay sai (cả lớp)
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
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
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
                <div key={`${w.skill}-${w.type}`} className="px-4 py-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{w.label}</span>
                      <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                        {w.skill === "READING" ? "R" : w.skill === "LISTENING" ? "L" : w.skill}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          pct >= 70 ? "bg-red-500" : pct >= 50 ? "bg-orange-500" : "bg-amber-500"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={cn(
                      "text-sm font-bold",
                      pct >= 70 ? "text-red-600 dark:text-red-400" : pct >= 50 ? "text-orange-600 dark:text-orange-400" : "text-amber-600 dark:text-amber-400"
                    )}>
                      {pct}%
                    </span>
                    <p className="text-[10px] text-muted-foreground">{w.wrongCount}/{w.totalCount} sai</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
