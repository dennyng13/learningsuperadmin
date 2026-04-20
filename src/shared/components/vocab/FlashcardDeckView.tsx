import { useState, useMemo, useEffect } from "react";
import { Button } from "@shared/components/ui/button";
import { cn } from "@shared/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@shared/components/ui/tooltip";
import {
  Shuffle, RotateCcw, ChevronLeft, ChevronRight, Star, Layers, Loader2,
  Maximize2, X, Download, Sparkles, CheckCircle2, RefreshCw, Gauge, Clock,
} from "lucide-react";
import type { Flashcard } from "@shared/hooks/useFlashcards";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AudioPlayButton } from "./VocabEditors";

/* ═══ WORD STATS COMPACT ═══ */
function WordStatsBar({ card }: { card: Flashcard }) {
  const level = card.mastered ? "Đã thuộc" : card.repetitions >= 3 ? "Gần thuộc" : card.repetitions >= 1 ? "Đang học" : "Mới";
  const levelColor = card.mastered
    ? "bg-emerald-100 text-emerald-700"
    : card.repetitions >= 3
      ? "bg-amber-100 text-amber-700"
      : card.repetitions >= 1
        ? "bg-blue-100 text-blue-700"
        : "bg-muted text-muted-foreground";
  const masteryPct = Math.min(100, (card.repetitions / 5) * 100);

  return (
    <div className="mx-auto mt-3 space-y-1.5" style={{ maxWidth: 480 }}>
      <div className="flex items-center justify-between">
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", levelColor)}>{level}</span>
        <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3 text-primary" />{card.repetitions}</span>
          <span className="flex items-center gap-0.5"><RefreshCw className="h-3 w-3" />{card.intervalDays}d</span>
          <span className="flex items-center gap-0.5"><Gauge className={cn("h-3 w-3", card.easeFactor >= 2.5 ? "text-emerald-500" : card.easeFactor >= 2.0 ? "text-amber-500" : "text-destructive")} />{card.easeFactor.toFixed(1)}</span>
        </div>
      </div>
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", card.mastered ? "bg-emerald-500" : "bg-primary")} style={{ width: `${masteryPct}%` }} />
      </div>
    </div>
  );
}

/* ═══ SET FILTER CHIPS ═══ */
function SetFilterChips({ selectedSetId, setSelectedSetId, sets, allCards, cards, addMany }: {
  selectedSetId: string;
  setSelectedSetId: (id: string) => void;
  sets: { id: string; title: string; items: string[] }[];
  allCards: Flashcard[];
  cards: Flashcard[];
  addMany?: (items: { front: string; back: string }[]) => Promise<void>;
}) {
  const [importingSetId, setImportingSetId] = useState<string | null>(null);
  const uniqueUnmastered = new Set(cards.map(c => c.front)).size;
  const masteredCount = new Set(allCards.filter(c => c.mastered).map(c => c.front)).size;

  const handleQuickImport = async (e: React.MouseEvent, set: { id: string; title: string; items: string[] }) => {
    e.stopPropagation();
    if (!addMany || importingSetId) return;
    setImportingSetId(set.id);
    try {
      const { data } = await supabase.from("flashcard_set_items").select("front, back").eq("set_id", set.id).order("order");
      const allItems = (data || []).map(d => ({ front: d.front, back: d.back }));
      const duplicates = allItems.filter(d => allCards.some(c => c.front === d.front));
      if (allItems.length === 0) toast.info("Không có thẻ nào để import");
      else {
        await addMany(allItems);
        if (duplicates.length > 0) toast(`Đã import ${allItems.length} thẻ (${duplicates.length} từ trùng)`, { duration: 5000 });
      }
    } finally {
      setImportingSetId(null);
    }
  };

  const selectedSet = sets.find(s => s.id === selectedSetId);
  const missingCount = selectedSet ? selectedSet.items.length - new Set(allCards.filter(c => selectedSet.items.includes(c.front)).map(c => c.front)).size : 0;
  const chipBase = "px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap border";
  const chipActive = "bg-primary text-primary-foreground border-primary shadow-sm";
  const chipInactive = "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setSelectedSetId("__all__")} className={cn(chipBase, selectedSetId === "__all__" ? chipActive : chipInactive)}>
          Tất cả · {uniqueUnmastered}
        </button>
        {masteredCount > 0 && (
          <button onClick={() => setSelectedSetId("__mastered__")} className={cn(chipBase, selectedSetId === "__mastered__" ? chipActive : chipInactive)}>
            <Star className="h-3 w-3 inline mr-1" />Đã thuộc · {masteredCount}
          </button>
        )}
        {sets.map(s => {
          const matchingCards = allCards.filter(c => s.items.includes(c.front));
          const uniqueWords = new Set(matchingCards.map(c => c.front)).size;
          return (
            <button key={s.id} onClick={() => setSelectedSetId(s.id)} className={cn(chipBase, selectedSetId === s.id ? chipActive : chipInactive)}>
              {s.title.replace("IELTS Vocabulary 6.0 - ", "")} · {uniqueWords}/{s.items.length}
            </button>
          );
        })}
      </div>
      {addMany && selectedSet && missingCount > 0 && (
        <button onClick={(e) => handleQuickImport(e, selectedSet)} disabled={!!importingSetId}
          className="flex items-center gap-2 py-1.5 px-3 rounded-full bg-primary/10 hover:bg-primary/15 text-primary text-xs font-bold transition-colors disabled:opacity-50">
          {importingSetId === selectedSet.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
          Import {missingCount} từ còn thiếu
        </button>
      )}
    </div>
  );
}

/* ═══ FLASHCARD VIEWER ═══ */
interface FlashcardDeckViewProps {
  cards: Flashcard[];
  allCards: Flashcard[];
  onMaster: (id: string) => void;
  addMany?: (items: { front: string; back: string }[]) => Promise<void>;
  onGoToSets?: () => void;
}

export default function FlashcardDeckView({ cards, allCards, onMaster, addMany, onGoToSets }: FlashcardDeckViewProps) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [shuffled, setShuffled] = useState<Flashcard[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string>("__all__");
  const [allSets, setAllSets] = useState<{ id: string; title: string; items: string[] }[]>([]);
  const [loadingSets, setLoadingSets] = useState(true);
  const [animKey, setAnimKey] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: setsData } = await supabase.from("flashcard_sets").select("id, title").eq("status", "published").order("created_at", { ascending: false });
      if (setsData && setsData.length > 0) {
        const { data: items } = await supabase.from("flashcard_set_items").select("set_id, front").in("set_id", setsData.map(s => s.id));
        const grouped = new Map<string, string[]>();
        (items || []).forEach(item => {
          const list = grouped.get(item.set_id) || [];
          list.push(item.front);
          grouped.set(item.set_id, list);
        });
        setAllSets(setsData.map(s => ({ id: s.id, title: s.title, items: grouped.get(s.id) || [] })));
      }
      setLoadingSets(false);
    })();
  }, []);

  const sets = useMemo(() => allSets.filter(s => allCards.some(c => c.sourceSetId === s.id)), [allSets, allCards]);

  const filteredCards = useMemo(() => {
    if (selectedSetId === "__all__") return cards;
    if (selectedSetId === "__mastered__") return allCards.filter(c => c.mastered);
    const set = sets.find(s => s.id === selectedSetId);
    if (!set) return cards;
    return cards.filter(c => set.items.includes(c.front));
  }, [cards, allCards, selectedSetId, sets]);

  useEffect(() => { setShuffled([...filteredCards]); setIdx(0); setFlipped(false); setAnimKey(k => k + 1); }, [filteredCards]);

  const doShuffle = () => {
    setShuffled([...filteredCards].sort(() => Math.random() - 0.5));
    setIdx(0); setFlipped(false);
  };

  useEffect(() => {
    if (!fullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
      else if (e.key === "ArrowLeft" && idx > 0) { setIdx(i => i - 1); setFlipped(false); }
      else if (e.key === "ArrowRight" && idx < shuffled.length - 1) { setIdx(i => i + 1); setFlipped(false); }
      else if (e.key === " " || e.key === "Enter") { e.preventDefault(); setFlipped(f => !f); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fullscreen, idx, shuffled.length]);

  if (shuffled.length === 0) {
    return (
      <div className="space-y-4">
        {!loadingSets && sets.length > 0 && (
          <SetFilterChips selectedSetId={selectedSetId} setSelectedSetId={setSelectedSetId} sets={sets} allCards={allCards} cards={cards} addMany={addMany} />
        )}
        <div className="text-center py-16">
          <Layers className="h-14 w-14 mx-auto text-muted-foreground/20 mb-4" />
          <p className="text-sm text-muted-foreground font-medium">
            {selectedSetId !== "__all__" ? "Không có thẻ nào trong bộ này" : "Chưa có flashcard nào chưa thuộc"}
          </p>
          {onGoToSets && (
            <div className="mt-4 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3 flex items-start gap-3 max-w-sm mx-auto">
              <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Muốn thêm từ mới? Khám phá thêm từ <button type="button" onClick={onGoToSets} className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">Kho thẻ</button> và import vào bộ của bạn.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const card = shuffled[idx];
  const progress = ((idx + 1) / shuffled.length) * 100;

  const cardContent = (isFs: boolean) => (
    <div className={cn("mx-auto", isFs ? "w-full max-w-lg" : "")} style={!isFs ? { maxWidth: 480 } : undefined}>
      <button onClick={() => setFlipped(!flipped)} className="w-full group" style={{ perspective: "1000px" }}>
        <div className={cn("relative w-full transition-transform duration-500", flipped && "[transform:rotateY(180deg)]")} style={{ transformStyle: "preserve-3d", minHeight: isFs ? 320 : 260 }}>
          <div className="absolute inset-0 rounded-2xl border border-border bg-card shadow-md flex flex-col items-center justify-center p-8 group-hover:shadow-lg transition-shadow" style={{ backfaceVisibility: "hidden" }}>
            <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-[0.2em] mb-4">Mặt trước</span>
            <p className={cn("font-bold text-foreground text-center leading-relaxed", isFs ? "text-2xl md:text-3xl" : "text-xl md:text-2xl")}>{card.front}</p>
            <span className="text-[11px] text-muted-foreground/50 mt-5">Chạm để lật</span>
          </div>
          <div className="absolute inset-0 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.04] to-primary/[0.08] shadow-md flex flex-col items-center justify-center p-6 [transform:rotateY(180deg)] overflow-y-auto" style={{ backfaceVisibility: "hidden" }}>
            <span className="text-[10px] uppercase font-bold text-primary/50 tracking-[0.2em] mb-2">Mặt sau</span>
            <AudioPlayButton url={card.audioUrl} text={card.front} />
            <p className={cn("font-bold text-foreground text-center leading-relaxed mt-1", isFs ? "text-2xl md:text-3xl" : "text-xl md:text-2xl")}>{card.back}</p>
            {card.exampleSentence && (
              <div className={cn("text-muted-foreground mt-3 text-center italic leading-relaxed [&_b]:font-bold [&_u]:underline", isFs ? "text-base" : "text-sm")} dangerouslySetInnerHTML={{ __html: card.exampleSentence }} />
            )}
          </div>
        </div>
      </button>
    </div>
  );

  const navButtons = (
    <div className="flex items-center justify-center gap-2">
      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" disabled={idx === 0} onClick={() => { setIdx(idx - 1); setFlipped(false); }}>
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <Button variant={card.mastered ? "default" : "outline"} size="sm" className="rounded-full h-8 px-3 text-xs" onClick={() => onMaster(card.id)}>
        <Star className={cn("h-3.5 w-3.5 mr-1", card.mastered && "fill-current")} />
        {card.mastered ? "Bỏ thuộc" : "Thuộc"}
      </Button>
      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" disabled={idx === shuffled.length - 1} onClick={() => { setIdx(idx + 1); setFlipped(false); }}>
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-card/80 backdrop-blur-sm">
          <span className="text-sm font-bold text-foreground">{idx + 1} / {shuffled.length}</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={doShuffle}><Shuffle className="h-4 w-4 mr-1" /> Trộn</Button>
            <Button variant="ghost" size="icon" onClick={() => setFullscreen(false)}><X className="h-5 w-5" /></Button>
          </div>
        </div>
        <div className="h-1 bg-muted">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6 overflow-y-auto">
          {cardContent(true)}
          <WordStatsBar card={card} />
          {navButtons}
        </div>
        <div className="hidden md:flex items-center justify-center gap-4 py-2 border-t text-[11px] text-muted-foreground bg-card/80">
          <span>← → Điều hướng</span>
          <span>Space Lật thẻ</span>
          <span>Esc Thoát</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!loadingSets && sets.length > 0 && (
        <SetFilterChips selectedSetId={selectedSetId} setSelectedSetId={setSelectedSetId} sets={sets} allCards={allCards} cards={cards} addMany={addMany} />
      )}
      {onGoToSets && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>Muốn thêm từ? <button type="button" onClick={onGoToSets} className="font-semibold text-primary hover:underline underline-offset-2 transition-colors">Khám phá Kho thẻ →</button></span>
        </div>
      )}
      <div key={animKey} className="animate-fade-in space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">{idx + 1}<span className="text-muted-foreground font-normal">/{shuffled.length}</span></span>
            <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="flex gap-1">
            <TooltipProvider delayDuration={300}>
              <Tooltip><TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFullscreen(true)}><Maximize2 className="h-4 w-4" /></Button>
              </TooltipTrigger><TooltipContent side="bottom"><p>Toàn màn hình</p></TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={doShuffle}><Shuffle className="h-4 w-4" /></Button>
              </TooltipTrigger><TooltipContent side="bottom"><p>Trộn thẻ</p></TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setIdx(0); setFlipped(false); }}><RotateCcw className="h-4 w-4" /></Button>
              </TooltipTrigger><TooltipContent side="bottom"><p>Từ đầu</p></TooltipContent></Tooltip>
            </TooltipProvider>
          </div>
        </div>
        {cardContent(false)}
        <WordStatsBar card={card} />
        {navButtons}
      </div>
    </div>
  );
}
