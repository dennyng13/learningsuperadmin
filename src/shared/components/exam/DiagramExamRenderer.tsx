import React, { useState, useRef, useCallback } from "react";
import { Input } from "@shared/components/ui/input";
import { Badge } from "@shared/components/ui/badge";
import { cn } from "@shared/lib/utils";
import type { Question, UserAnswers } from "@shared/types/exam";
import { isCorrectAnswer } from "@shared/utils/answerComparison";

interface DiagramPin {
  questionNumber: number;
  x: number;
  y: number;
}

type DisplayMode = "pins_side" | "overlay" | "drag_drop";

interface DiagramExamRendererProps {
  imageUrl: string;
  pins: DiagramPin[];
  displayMode: DisplayMode;
  questions: Question[];
  answers: UserAnswers;
  onAnswer: (qNum: number, answer: string) => void;
  showResults: boolean;
  startQuestionNumber: number;
  choices?: string[]; // for drag_drop mode
}

export default function DiagramExamRenderer({
  imageUrl,
  pins,
  displayMode,
  questions,
  answers,
  onAnswer,
  showResults,
  startQuestionNumber,
  choices,
}: DiagramExamRendererProps) {
  if (!pins || pins.length === 0) {
    // Fallback: no pins placed, show image + simple input list
    return <FallbackRenderer imageUrl={imageUrl} questions={questions} answers={answers} onAnswer={onAnswer} showResults={showResults} />;
  }

  if (displayMode === "overlay") {
    return <OverlayMode imageUrl={imageUrl} pins={pins} questions={questions} answers={answers} onAnswer={onAnswer} showResults={showResults} />;
  }

  if (displayMode === "drag_drop") {
    return <DragDropMode imageUrl={imageUrl} pins={pins} questions={questions} answers={answers} onAnswer={onAnswer} showResults={showResults} choices={choices} />;
  }

  // Default: pins_side
  return <PinsSideMode imageUrl={imageUrl} pins={pins} questions={questions} answers={answers} onAnswer={onAnswer} showResults={showResults} />;
}

/* ══════ Mode 1: Pins on image + inputs on the side ══════ */
function PinsSideMode({ imageUrl, pins, questions, answers, onAnswer, showResults }: Omit<DiagramExamRendererProps, "displayMode" | "startQuestionNumber" | "choices">) {
  const [activeQ, setActiveQ] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4">
      {/* Diagram with pins */}
      <div className="relative rounded-xl overflow-hidden border bg-white dark:bg-muted/30 shadow-sm">
        <img src={imageUrl} alt="Diagram" className="w-full object-contain" draggable={false} />
        {pins.sort((a, b) => a.questionNumber - b.questionNumber).map((pin) => {
          const q = questions.find((q) => q.questionNumber === pin.questionNumber);
          const answer = answers[pin.questionNumber];
          const isActive = activeQ === pin.questionNumber;
          const isCorrect = showResults && q ? isCorrectAnswer(answer, q.correctAnswer) : undefined;

          return (
            <button
              key={pin.questionNumber}
              type="button"
              className={cn(
                "absolute w-7 h-7 -ml-3.5 -mt-3.5 rounded-full border-2 border-white shadow-lg text-[11px] font-black text-white transition-all",
                showResults
                  ? isCorrect
                    ? "bg-green-500"
                    : "bg-red-500"
                  : isActive
                    ? "bg-primary scale-125 ring-2 ring-primary/40"
                    : answer
                      ? "bg-primary/80"
                      : "bg-muted-foreground/60",
              )}
              style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
              onClick={() => setActiveQ(pin.questionNumber)}
            >
              {pin.questionNumber}
            </button>
          );
        })}
      </div>

      {/* Side input list */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Câu trả lời</p>
        {pins.sort((a, b) => a.questionNumber - b.questionNumber).map((pin) => {
          const q = questions.find((q) => q.questionNumber === pin.questionNumber);
          const answer = answers[pin.questionNumber] || "";
          const isCorrect = showResults && q ? isCorrectAnswer(answer, q.correctAnswer) : undefined;

          return (
            <div
              key={pin.questionNumber}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors",
                activeQ === pin.questionNumber && "bg-primary/10 ring-1 ring-primary/30"
              )}
              onClick={() => setActiveQ(pin.questionNumber)}
            >
              <span className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 text-white",
                showResults ? (isCorrect ? "bg-green-500" : "bg-red-500") : "bg-primary"
              )}>
                {pin.questionNumber}
              </span>
              {showResults ? (
                <div className="flex-1 text-sm">
                  <span className={isCorrect ? "text-green-600 font-medium" : "text-red-500 line-through"}>{answer || "—"}</span>
                  {!isCorrect && q && (
                    <span className="text-green-600 font-medium ml-2"> {q.correctAnswer.split("|")[0]}</span>
                  )}
                </div>
              ) : (
                <Input
                  value={answer}
                  onChange={(e) => onAnswer(pin.questionNumber, e.target.value)}
                  placeholder={`Câu ${pin.questionNumber}`}
                  className="h-8 text-sm flex-1"
                  onFocus={() => setActiveQ(pin.questionNumber)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════ Mode 2: Overlay inputs directly on image ══════ */
function OverlayMode({ imageUrl, pins, questions, answers, onAnswer, showResults }: Omit<DiagramExamRendererProps, "displayMode" | "startQuestionNumber" | "choices">) {
  return (
    <div className="relative rounded-xl overflow-hidden border bg-white dark:bg-muted/30 shadow-sm">
      <img src={imageUrl} alt="Diagram" className="w-full object-contain" draggable={false} />
      {pins.map((pin) => {
        const q = questions.find((q) => q.questionNumber === pin.questionNumber);
        const answer = answers[pin.questionNumber] || "";
        const isCorrect = showResults && q ? isCorrectAnswer(answer, q.correctAnswer) : undefined;

        return (
          <div
            key={pin.questionNumber}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1"
            style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
          >
            <span className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 shadow",
              showResults ? (isCorrect ? "bg-green-500" : "bg-red-500") : "bg-primary"
            )}>
              {pin.questionNumber}
            </span>
            {showResults ? (
              <div className="bg-white/95 dark:bg-card/95 rounded px-2 py-0.5 text-xs shadow-md border">
                <span className={isCorrect ? "text-green-600 font-medium" : "text-red-500 line-through"}>{answer || "—"}</span>
                {!isCorrect && q && <span className="text-green-600 font-medium ml-1"> {q.correctAnswer.split("|")[0]}</span>}
              </div>
            ) : (
              <Input
                value={answer}
                onChange={(e) => onAnswer(pin.questionNumber, e.target.value)}
                className="h-7 w-24 text-xs bg-white/95 dark:bg-card/95 shadow-md border-primary/30 focus:border-primary"
                placeholder={`Q${pin.questionNumber}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ══════ Mode 3: Drag and drop answers ══════ */
function DragDropMode({ imageUrl, pins, questions, answers, onAnswer, showResults, choices }: Omit<DiagramExamRendererProps, "displayMode" | "startQuestionNumber">) {
  const [dragItem, setDragItem] = useState<string | null>(null);

  // Generate choice labels from questions if not provided
  const answerChoices = choices && choices.length > 0
    ? choices
    : [...new Set(questions.map((q) => q.correctAnswer.split("|")[0]))];

  const usedAnswers = new Set(Object.values(answers).filter(Boolean));

  const handleDrop = (qNum: number) => {
    if (dragItem) {
      onAnswer(qNum, dragItem);
      setDragItem(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Answer bank */}
      {!showResults && (
        <div className="rounded-xl border bg-muted/30 p-3">
          <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Kéo đáp án vào vị trí trên hình</p>
          <div className="flex flex-wrap gap-2">
            {answerChoices.map((choice, i) => {
              const isUsed = usedAnswers.has(choice);
              return (
                <div
                  key={i}
                  draggable={!isUsed && !showResults}
                  onDragStart={() => setDragItem(choice)}
                  onDragEnd={() => setDragItem(null)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
                    isUsed
                      ? "opacity-40 bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-card cursor-grab active:cursor-grabbing hover:border-primary hover:shadow-md hover:-translate-y-0.5",
                    dragItem === choice && "ring-2 ring-primary scale-105 shadow-lg"
                  )}
                >
                  {choice}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Diagram with drop zones */}
      <div className="relative rounded-xl overflow-hidden border bg-white dark:bg-muted/30 shadow-sm">
        <img src={imageUrl} alt="Diagram" className="w-full object-contain" draggable={false} />
        {pins.map((pin) => {
          const q = questions.find((q) => q.questionNumber === pin.questionNumber);
          const answer = answers[pin.questionNumber] || "";
          const isCorrect = showResults && q ? isCorrectAnswer(answer, q.correctAnswer) : undefined;

          return (
            <div
              key={pin.questionNumber}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("scale-110"); }}
              onDragLeave={(e) => { e.currentTarget.classList.remove("scale-110"); }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("scale-110");
                handleDrop(pin.questionNumber);
              }}
            >
              <div className={cn(
                "flex items-center gap-1 rounded-lg border-2 border-dashed px-2 py-1 transition-all min-w-[80px] shadow-sm",
                showResults
                  ? isCorrect ? "border-green-500 bg-green-50/90" : "border-red-500 bg-red-50/90"
                  : answer
                    ? "border-primary bg-white/95 dark:bg-card/95"
                    : "border-muted-foreground/40 bg-white/80 dark:bg-card/80"
              )}>
                <span className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0",
                  showResults ? (isCorrect ? "bg-green-500" : "bg-red-500") : "bg-primary"
                )}>
                  {pin.questionNumber}
                </span>
                {answer ? (
                  <span className={cn(
                    "text-xs font-medium",
                    showResults && !isCorrect && "line-through text-red-500"
                  )}>
                    {answer}
                    {showResults && !isCorrect && q && (
                      <span className="text-green-600 ml-1 no-underline"> {q.correctAnswer.split("|")[0]}</span>
                    )}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {showResults && q ? <span className="text-green-600 font-medium"> {q.correctAnswer.split("|")[0]}</span> :"Kéo vào đây"}
                  </span>
                )}
                {/* Allow removing placed answer */}
                {answer && !showResults && (
                  <button
                    type="button"
                    className="ml-auto text-muted-foreground hover:text-destructive text-xs"
                    onClick={() => onAnswer(pin.questionNumber, "")}
                  >
                    
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════ Fallback: no pins, simple list ══════ */
function FallbackRenderer({ imageUrl, questions, answers, onAnswer, showResults }: { imageUrl: string; questions: Question[]; answers: UserAnswers; onAnswer: (q: number, a: string) => void; showResults: boolean }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-card p-3 flex justify-center">
        <img src={imageUrl} alt="Diagram" className="max-h-80 object-contain rounded-lg" />
      </div>
      <div className="space-y-2">
        {questions.map((q) => {
          const answer = answers[q.questionNumber] || "";
          const isCorrect = showResults ? isCorrectAnswer(answer, q.correctAnswer) : undefined;
          return (
            <div key={q.id} className="flex items-center gap-2">
              <Badge variant="outline" className="shrink-0 font-bold">{q.questionNumber}</Badge>
              {showResults ? (
                <div className="text-sm">
                  <span className={isCorrect ? "text-green-600 font-medium" : "text-red-500 line-through"}>{answer || "—"}</span>
                  {!isCorrect && <span className="text-green-600 font-medium ml-2"> {q.correctAnswer.split("|")[0]}</span>}
                </div>
              ) : (
                <Input
                  value={answer}
                  onChange={(e) => onAnswer(q.questionNumber, e.target.value)}
                  placeholder={q.title || `Câu ${q.questionNumber}`}
                  className="h-8 text-sm flex-1"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
