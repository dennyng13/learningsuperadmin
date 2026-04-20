import { cn } from "@shared/lib/utils";
import { UserAnswers, Part } from "@shared/types/exam";
import { Flag } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";

export interface PartRange {
  label: string;
  start: number;
  end: number;
}

interface QuestionPaletteProps {
  totalQuestions: number;
  answers: UserAnswers;
  currentQuestion: number;
  onQuestionClick: (num: number) => void;
  showResults?: boolean;
  correctAnswers?: Record<number, string>;
  markedQuestions?: Set<number>;
  onToggleMark?: (num: number) => void;
  parts?: Part[];
  onPartClick?: (partIndex: number) => void;
  currentPartIndex?: number;
}

function derivePartRanges(parts?: Part[]): PartRange[] | null {
  if (!parts || parts.length <= 1) return null;
  return parts.map((p) => {
    const allNums = p.questionGroups.flatMap((g) =>
      g.questions.map((q) => q.questionNumber)
    );
    return {
      label: p.title || `Part ${p.order}`,
      start: Math.min(...allNums),
      end: Math.max(...allNums),
    };
  });
}

export function QuestionPalette({
  totalQuestions,
  answers,
  currentQuestion,
  onQuestionClick,
  showResults,
  correctAnswers,
  markedQuestions = new Set(),
  onToggleMark,
  parts,
  onPartClick,
  currentPartIndex,
}: QuestionPaletteProps) {
  const getStatus = (num: number) => {
    if (showResults && correctAnswers) {
      const userAnswer = answers[num]?.trim().toLowerCase();
      const correct = correctAnswers[num]?.trim() || "";
      if (!userAnswer) return "unanswered";
      const alts = correct.split("|").map(a => a.trim().toLowerCase()).filter(Boolean);
      return alts.some(a => userAnswer === a) ? "correct" : "incorrect";
    }
    return answers[num] ? "answered" : "unanswered";
  };

  const answeredCount = Object.keys(answers).filter((k) => answers[Number(k)]?.trim()).length;
  const markedCount = markedQuestions.size;
  const unansweredCount = totalQuestions - answeredCount;

  let correctCount = 0;
  let incorrectCount = 0;
  let skippedCount = 0;

  if (showResults && correctAnswers) {
    for (let i = 1; i <= totalQuestions; i++) {
      const s = getStatus(i);
      if (s === "correct") correctCount++;
      else if (s === "incorrect") incorrectCount++;
      else skippedCount++;
    }
  }

  const progressPercent = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
  const partRanges = derivePartRanges(parts);

  const getTooltipLabel = (num: number, status: string, isMarked: boolean) => {
    if (showResults) {
      if (status === "correct") return `Câu ${num}: Đúng`;
      if (status === "incorrect") return `Câu ${num}: Sai`;
      return `Câu ${num}: Bỏ qua`;
    }
    const parts: string[] = [`Câu ${num}`];
    if (status === "answered") parts.push("– Đã trả lời");
    else parts.push("– Chưa trả lời");
    if (isMarked) parts.push("(đã đánh dấu)");
    return parts.join(" ");
  };

  const renderQuestionButton = (num: number) => {
    const status = getStatus(num);
    const isMarked = markedQuestions.has(num);
    const isCurrent = num === currentQuestion;
    return (
      <div key={num} className="relative">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onQuestionClick(num)}
              onContextMenu={(e) => {
                e.preventDefault();
                onToggleMark?.(num);
              }}
              className={cn(
                "w-full aspect-square rounded-md text-xs font-bold transition-all duration-200 ease-in-out border",
                "hover:scale-105 active:scale-95",
                isCurrent && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                !showResults && status === "answered" && "bg-primary text-primary-foreground border-primary",
                !showResults && status === "unanswered" && "bg-card text-foreground border-border hover:border-primary/50",
                showResults && status === "correct" && "bg-exam-correct text-white border-exam-correct",
                showResults && status === "incorrect" && "bg-exam-incorrect text-white border-exam-incorrect",
                showResults && status === "unanswered" && "bg-exam-unanswered/80 text-white border-exam-unanswered",
                !showResults && isMarked && "!border-accent border-2"
              )}
            >
              {num}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {getTooltipLabel(num, status, isMarked)}
          </TooltipContent>
        </Tooltip>
        {isMarked && !showResults && (
          <Flag className="absolute -top-1 -right-1 h-3 w-3 text-accent fill-accent drop-shadow-sm" />
        )}
      </div>
    );
  };

  return (
    <TooltipProvider delayDuration={400}>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h3 className="font-display text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Question Palette
          </h3>
        </div>

        {/* Progress bar (exam mode) */}
        {!showResults && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold text-foreground">
                {answeredCount}/{totalQuestions}
              </span>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden cursor-pointer">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs space-y-1 py-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-primary shrink-0" />
                  <span>Answered: {answeredCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm border border-border bg-card shrink-0" />
                  <span>Not answered: {unansweredCount}</span>
                </div>
                {markedCount > 0 && (
                  <div className="flex items-center gap-2">
                    <Flag className="h-2.5 w-2.5 text-accent fill-accent shrink-0" />
                    <span>Marked: {markedCount}</span>
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
            {markedCount > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-accent font-semibold">
                <Flag className="h-3 w-3 fill-accent" />
                {markedCount} marked
              </div>
            )}
          </div>
        )}

        {/* Results summary */}
        {showResults && (
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="bg-exam-correct/10 rounded-lg py-1.5 px-1">
              <div className="text-base font-bold text-exam-correct">{correctCount}</div>
              <div className="text-[9px] text-muted-foreground font-medium">Correct</div>
            </div>
            <div className="bg-exam-incorrect/10 rounded-lg py-1.5 px-1">
              <div className="text-base font-bold text-exam-incorrect">{incorrectCount}</div>
              <div className="text-[9px] text-muted-foreground font-medium">Incorrect</div>
            </div>
            <div className="bg-exam-unanswered/10 rounded-lg py-1.5 px-1">
              <div className="text-base font-bold text-exam-unanswered">{skippedCount}</div>
              <div className="text-[9px] text-muted-foreground font-medium">Skipped</div>
            </div>
          </div>
        )}

        {/* Question grid — grouped by parts */}
        {partRanges ? (
          <div className="space-y-3">
            {partRanges.map((pr, idx) => {
              const nums = Array.from({ length: pr.end - pr.start + 1 }, (_, i) => pr.start + i);
              const partAnswered = nums.filter((n) => answers[n]?.trim()).length;
              return (
              <div key={pr.label} className={cn(
                "rounded-lg p-1.5 transition-colors",
                currentPartIndex === idx && "bg-primary/5"
              )}>
                  <button
                    onClick={() => onPartClick?.(idx)}
                    className="flex items-center justify-between mb-1.5 w-full text-left group"
                  >
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-wide transition-colors",
                      currentPartIndex === idx ? "text-primary" : "text-foreground/70 group-hover:text-primary"
                    )}>
                      {pr.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {pr.start}–{pr.end} ({partAnswered}/{nums.length})
                    </span>
                  </button>
                  <div className="grid grid-cols-5 gap-1.5">
                    {nums.map(renderQuestionButton)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: totalQuestions }, (_, i) => i + 1).map(renderQuestionButton)}
          </div>
        )}

        {/* Legend */}
        {!showResults && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="w-3.5 h-3.5 rounded bg-primary shrink-0" />
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="w-3.5 h-3.5 rounded border border-border bg-card shrink-0" />
              <span>Not answered</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Flag className="h-3.5 w-3.5 text-accent fill-accent shrink-0" />
              <span>Marked (right-click)</span>
            </div>
          </div>
        )}
        {showResults && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="w-3.5 h-3.5 rounded bg-exam-correct shrink-0" />
              <span>Correct</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="w-3.5 h-3.5 rounded bg-exam-incorrect shrink-0" />
              <span>Incorrect</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="w-3.5 h-3.5 rounded bg-exam-unanswered shrink-0" />
              <span>Skipped</span>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
