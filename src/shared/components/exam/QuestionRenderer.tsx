import { useState, useMemo, useCallback } from "react";
import { QuestionGroup, Question, UserAnswers, QuestionType } from "@shared/types/exam";
import { cn } from "@shared/lib/utils";
import { Flag, Bookmark, BookOpen } from "lucide-react";
import BlankRenderer, { extractBlanks } from "./BlankRenderer";
import { isCorrectAnswer } from "@shared/utils/answerComparison";
import DiagramExamRenderer from "./DiagramExamRenderer";

interface QuestionRendererProps {
  questionGroup: QuestionGroup;
  answers: UserAnswers;
  onAnswer: (questionNumber: number, answer: string) => void;
  showResults?: boolean;
  activeQuestion?: number;
  markedQuestions?: Set<number>;
  onToggleMark?: (num: number) => void;
  savedQuestions?: Set<number>;
  onToggleSave?: (num: number, text: string) => void;
  onHighlightEvidence?: (text: string | null) => void;
}

/* ─── Utility: classify question type into rendering mode ─── */
type RenderMode = "tfng" | "ynng" | "mcq" | "mcq_pick2" | "matching" | "sentence_endings" | "completion";

function getRenderMode(type: QuestionType): RenderMode {
  // True / False / Not Given
  if (type === "IDENTIFYING_INFORMATION" || type === "r_identifying_information")
    return "tfng";
  // Yes / No / Not Given
  if (type === "r_identifying_views") return "ynng";
  // Multiple choice pick 2 from 5
  if (type === "MULTIPLE_CHOICE_MORE_ANSWERS") return "mcq_pick2";
  // Multiple choice single answer
  if (
    type === "MULTIPLE_CHOICE_ONE_ANSWER" ||
    type === "r_multiple_choice" ||
    type === "l_multiple_choice"
  )
    return "mcq";
  // Matching sentence endings — special split UI
  if (type === "r_matching_sentence_endings") return "sentence_endings";
  // Other matching types
  if (
    type === "MATCHING" ||
    type === "r_matching_information" ||
    type === "r_matching_headings" ||
    type === "r_matching_features" ||
    type === "l_matching" ||
    type === "l_plan_map_diagram"
  )
    return "matching";
  // Everything else is completion / fill-in
  return "completion";
}

/* ─── Shared sub-components ─── */

function SaveButton({
  num, text, savedQuestions, onToggleSave,
}: { num: number; text: string; savedQuestions: Set<number>; onToggleSave?: (n: number, t: string) => void }) {
  if (!onToggleSave) return null;
  const isSaved = savedQuestions.has(num);
  return (
    <button
      onClick={() => onToggleSave(num, text)}
      className={cn(
        "p-1 rounded transition-colors duration-200 shrink-0",
        isSaved ? "text-primary" : "text-muted-foreground/40 hover:text-primary/70"
      )}
      title={isSaved ? "Bỏ lưu" : "Lưu để học sau"}
    >
      <Bookmark className={cn("h-3.5 w-3.5", isSaved && "fill-primary")} />
    </button>
  );
}

function MarkButton({
  num, showResults, markedQuestions, onToggleMark,
}: { num: number; showResults?: boolean; markedQuestions: Set<number>; onToggleMark?: (n: number) => void }) {
  if (showResults || !onToggleMark) return null;
  const isMarked = markedQuestions.has(num);
  return (
    <button
      onClick={() => onToggleMark(num)}
      className={cn(
        "p-1 rounded transition-colors shrink-0",
        isMarked ? "text-accent" : "text-muted-foreground/40 hover:text-accent/70"
      )}
      title={isMarked ? "Bỏ đánh dấu" : "Đánh dấu câu hỏi"}
    >
      <Flag className={cn("h-3.5 w-3.5", isMarked && "fill-accent")} />
    </button>
  );
}

function QuestionWrapper({
  q, answers, onAnswer, showResults, activeQuestion, children, savedQuestions, onToggleSave, markedQuestions, onToggleMark, isCompletion, onHighlightEvidence,
}: {
  q: Question; answers: UserAnswers; showResults?: boolean; activeQuestion?: number;
  children: React.ReactNode;
  savedQuestions: Set<number>; onToggleSave?: (n: number, t: string) => void;
  markedQuestions: Set<number>; onToggleMark?: (n: number) => void;
  isCompletion?: boolean;
  onAnswer?: (n: number, a: string) => void;
  onHighlightEvidence?: (text: string | null) => void;
}) {
  const answered = answers[q.questionNumber];
  const isCorrect = isCorrectAnswer(answered, q.correctAnswer);

  // For completion: render title with inline input at _______
  const renderTitle = () => {
    if (isCompletion && q.title?.includes("_______") && onAnswer) {
      const parts = q.title.split("_______");
      return (
        <p className="text-sm font-medium mb-3 flex-1 flex flex-wrap items-center gap-y-1">
          <span className="font-display font-bold text-primary mr-2">{q.questionNumber}.</span>
          {parts[0]}
          <input
            type="text"
            value={answers[q.questionNumber] || ""}
            onChange={(e) => !showResults && onAnswer(q.questionNumber, e.target.value)}
            disabled={showResults}
            placeholder="..."
            className="question-input mx-1 inline-block"
          />
          {parts[1] || ""}
        </p>
      );
    }
    return (
      <p className="text-sm font-medium mb-3 flex-1">
        <span className="font-display font-bold text-primary mr-2">{q.questionNumber}.</span>
        {q.title}
      </p>
    );
  };

  return (
    <div
      id={`question-${q.questionNumber}`}
      className={cn(
        "p-4 rounded-lg border transition-all",
        activeQuestion === q.questionNumber && "border-primary bg-primary/5",
        !showResults && activeQuestion !== q.questionNumber && "border-border",
        showResults && isCorrect && "border-exam-correct bg-exam-correct/5",
        showResults && answered && !isCorrect && "border-exam-incorrect bg-exam-incorrect/5",
        showResults && !answered && "border-exam-unanswered bg-exam-unanswered/5"
      )}
    >
      <div className="flex items-start">
        {renderTitle()}
        <div className="flex items-center gap-0.5 ml-auto shrink-0">
          <SaveButton num={q.questionNumber} text={q.title || ""} savedQuestions={savedQuestions} onToggleSave={onToggleSave} />
          <MarkButton num={q.questionNumber} showResults={showResults} markedQuestions={markedQuestions} onToggleMark={onToggleMark} />
        </div>
      </div>
      {children}
      {showResults && answered && !isCorrect && (
        <p className="text-xs text-exam-correct mt-2 font-medium">
          Correct answer: {q.correctAnswer.replace(/_/g, " ")}
        </p>
      )}
      {showResults && q.explain && (
        <p className="text-xs text-muted-foreground mt-1 italic">
          {q.explain}
        </p>
      )}
      {showResults && q.passageEvidence && onHighlightEvidence && (
        <button
          type="button"
          onClick={() => onHighlightEvidence(q.passageEvidence!)}
          className="flex items-center gap-1 text-xs text-primary/80 hover:text-primary mt-1.5 transition-colors"
        >
          <BookOpen className="h-3 w-3" />
          <span className="underline underline-offset-2">Xem trong đoạn văn</span>
        </button>
      )}
    </div>
  );
}

/* ─── Option button renderers ─── */

function TFNGButtons({ q, answers, onAnswer, showResults, options }: {
  q: Question; answers: UserAnswers; onAnswer: (n: number, a: string) => void;
  showResults?: boolean; options: string[];
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => !showResults && onAnswer(q.questionNumber, option)}
          disabled={showResults}
          className={cn(
            "px-4 py-1.5 rounded-md text-sm font-medium transition-all border shadow-sm",
            answers[q.questionNumber] === option
              ? "bg-primary text-primary-foreground border-primary shadow-primary/20"
              : "bg-card text-foreground border-border hover:border-primary/50 hover:shadow-md",
            showResults && option === q.correctAnswer && "!bg-exam-correct !text-exam-header-foreground !border-exam-correct"
          )}
        >
          {option.replace(/_/g, " ")}
        </button>
      ))}
    </div>
  );
}

function MCQChoices({ q, answers, onAnswer, showResults }: {
  q: Question; answers: UserAnswers; onAnswer: (n: number, a: string) => void;
  showResults?: boolean;
}) {
  const letters = ["A", "B", "C", "D", "E", "F", "G", "H"];
  return (
    <div className="space-y-2">
      {q.choices?.map((choice, idx) => {
        const letter = letters[idx];
        return (
          <button
            key={choice.id}
            onClick={() => !showResults && onAnswer(q.questionNumber, letter)}
            disabled={showResults}
            className={cn(
              "w-full text-left px-4 py-2.5 rounded-md text-sm transition-all border flex items-start gap-3 shadow-sm",
              answers[q.questionNumber] === letter
                ? "bg-primary text-primary-foreground border-primary shadow-primary/20"
                : "bg-card text-foreground border-border hover:border-primary/50 hover:shadow-md",
              showResults && letter === q.correctAnswer && "!bg-exam-correct !text-exam-header-foreground !border-exam-correct"
            )}
          >
            <span className="font-display font-bold shrink-0">{letter}</span>
            <span>{choice.content}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Pick 2 from 5 MCQ (shared choices, each pick = separate question) ─── */

function MCQPick2UI({
  questionGroup, answers, onAnswer, showResults, activeQuestion,
  savedQuestions, onToggleSave, markedQuestions, onToggleMark,
}: {
  questionGroup: QuestionGroup; answers: UserAnswers;
  onAnswer: (n: number, a: string) => void; showResults?: boolean;
  activeQuestion?: number;
  savedQuestions: Set<number>; onToggleSave?: (n: number, t: string) => void;
  markedQuestions: Set<number>; onToggleMark?: (n: number) => void;
}) {
  const questions = questionGroup.questions;
  const choices = questionGroup.choices || questions[0]?.choices || [];
  const letters = ["A", "B", "C", "D", "E", "F", "G", "H"];

  // Collect all selected letters across all questions in this group
  const selectedLetters = new Set(
    questions.map(q => answers[q.questionNumber]).filter(Boolean)
  );

  // Correct answers set for highlighting in review mode
  const correctAnswerSet = new Set(questions.map(q => q.correctAnswer));

  const handleSelect = (letter: string) => {
    if (showResults) return;

    // If already selected by a question, deselect it
    const existingQ = questions.find(q => answers[q.questionNumber] === letter);
    if (existingQ) {
      onAnswer(existingQ.questionNumber, "");
      return;
    }

    // Find first question without an answer and assign this letter
    const emptyQ = questions.find(q => !answers[q.questionNumber]);
    if (emptyQ) {
      onAnswer(emptyQ.questionNumber, letter);
    }
  };

  return (
    <div className="space-y-4">
      {/* Instruction */}
      <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
        Chọn <strong>2</strong> đáp án đúng. Mỗi đáp án được tính 1 điểm.
      </p>

      {/* Question numbers display */}
      <div className="flex items-center gap-2 text-sm">
        {questions.map(q => {
          const answered = answers[q.questionNumber];
          const isCorrect = showResults && answered && correctAnswerSet.has(answered);
          const isWrong = showResults && answered && !correctAnswerSet.has(answered);
          return (
            <div key={q.id} className="flex items-center gap-1.5">
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-bold",
                !showResults && answered && "bg-primary/10 border-primary/30 text-primary",
                !showResults && !answered && "bg-muted border-border text-muted-foreground",
                isCorrect && "bg-exam-correct/10 border-exam-correct text-exam-correct",
                isWrong && "bg-exam-incorrect/10 border-exam-incorrect text-exam-incorrect",
              )}>
                <span className="font-display">{q.questionNumber}.</span>
                <span>{answered || "?"}</span>
              </div>
              <div className="flex items-center gap-0.5">
                <SaveButton num={q.questionNumber} text={q.title || questionGroup.title || ""} savedQuestions={savedQuestions} onToggleSave={onToggleSave} />
                <MarkButton num={q.questionNumber} showResults={showResults} markedQuestions={markedQuestions} onToggleMark={onToggleMark} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Shared choices */}
      <div className="space-y-2">
        {choices.map((choice, idx) => {
          const letter = letters[idx];
          const isSelected = selectedLetters.has(letter);
          const isCorrect = correctAnswerSet.has(letter);
          return (
            <button
              key={choice.id}
              onClick={() => handleSelect(letter)}
              disabled={showResults || (!isSelected && selectedLetters.size >= questions.length)}
              className={cn(
                "w-full text-left px-4 py-2.5 rounded-md text-sm transition-all border flex items-start gap-3 shadow-sm",
                isSelected && !showResults
                  ? "bg-primary text-primary-foreground border-primary shadow-primary/20"
                  : "bg-card text-foreground border-border hover:border-primary/50 hover:shadow-md",
                !isSelected && !showResults && selectedLetters.size >= questions.length && "opacity-50 cursor-not-allowed",
                showResults && isCorrect && "!bg-exam-correct !text-exam-header-foreground !border-exam-correct",
                showResults && isSelected && !isCorrect && "!bg-exam-incorrect/20 !border-exam-incorrect !text-exam-incorrect",
              )}
            >
              <span className="font-display font-bold shrink-0">{letter}</span>
              <span>{choice.content}</span>
            </button>
          );
        })}
      </div>

      {/* Show correct answers in review */}
      {showResults && (
        <p className="text-xs text-exam-correct font-medium">
          Đáp án đúng: {questions.map(q => q.correctAnswer).join(", ")}
        </p>
      )}
    </div>
  );
}

function MatchingInput({ q, answers, onAnswer, showResults, groupChoices }: {
  q: Question; answers: UserAnswers; onAnswer: (n: number, a: string) => void;
  showResults?: boolean; groupChoices?: { id: string; content: string; order: number }[];
}) {
  // If group-level choices exist, show a mini-select; otherwise show text input
  if (groupChoices && groupChoices.length > 0) {
    const letters = groupChoices.map((_, i) => String.fromCharCode(65 + i));
    return (
      <div className="flex gap-2 flex-wrap">
        {letters.map((letter) => (
          <button
            key={letter}
            onClick={() => !showResults && onAnswer(q.questionNumber, letter)}
            disabled={showResults}
            className={cn(
              "w-9 h-9 rounded-md text-sm font-bold transition-all border shadow-sm flex items-center justify-center",
              answers[q.questionNumber] === letter
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:border-primary/50",
              showResults && letter === q.correctAnswer && "!bg-exam-correct !text-exam-header-foreground !border-exam-correct"
            )}
          >
            {letter}
          </button>
        ))}
      </div>
    );
  }
  return (
    <input
      type="text"
      value={answers[q.questionNumber] || ""}
      onChange={(e) => !showResults && onAnswer(q.questionNumber, e.target.value.toUpperCase())}
      disabled={showResults}
      placeholder="A, B, C..."
      className="question-input w-20 text-center uppercase"
    />
  );
}

function CompletionInput({ q, answers, onAnswer, showResults }: {
  q: Question; answers: UserAnswers; onAnswer: (n: number, a: string) => void;
  showResults?: boolean;
}) {
  const parts = q.title?.split("_______") || [""];
  return (
    <p className="text-sm">
      {parts[0]}
      <input
        type="text"
        value={answers[q.questionNumber] || ""}
        onChange={(e) => !showResults && onAnswer(q.questionNumber, e.target.value)}
        disabled={showResults}
        placeholder="Your answer"
        className="question-input mx-1"
      />
      {parts[1] || ""}
    </p>
  );
}

/* ─── Sentence Endings (split layout with drag-like selection) ─── */

function SentenceEndingsUI({
  questionGroup, answers, onAnswer, showResults, activeQuestion,
  savedQuestions, onToggleSave, markedQuestions, onToggleMark,
}: {
  questionGroup: QuestionGroup; answers: UserAnswers;
  onAnswer: (n: number, a: string) => void; showResults?: boolean;
  activeQuestion?: number;
  savedQuestions: Set<number>; onToggleSave?: (n: number, t: string) => void;
  markedQuestions: Set<number>; onToggleMark?: (n: number) => void;
}) {
  const [activeQ, setActiveQ] = useState<number | null>(null);
  const choices = questionGroup.choices || [];
  const letters = choices.map((_, i) => String.fromCharCode(65 + i));

  // Which letters are already used by other questions
  const usedLetters = new Set(
    questionGroup.questions
      .filter((q) => answers[q.questionNumber] && q.questionNumber !== activeQ)
      .map((q) => answers[q.questionNumber])
  );

  const handleSelectEnding = (letter: string) => {
    if (showResults || activeQ === null) return;
    onAnswer(activeQ, letter);
    // Auto-advance to next unanswered
    const nextQ = questionGroup.questions.find(
      (q) => q.questionNumber !== activeQ && !answers[q.questionNumber]
    );
    setActiveQ(nextQ ? nextQ.questionNumber : null);
  };

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
        Chọn một nửa câu bên trái, sau đó chọn phần kết thúc phù hợp bên phải.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: sentence stems */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Sentence stems</p>
          {questionGroup.questions.map((q) => {
            const isActive = activeQ === q.questionNumber || activeQuestion === q.questionNumber;
            const answered = answers[q.questionNumber];
            const isCorrect = isCorrectAnswer(answered, q.correctAnswer);
            return (
              <button
                key={q.id}
                onClick={() => !showResults && setActiveQ(q.questionNumber)}
                disabled={showResults}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all",
                  isActive && !showResults && "border-primary bg-primary/5 ring-1 ring-primary/30",
                  !isActive && !showResults && !answered && "border-border hover:border-primary/40",
                  !isActive && !showResults && answered && "border-primary/30 bg-primary/5",
                  showResults && isCorrect && "border-exam-correct bg-exam-correct/5",
                  showResults && answered && !isCorrect && "border-exam-incorrect bg-exam-incorrect/5",
                  showResults && !answered && "border-exam-unanswered bg-exam-unanswered/5",
                )}
              >
                <div className="flex items-start gap-2">
                  <span className="font-display font-bold text-primary shrink-0">{q.questionNumber}.</span>
                  <span className="flex-1">{q.title}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {answered && (
                      <span className={cn(
                        "w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold",
                        showResults && answered !== q.correctAnswer
                          ? "bg-exam-incorrect/20 text-exam-incorrect"
                          : "bg-primary/15 text-primary"
                      )}>
                        {answered}
                      </span>
                    )}
                    <SaveButton num={q.questionNumber} text={q.title || ""} savedQuestions={savedQuestions} onToggleSave={onToggleSave} />
                    <MarkButton num={q.questionNumber} showResults={showResults} markedQuestions={markedQuestions} onToggleMark={onToggleMark} />
                  </div>
                </div>
                {showResults && answered && answered !== q.correctAnswer && (
                  <p className="text-xs text-exam-correct mt-1 font-medium pl-6">
                    → {q.correctAnswer}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: ending options */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Sentence endings</p>
          {choices.map((choice, i) => {
            const letter = letters[i];
            const isUsed = usedLetters.has(letter) || (activeQ !== null && answers[activeQ] === letter);
            const isSelectedByActive = activeQ !== null && answers[activeQ] === letter;
            // In results mode, highlight correct answers
            const isCorrectForAny = showResults && questionGroup.questions.some(
              (q) => q.correctAnswer === letter
            );
            return (
              <button
                key={choice.id}
                onClick={() => handleSelectEnding(letter)}
                disabled={showResults || activeQ === null}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all",
                  activeQ === null && !showResults && "opacity-50 cursor-not-allowed border-border",
                  activeQ !== null && !showResults && !isUsed && "border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer",
                  isSelectedByActive && !showResults && "border-primary bg-primary/10 ring-1 ring-primary/30",
                  isUsed && !isSelectedByActive && !showResults && "opacity-40 border-border",
                  showResults && isCorrectForAny && "border-exam-correct/50 bg-exam-correct/5",
                  showResults && !isCorrectForAny && "opacity-50",
                )}
              >
                <div className="flex items-start gap-2">
                  <span className={cn(
                    "w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0",
                    isSelectedByActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {letter}
                  </span>
                  <span className="flex-1">{choice.content}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Completion style map (module-level constant) ─── */
const COMPLETION_STYLE_MAP: Record<string, { className: string; title: string }> = {
  l_form_note_table_completion: { className: "ielts-form-box", title: "Form Completion" },
  form_completion: { className: "ielts-form-box", title: "Form Completion" },
  note_completion: { className: "ielts-note-box", title: "Note Completion" },
  table_completion: { className: "ielts-table-box", title: "Table Completion" },
  r_summary_completion: { className: "ielts-summary-box", title: "Summary Completion" },
  summary_completion: { className: "ielts-summary-box", title: "Summary Completion" },
  flow_chart_completion: { className: "ielts-flowchart-box", title: "Flow Chart Completion" },
  r_diagram_label_completion: { className: "ielts-diagram-box", title: "Diagram Label Completion" },
  diagram_label_completion: { className: "ielts-diagram-box", title: "Diagram Label Completion" },
  r_sentence_completion: { className: "ielts-sentence-box", title: "Sentence Completion" },
  l_sentence_completion: { className: "ielts-sentence-box", title: "Sentence Completion" },
  sentence_completion: { className: "ielts-sentence-box", title: "Sentence Completion" },
};

/* ─── Completion paragraph with blank support (both formats) ─── */
function CompletionParagraphBlock({
  html, questions, answers, onAnswer, showResults, questionType, startQuestionNumber,
}: {
  html: string;
  questions: Question[];
  answers: UserAnswers;
  onAnswer: (n: number, a: string) => void;
  showResults?: boolean;
  questionType?: QuestionType;
  startQuestionNumber?: number;
}) {
  const hasBlanks = /\[blank_\d+\]/.test(html) || /class="ielts-blank"/.test(html);
  const isRichHtml = html.includes("<");

  const styleEntry = questionType ? COMPLETION_STYLE_MAP[questionType] : undefined;
  const wrapperClass = styleEntry
    ? `${styleEntry.className} text-sm leading-relaxed`
    : "bg-muted/30 rounded-lg p-4 text-sm leading-relaxed border border-border/50";
  const formTitle = styleEntry?.title;

  if (hasBlanks) {
    // Build correct answers map keyed by question number
    const baseNum = startQuestionNumber || questions[0]?.questionNumber || 1;
    const blankInfos = extractBlanks(html, baseNum);
    const correctAnswersMap: Record<number, string> = {};
    blankInfos.forEach((info, idx) => {
      const q = questions[idx];
      if (q) correctAnswersMap[info.questionNumber] = q.correctAnswer;
    });

    return (
      <div className={wrapperClass} data-form-title={formTitle}>
        <BlankRenderer
          html={html}
          answers={answers}
          onAnswer={onAnswer}
          showResults={showResults}
          correctAnswers={showResults ? correctAnswersMap : undefined}
          disabled={showResults}
          startQuestionNumber={baseNum}
        />
      </div>
    );
  }

  if (isRichHtml) {
    return (
      <div className={cn(wrapperClass, "prose prose-sm max-w-none")} data-form-title={formTitle} dangerouslySetInnerHTML={{ __html: html }} />
    );
  }

  return (
    <div className={wrapperClass} data-form-title={formTitle}>
      {html}
    </div>
  );
}

/* ─── Main component ─── */

export function QuestionRenderer({
  questionGroup,
  answers,
  onAnswer,
  showResults,
  activeQuestion,
  markedQuestions = new Set(),
  onToggleMark,
  savedQuestions = new Set(),
  onToggleSave,
  onHighlightEvidence,
}: QuestionRendererProps) {
  const mode = getRenderMode(questionGroup.type);
  const shared = { answers, showResults, savedQuestions, onToggleSave, markedQuestions, onToggleMark, onHighlightEvidence };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="font-display text-base font-bold text-primary">
          {questionGroup.title}
        </h3>
        {questionGroup.description && (
          questionGroup.description.includes("<") ? (
            <div className="text-sm text-muted-foreground italic prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: questionGroup.description }} />
          ) : (
            <p className="text-sm text-muted-foreground italic">
              {questionGroup.description}
            </p>
          )
        )}
      </div>

      {/* Group-level choices list for matching types */}
      {mode === "matching" && questionGroup.choices && questionGroup.choices.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-4 space-y-1.5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Options</p>
          {questionGroup.choices.map((c, i) => (
            <p key={c.id} className="text-sm">
              <span className="font-bold text-primary mr-2">{String.fromCharCode(65 + i)}</span>
              {c.content}
            </p>
          ))}
        </div>
      )}

      {/* Sentence endings — dedicated split layout */}
      {mode === "sentence_endings" && (
        <SentenceEndingsUI
          questionGroup={questionGroup}
          answers={answers}
          onAnswer={onAnswer}
          showResults={showResults}
          activeQuestion={activeQuestion}
          savedQuestions={savedQuestions}
          onToggleSave={onToggleSave}
          markedQuestions={markedQuestions}
          onToggleMark={onToggleMark}
        />
      )}

      {/* Pick 2 from 5 MCQ — dedicated UI */}
      {mode === "mcq_pick2" && (
        <MCQPick2UI
          questionGroup={questionGroup}
          answers={answers}
          onAnswer={onAnswer}
          showResults={showResults}
          activeQuestion={activeQuestion}
          savedQuestions={savedQuestions}
          onToggleSave={onToggleSave}
          markedQuestions={markedQuestions}
          onToggleMark={onToggleMark}
        />
      )}

      {questionGroup.completionParagraph &&
        (questionGroup.type === "r_diagram_label_completion" || questionGroup.type === "l_plan_map_diagram") &&
        questionGroup.completionParagraph.startsWith("http") && (() => {
          // Parse pin data from choices
          const choicesData = questionGroup.choices as any;
          const pins = choicesData?.pins || [];
          const displayMode = choicesData?.displayMode || "pins_side";
          const answerChoices = choicesData?.answerChoices;

          return (
            <DiagramExamRenderer
              imageUrl={questionGroup.completionParagraph}
              pins={pins}
              displayMode={displayMode}
              questions={questionGroup.questions}
              answers={answers}
              onAnswer={onAnswer}
              showResults={!!showResults}
              startQuestionNumber={questionGroup.startQuestionNumber}
              choices={answerChoices}
            />
          );
        })()
      }

      {/* Completion paragraph for summary/note completion */}
      {mode === "completion" && questionGroup.completionParagraph &&
        !(questionGroup.completionParagraph.startsWith("http") &&
          (questionGroup.type === "r_diagram_label_completion" || questionGroup.type === "l_plan_map_diagram")) && (
        <CompletionParagraphBlock
          html={questionGroup.completionParagraph}
          questions={questionGroup.questions}
          answers={answers}
          onAnswer={onAnswer}
          showResults={showResults}
          questionType={questionGroup.type}
          startQuestionNumber={questionGroup.startQuestionNumber}
        />
      )}

      {/* Other modes — per-question rendering (skip if diagram pins handle it) */}
      {mode !== "sentence_endings" && mode !== "mcq_pick2" && !(() => {
        const isDiagram = (questionGroup.type === "r_diagram_label_completion" || questionGroup.type === "l_plan_map_diagram") &&
          questionGroup.completionParagraph?.startsWith("http");
        if (!isDiagram) return false;
        const cd = questionGroup.choices as any;
        return cd?.pins?.length > 0;
      })() && (
        <div className="space-y-4">
          {questionGroup.questions.map((q) => (
            <QuestionWrapper
              key={q.id}
              q={q}
              activeQuestion={activeQuestion}
              isCompletion={mode === "completion"}
              onAnswer={onAnswer}
              {...shared}
            >
              {mode === "tfng" && (
                <TFNGButtons q={q} answers={answers} onAnswer={onAnswer} showResults={showResults}
                  options={["TRUE", "FALSE", "NOT_GIVEN"]} />
              )}
              {mode === "ynng" && (
                <TFNGButtons q={q} answers={answers} onAnswer={onAnswer} showResults={showResults}
                  options={["YES", "NO", "NOT_GIVEN"]} />
              )}
              {mode === "mcq" && (
                <MCQChoices q={q} answers={answers} onAnswer={onAnswer} showResults={showResults} />
              )}
              {mode === "matching" && (
                <MatchingInput q={q} answers={answers} onAnswer={onAnswer} showResults={showResults}
                  groupChoices={questionGroup.choices} />
              )}
              {mode === "completion" && !q.title?.includes("_______") && (
                <CompletionInput q={q} answers={answers} onAnswer={onAnswer} showResults={showResults} />
              )}
            </QuestionWrapper>
          ))}
        </div>
      )}
    </div>
  );
}
