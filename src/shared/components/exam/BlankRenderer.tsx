import { useCallback, useMemo } from "react";
import { cn } from "@shared/lib/utils";
import { isCorrectAnswer } from "@shared/utils/answerComparison";

interface BlankRendererProps {
  /** HTML string that may contain [blank_x] shortcodes or <span class="ielts-blank"> marks */
  html: string;
  /** Current answers keyed by question number */
  answers: Record<number, string>;
  /** Called when a student types into a blank */
  onAnswer: (questionNumber: number, value: string) => void;
  /** Whether to show correct/incorrect feedback */
  showResults?: boolean;
  /** Correct answers keyed by question number (for result mode) */
  correctAnswers?: Record<number, string>;
  /** Additional class for the wrapper */
  className?: string;
  /** Whether inputs are disabled */
  disabled?: boolean;
  /** Base question number for this group (blanks are numbered sequentially from this) */
  startQuestionNumber?: number;
}

/**
 * Parses HTML to find all blanks (both formats) and returns their count.
 */
export function countBlanks(html: string): number {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const markBlanks = doc.querySelectorAll(".ielts-blank[data-blank-num]").length;
  const shortcodeBlanks = (html.match(/\[blank_\d+\]/g) || []).length;
  return markBlanks + shortcodeBlanks;
}

/**
 * Extracts blank info from HTML: { blankNum, text (answer from mark), questionNumber }
 */
export function extractBlanks(html: string, startQuestionNumber = 1): Array<{
  blankNum: number;
  text: string; // text content from mark (auto-answer), empty for shortcodes
  questionNumber: number;
}> {
  const result: Array<{ blankNum: number; text: string; questionNumber: number }> = [];
  
  // Parse ielts-blank marks
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const marks = doc.querySelectorAll(".ielts-blank[data-blank-num]");
  marks.forEach((el) => {
    const num = parseInt(el.getAttribute("data-blank-num") || "0");
    if (num > 0) {
      result.push({ blankNum: num, text: el.textContent?.trim() || "", questionNumber: 0 });
    }
  });

  // Parse [blank_x] shortcodes
  const regex = /\[blank_(\d+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const num = parseInt(match[1]);
    result.push({ blankNum: num, text: "", questionNumber: 0 });
  }

  // Sort by blank number, assign sequential question numbers
  result.sort((a, b) => a.blankNum - b.blankNum);
  result.forEach((item, idx) => {
    item.questionNumber = startQuestionNumber + idx;
  });

  return result;
}

/**
 * Renders rich HTML content and replaces blanks with interactive <input> fields.
 * Supports both:
 * - <span class="ielts-blank" data-blank-num="x">text</span> (new mark format)
 * - [blank_x] shortcodes (legacy format)
 */
export default function BlankRenderer({
  html,
  answers,
  onAnswer,
  showResults,
  correctAnswers,
  className,
  disabled,
  startQuestionNumber = 1,
}: BlankRendererProps) {
  // Check if there are any blanks
  const hasBlanks = useMemo(() => {
    return /\[blank_\d+\]/.test(html) || /class="ielts-blank"/.test(html);
  }, [html]);

  if (!hasBlanks) {
    return (
      <div
        className={cn("prose prose-sm max-w-none rich-content", className)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div className={cn("rich-content", className)}>
      <BlankHtmlRenderer
        html={html}
        answers={answers}
        onAnswer={onAnswer}
        showResults={showResults}
        correctAnswers={correctAnswers}
        disabled={disabled}
        startQuestionNumber={startQuestionNumber}
      />
    </div>
  );
}

/**
 * Renders HTML with blanks as actual DOM,
 * replacing blank elements with React-controlled inputs.
 */
function BlankHtmlRenderer({
  html,
  answers,
  onAnswer,
  showResults,
  correctAnswers,
  disabled,
  startQuestionNumber,
}: {
  html: string;
  answers: Record<number, string>;
  onAnswer: (questionNumber: number, value: string) => void;
  showResults?: boolean;
  correctAnswers?: Record<number, string>;
  disabled?: boolean;
  startQuestionNumber: number;
}) {
  const containerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;

      // Pre-process HTML: convert [blank_x] shortcodes to span markers
      let processedHtml = html.replace(
        /\[blank_(\d+)\]/g,
        (_, num) => `<span class="ielts-blank blank-input-marker" data-blank-num="${num}"></span>`
      );
      
      node.innerHTML = processedHtml;

      // Collect all blank elements sorted by blank number
      const blankEls = Array.from(node.querySelectorAll(".ielts-blank[data-blank-num]"));
      blankEls.sort((a, b) => {
        const numA = parseInt(a.getAttribute("data-blank-num") || "0");
        const numB = parseInt(b.getAttribute("data-blank-num") || "0");
        return numA - numB;
      });

      // Replace each blank with an input
      blankEls.forEach((el, idx) => {
        const blankNum = parseInt(el.getAttribute("data-blank-num") || "0");
        if (blankNum === 0) return;
        const questionNumber = startQuestionNumber + idx;

        // Create wrapper
        const wrapper = document.createElement("span");
        wrapper.className = "inline-flex items-baseline gap-0.5";

        // Question number badge
        const badge = document.createElement("span");
        badge.className = cn(
          "inline-flex items-center justify-center",
          "text-[10px] font-bold rounded px-1 py-0 shrink-0",
          "bg-primary/10 text-primary border border-primary/20"
        );
        badge.textContent = String(questionNumber);

        // Input field
        const input = document.createElement("input");
        input.type = "text";
        input.value = answers[questionNumber] ?? "";
        input.setAttribute("data-question-num", String(questionNumber));
        input.placeholder = `(${questionNumber})`;
        input.disabled = disabled || showResults || false;
        input.autocomplete = "off";

        input.className = cn(
          "inline-block border-b-2 bg-primary/5 outline-none px-2 py-0.5",
          "min-w-[100px] text-center font-medium transition-all rounded-t-sm text-sm",
          "focus:border-primary focus:bg-primary/10",
          "border-primary/40"
        );

        // Result styling
        if (showResults && correctAnswers) {
          const correct = correctAnswers[questionNumber];
          const userAnswer = (answers[questionNumber] || "").trim();
          const isCorrect2 = correct && isCorrectAnswer(userAnswer, correct);

          if (isCorrect2) {
            input.className = cn(input.className, "border-primary bg-primary/10 text-primary");
          } else {
            input.className = cn(input.className, "border-destructive bg-destructive/10 text-destructive");
            // Show the primary (first) correct answer as hint
            const primaryAnswer = correct?.split("|")[0]?.trim() || correct;
            const hint = document.createElement("span");
            hint.className = "text-xs text-primary ml-1 font-medium";
            hint.textContent = `(${primaryAnswer})`;
            wrapper.appendChild(badge);
            wrapper.appendChild(input);
            wrapper.appendChild(hint);
            el.replaceWith(wrapper);
            input.addEventListener("input", (e) => {
              onAnswer(questionNumber, (e.target as HTMLInputElement).value);
            });
            return;
          }
        }

        input.addEventListener("input", (e) => {
          onAnswer(questionNumber, (e.target as HTMLInputElement).value);
        });

        wrapper.appendChild(badge);
        wrapper.appendChild(input);
        el.replaceWith(wrapper);
      });
    },
    [html, answers, onAnswer, showResults, correctAnswers, disabled, startQuestionNumber]
  );

  return <div ref={containerRef} className="prose prose-sm max-w-none [&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5 [&_td]:text-sm [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-sm [&_th]:font-bold [&_th]:bg-muted/50" />;
}
