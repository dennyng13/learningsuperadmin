import React, { useRef, useState, useCallback } from "react";
import { Button } from "@shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { MousePointerClick, Trash2, Move, RotateCcw } from "lucide-react";
import { cn } from "@shared/lib/utils";

export interface DiagramPin {
  questionNumber: number;
  x: number; // 0-1 percentage
  y: number; // 0-1 percentage
}

export type DiagramDisplayMode = "pins_side" | "overlay" | "drag_drop";

interface DiagramPinEditorProps {
  imageUrl: string;
  pins: DiagramPin[];
  onPinsChange: (pins: DiagramPin[]) => void;
  displayMode: DiagramDisplayMode;
  onDisplayModeChange: (mode: DiagramDisplayMode) => void;
  startQuestionNumber: number;
  endQuestionNumber: number;
  /** Map questionNumber -> correct answer text (from questions) */
  answerMap?: Record<number, string>;
}

export default function DiagramPinEditor({
  imageUrl,
  pins,
  onPinsChange,
  displayMode,
  onDisplayModeChange,
  startQuestionNumber,
  endQuestionNumber,
  answerMap = {},
}: DiagramPinEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingPin, setDraggingPin] = useState<number | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);

  const nextAvailableNumber = useCallback(() => {
    const usedNumbers = new Set(pins.map((p) => p.questionNumber));
    for (let n = startQuestionNumber; n <= endQuestionNumber; n++) {
      if (!usedNumbers.has(n)) return n;
    }
    return null;
  }, [pins, startQuestionNumber, endQuestionNumber]);

  const getRelativePosition = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingPin !== null) return;
    if (!isPlacing) return;
    const num = nextAvailableNumber();
    if (num === null) return;
    const pos = getRelativePosition(e);
    onPinsChange([...pins, { questionNumber: num, ...pos }]);
    if (num >= endQuestionNumber) setIsPlacing(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingPin === null) return;
    const pos = getRelativePosition(e);
    onPinsChange(
      pins.map((p) => (p.questionNumber === draggingPin ? { ...p, ...pos } : p))
    );
  };

  const handleMouseUp = () => setDraggingPin(null);

  const removePin = (num: number) => {
    onPinsChange(pins.filter((p) => p.questionNumber !== num));
  };

  const resetPins = () => {
    onPinsChange([]);
    setIsPlacing(false);
  };

  const totalQuestions = endQuestionNumber - startQuestionNumber + 1;
  const placedCount = pins.length;

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={isPlacing ? "primary" : "outline"}
          className="gap-1.5 text-xs"
          onClick={() => setIsPlacing(!isPlacing)}
          disabled={placedCount >= totalQuestions}
        >
          <MousePointerClick className="h-3.5 w-3.5" />
          {isPlacing ? "Đang đặt pin..." : "Đặt pin"}
        </Button>

        <div className="text-xs text-muted-foreground">
          <span className="font-bold text-primary">{placedCount}</span>/{totalQuestions} pin
        </div>

        {pins.length > 0 && (
          <Button type="button" size="sm" variant="ghost" className="gap-1 text-xs text-destructive h-7" onClick={resetPins}>
            <RotateCcw className="h-3 w-3" /> Reset
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-medium">Chế độ hiển thị:</span>
          <Select value={displayMode} onValueChange={(v) => onDisplayModeChange(v as DiagramDisplayMode)}>
            <SelectTrigger className="h-7 text-xs w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pins_side">Pin + ô nhập bên cạnh</SelectItem>
              <SelectItem value="overlay">Ô nhập trên hình</SelectItem>
              <SelectItem value="drag_drop">Kéo thả đáp án</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Image with pins */}
      <div
        ref={containerRef}
        className={cn(
          "relative rounded-xl overflow-hidden border-2 bg-white dark:bg-muted/30 select-none",
          isPlacing ? "cursor-crosshair border-primary" : "border-border",
          draggingPin !== null && "cursor-grabbing"
        )}
        onClick={handleImageClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          src={imageUrl}
          alt="Diagram"
          className="w-full object-contain pointer-events-none"
          draggable={false}
        />

        {/* Render pins */}
        {pins.map((pin) => {
          const answer = answerMap[pin.questionNumber];
          return (
            <div
              key={pin.questionNumber}
              className={cn(
                "absolute flex items-center justify-center w-7 h-7 -ml-3.5 -mt-3.5 rounded-full border-2 border-white shadow-lg text-[11px] font-black text-white transition-transform",
                answer ? "bg-primary" : "bg-muted-foreground/60",
                draggingPin === pin.questionNumber && "scale-125 ring-2 ring-primary/50"
              )}
              style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
              onMouseDown={(e) => {
                e.stopPropagation();
                setDraggingPin(pin.questionNumber);
              }}
              title={`Q${pin.questionNumber}${answer ? ` → ${answer}` : " — chưa có đáp án"}\nKéo để di chuyển • Nhấp phải để xoá`}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                removePin(pin.questionNumber);
              }}
            >
              {pin.questionNumber}
            </div>
          );
        })}

        {/* Placement hint */}
        {isPlacing && placedCount < totalQuestions && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-primary/90 text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-pulse">
            Click để đặt Q{nextAvailableNumber()}
          </div>
        )}
      </div>

      {/* Pin list with mapped answers */}
      {pins.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {pins
            .sort((a, b) => a.questionNumber - b.questionNumber)
            .map((pin) => {
              const answer = answerMap[pin.questionNumber];
              return (
                <div key={pin.questionNumber} className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5", answer ? "bg-emerald-50/50 dark:bg-emerald-950/10" : "bg-muted/50")}>
                  <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 text-white", answer ? "bg-primary" : "bg-muted-foreground/50")}>
                    {pin.questionNumber}
                  </span>
                  <span className={cn("text-xs flex-1 truncate", answer ? "font-medium text-foreground" : "text-muted-foreground italic")}>
                    {answer || "Chưa có đáp án"}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePin(pin.questionNumber)}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
        <Move className="h-3 w-3" /> Kéo pin để di chuyển • Nhấp chuột phải để xoá • Đáp án được nhập ở phần câu hỏi bên dưới
      </p>
    </div>
  );
}