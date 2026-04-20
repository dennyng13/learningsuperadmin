import { useMemo } from "react";
import { Input } from "@shared/components/ui/input";
import { FormInput, Plus, X } from "lucide-react";
import { extractBlanks } from "@shared/components/exam/BlankRenderer";

interface BlankAnswerKeySyncProps {
  /** HTML content containing blanks (ielts-blank marks or [blank_x] shortcodes) */
  html: string;
  /** Current answers keyed by question index (0-based within this group) */
  answers: Record<number, string>;
  /** Called when an answer changes — keyed by blank number */
  onAnswersChange: (answers: Record<number, string>) => void;
  /** Called when user clicks/focuses an answer field — passes the blank number */
  onBlankFocus?: (blankNumber: number) => void;
  /** Base question number for this group */
  startQuestionNumber?: number;
}

/**
 * Parses blanks from rich text HTML and renders auto-synced answer key inputs.
 * Supports both ielts-blank marks and [blank_x] shortcodes.
 * Supports alternative answers separated by "|".
 */
export default function BlankAnswerKeySync({
  html,
  answers,
  onAnswersChange,
  onBlankFocus,
  startQuestionNumber = 1,
}: BlankAnswerKeySyncProps) {
  const blanks = useMemo(() => extractBlanks(html, startQuestionNumber), [html, startQuestionNumber]);

  if (blanks.length === 0) {
    return (
      <div className="text-xs text-muted-foreground/60 italic px-1 py-2">
        Chưa có ô trống nào. <strong>Bôi đen chữ</strong> rồi bấm nút <strong>Blank</strong> trên thanh công cụ để tạo ô trống — chữ được bôi sẽ tự động trở thành đáp án.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <FormInput className="h-3.5 w-3.5" />
        <span>Answer Key ({blanks.length} blanks)</span>
      </div>
      <div className="space-y-3">
        {blanks.map((blank) => {
          const raw = answers[blank.blankNum] || "";
          const alternatives = raw ? raw.split("|").map(a => a.trim()) : [""];
          const entries = alternatives.length > 0 && alternatives[0] !== "" ? alternatives : (blank.text ? [blank.text] : [""]);

          const updateAlternatives = (newAlts: string[]) => {
            const joined = newAlts.filter(a => a.trim() !== "").join("|");
            onAnswersChange({ ...answers, [blank.blankNum]: joined });
          };

          return (
            <div key={blank.blankNum} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary min-w-[50px] shrink-0">
                  Q{blank.questionNumber}
                </span>
                <Input
                  id={`blank-answer-${blank.blankNum}`}
                  value={entries[0] || ""}
                  onChange={(e) => {
                    const newAlts = [...entries];
                    newAlts[0] = e.target.value;
                    updateAlternatives(newAlts);
                  }}
                  onFocus={() => onBlankFocus?.(blank.blankNum)}
                  placeholder={blank.text ? `Đáp án: ${blank.text}` : `Đáp án cho Q${blank.questionNumber}`}
                  className="rounded-lg text-xs h-8 border-primary/30 flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newAlts = [...entries, ""];
                    updateAlternatives(newAlts);
                    // Force re-render with empty alternative
                    onAnswersChange({ ...answers, [blank.blankNum]: [...entries, ""].join("|") });
                  }}
                  className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
                  title="Thêm đáp án thay thế"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              {/* Alternative answers */}
              {entries.slice(1).map((alt, altIdx) => (
                <div key={altIdx} className="flex items-center gap-2 ml-[58px]">
                  <span className="text-[10px] text-muted-foreground/60 min-w-[24px] shrink-0 italic">or</span>
                  <Input
                    value={alt}
                    onChange={(e) => {
                      const newAlts = [...entries];
                      newAlts[altIdx + 1] = e.target.value;
                      updateAlternatives(newAlts);
                    }}
                    placeholder={`Đáp án thay thế ${altIdx + 1}`}
                    className="rounded-lg text-xs h-7 border-dashed border-muted-foreground/30 flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newAlts = entries.filter((_, i) => i !== altIdx + 1);
                      updateAlternatives(newAlts);
                    }}
                    className="p-0.5 rounded text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    title="Xóa đáp án thay thế"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
