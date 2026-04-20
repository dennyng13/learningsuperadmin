import { useState, useEffect } from "react";
import { Button } from "@shared/components/ui/button";
import { cn } from "@shared/lib/utils";
import {
  Brain, Clock, CheckCircle2, XCircle, HelpCircle, Star,
  Target, Maximize2, X,
} from "lucide-react";
import type { Flashcard, ReviewQuality } from "@shared/hooks/useFlashcards";
import { AudioPlayButton } from "./VocabEditors";

interface Props {
  dueCards: Flashcard[];
  onReview: (id: string, quality: ReviewQuality) => Promise<void>;
}

export default function ReviewSession({ dueCards, onReview }: Props) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!fullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
      else if (e.key === " " || e.key === "Enter") { e.preventDefault(); setFlipped(f => !f); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fullscreen]);

  if (dueCards.length === 0 || idx >= dueCards.length) {
    return (
      <div className="text-center py-16 space-y-4">
        <Target className="h-12 w-12 mx-auto text-primary" />
        <h3 className="font-display text-xl font-extrabold">
          {reviewed > 0 ? "Hoàn thành ôn tập!" : "Không có thẻ nào cần ôn"}
        </h3>
        <p className="text-muted-foreground">
          {reviewed > 0
            ? `Bạn đã ôn ${reviewed} thẻ. Quay lại sau để ôn tiếp!`
            : "Tất cả flashcard đã được lên lịch ôn. Quay lại sau nhé!"}
        </p>
      </div>
    );
  }

  const card = dueCards[idx];
  const remaining = dueCards.length - idx;
  const progress = (idx / dueCards.length) * 100;

  const handleReview = async (quality: ReviewQuality) => {
    await onReview(card.id, quality);
    setReviewed(r => r + 1);
    setIdx(i => i + 1);
    setFlipped(false);
  };

  const qualityButtons: { quality: ReviewQuality; label: string; sublabel: string; color: string; icon: any }[] = [
    { quality: 0, label: "Quên", sublabel: "Không nhớ gì", color: "border-destructive/50 text-destructive hover:bg-destructive/10", icon: XCircle },
    { quality: 2, label: "Khó", sublabel: "Sai nhưng nhận ra", color: "border-orange-400/50 text-orange-600 hover:bg-orange-50", icon: HelpCircle },
    { quality: 4, label: "Tốt", sublabel: "Đúng", color: "border-primary/50 text-primary hover:bg-primary/10", icon: CheckCircle2 },
    { quality: 5, label: "Dễ", sublabel: "Quá dễ", color: "border-emerald-400/50 text-emerald-600 hover:bg-emerald-50", icon: Star },
  ];

  const cardContent = (isFs: boolean) => (
    <div className={cn("mx-auto", isFs ? "w-full max-w-lg" : "")} style={!isFs ? { maxWidth: 480 } : undefined}>
      <button onClick={() => setFlipped(!flipped)} className="w-full" style={{ perspective: "1000px" }}>
        <div
          className={cn("relative w-full transition-transform duration-500", flipped && "[transform:rotateY(180deg)]")}
          style={{ transformStyle: "preserve-3d", minHeight: isFs ? 300 : 260 }}
        >
          <div className="absolute inset-0 rounded-2xl border-2 border-primary/20 bg-card shadow-lg flex flex-col items-center justify-center p-8" style={{ backfaceVisibility: "hidden" }}>
            <span className="text-[10px] uppercase font-bold text-primary/50 tracking-widest mb-3">Ôn tập</span>
            <p className={cn("font-bold text-foreground text-center leading-relaxed", isFs ? "text-xl md:text-2xl" : "text-lg md:text-xl")}>{card.front}</p>
            <span className="text-xs text-muted-foreground mt-4">Chạm để xem đáp án</span>
          </div>
          <div className="absolute inset-0 rounded-2xl border-2 border-accent/20 bg-accent/5 shadow-lg flex flex-col items-center justify-center p-6 [transform:rotateY(180deg)] overflow-y-auto" style={{ backfaceVisibility: "hidden" }}>
            <span className="text-[10px] uppercase font-bold text-accent/50 tracking-widest mb-2">Đáp án</span>
            <AudioPlayButton url={card.audioUrl} text={card.front} />
            <p className={cn("font-bold text-foreground text-center leading-relaxed mt-1", isFs ? "text-xl md:text-2xl" : "text-lg md:text-xl")}>{card.back}</p>
            {card.exampleSentence && (
              <div className="text-sm text-muted-foreground mt-3 text-center italic leading-relaxed [&_b]:font-bold [&_u]:underline" dangerouslySetInnerHTML={{ __html: card.exampleSentence }} />
            )}
          </div>
        </div>
      </button>
    </div>
  );

  const ratingButtons = (isFs: boolean) => flipped ? (
    <div className={cn("space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300", isFs ? "w-full max-w-lg mx-auto" : "")}>
      <p className="text-center text-xs font-bold text-muted-foreground">Bạn nhớ thẻ này thế nào?</p>
      <div className="grid grid-cols-4 gap-2">
        {qualityButtons.map(({ quality, label, sublabel, color, icon: Icon }) => (
          <button
            key={quality}
            onClick={() => handleReview(quality)}
            className={cn("flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all duration-200 font-bold", color)}
          >
            <Icon className="h-5 w-5" />
            <span className="text-sm">{label}</span>
            <span className="text-[10px] opacity-70 font-medium">{sublabel}</span>
          </button>
        ))}
      </div>
    </div>
  ) : null;

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-card/80 backdrop-blur-sm">
          <span className="text-sm font-bold text-foreground flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Còn {remaining} thẻ · Đã ôn: {reviewed}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setFullscreen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="h-1 bg-muted">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6 overflow-y-auto">
          {cardContent(true)}
          {card.repetitions > 0 && (
            <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Clock className="h-3 w-3" />
              Khoảng cách {card.intervalDays} ngày · Đã ôn {card.repetitions} lần
            </p>
          )}
          {ratingButtons(true)}
        </div>
        <div className="hidden md:flex items-center justify-center gap-4 py-2 border-t text-[11px] text-muted-foreground bg-card/80">
          <span>Space Lật thẻ</span>
          <span>Esc Thoát</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground font-bold flex items-center gap-1.5">
          <Brain className="h-4 w-4 text-primary" />
          Còn {remaining} thẻ cần ôn
        </span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-medium">Đã ôn: {reviewed}</span>
          <Button variant="ghost" size="sm" onClick={() => setFullscreen(true)} className="ml-2">
            <Maximize2 className="h-4 w-4 mr-1" /> Toàn màn hình
          </Button>
        </div>
      </div>
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
      </div>
      {cardContent(false)}
      {card.repetitions > 0 && (
        <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
          <Clock className="h-3 w-3" />
          Lần ôn trước: khoảng cách {card.intervalDays} ngày · Đã ôn {card.repetitions} lần
        </p>
      )}
      {ratingButtons(false)}
    </div>
  );
}
