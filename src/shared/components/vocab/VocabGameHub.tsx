import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  Gamepad2, Shuffle, RotateCcw, ChevronLeft, Star, Timer, Crosshair,
  Keyboard, Zap, Users, Trophy, CheckCircle2, XCircle, ArrowRight, Lightbulb,
  Library, Dice5, Loader2, Filter,
} from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Progress } from "@shared/components/ui/progress";
import { Checkbox } from "@shared/components/ui/checkbox";
import { cn } from "@shared/lib/utils";
import { Skeleton } from "@shared/components/ui/skeleton";
import type { Flashcard } from "@shared/hooks/useFlashcards";
import { playCorrectSound, playWrongSound, playGameOverSound, playComboSound } from "@shared/utils/beep";
import { useCourseLevels } from "@shared/hooks/useCourseLevels";
import { getLevelColorConfig } from "@shared/utils/levelColors";
import { useAuth } from "@shared/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import GameLeaderboard from "./GameLeaderboard";
import { useAutoBadges } from "@shared/hooks/useAutoBadges";
import { fireConfetti } from "@shared/utils/confetti";
import { playVictorySound } from "@shared/utils/beep";

type GameMode = null | "matching" | "typing" | "shooting" | "challenge" | "shark";

interface GameModeInfo {
  id: GameMode;
  label: string;
  desc: string;
  icon: any;
  minCards: number;
  color: string;
}

const GAME_MODES: GameModeInfo[] = [
  { id: "matching", label: "Ghép từ", desc: "Ghép từ tiếng Anh với nghĩa tiếng Việt", icon: Shuffle, minCards: 2, color: "from-primary/10 to-primary/5 border-primary/20" },
  { id: "typing", label: "Gõ nhanh", desc: "Nhìn nghĩa tiếng Việt, gõ từ tiếng Anh theo thời gian", icon: Keyboard, minCards: 3, color: "from-accent/10 to-accent/5 border-accent/20" },
  { id: "shooting", label: "Bắn từ", desc: "Bắn trúng từ tiếng Anh đúng nghĩa trước khi hết giờ", icon: Crosshair, minCards: 4, color: "from-destructive/10 to-destructive/5 border-destructive/20" },
  { id: "challenge", label: "Thách đấu", desc: "Chế độ marathon — bao nhiêu từ đúng liên tiếp?", icon: Trophy, minCards: 5, color: "from-warning/10 to-warning/5 border-warning/20" },
  { id: "shark", label: "Cá mập", desc: "Gõ đúng từ trước khi cá mập bơi đến!", icon: Zap, minCards: 3, color: "from-blue-500/10 to-blue-500/5 border-blue-500/20" },
];

/* helper to save score + check badges */
let _checkBadgesFn: ((userId: string) => Promise<void>) | null = null;
let _syncFlashcardFn: ((id: string, quality: 0|1|2|3|4|5) => Promise<void>) | null = null;

async function saveGameScore(userId: string | undefined, gameMode: string, score: number, difficulty?: string) {
  if (!userId || score <= 0) return;
  await supabase.from("game_scores").insert({
    user_id: userId, game_mode: gameMode, score, difficulty: difficulty || null,
  });
  if (_checkBadgesFn) _checkBadgesFn(userId);
  // Notify listeners (leaderboard, achievements) to refetch — replaces realtime subscription
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("game-score-saved", { detail: { gameMode, userId } }));
  }
}

/** Sync game results to spaced repetition: correct → quality 4, incorrect → quality 1 */
async function syncGameToSR(stats: Map<string, { correct: number; incorrect: number; shown: number }>) {
  if (!_syncFlashcardFn) return;
  for (const [id, s] of stats.entries()) {
    if (s.shown === 0) continue;
    const quality: 0|1|2|3|4|5 = s.correct >= 2 ? 4 : s.incorrect > s.correct ? 1 : 3;
    await _syncFlashcardFn(id, quality);
  }
}

/* ═══ SMART WORD SELECTOR ═══ */
interface WordStats {
  correct: number;
  incorrect: number;
  shown: number;
}

function useSmartSelector(cards: Flashcard[]) {
  const statsRef = useRef<Map<string, WordStats>>(new Map());

  const reset = useCallback(() => {
    statsRef.current = new Map();
  }, []);

  const getStats = useCallback((id: string): WordStats => {
    return statsRef.current.get(id) || { correct: 0, incorrect: 0, shown: 0 };
  }, []);

  const recordResult = useCallback((id: string, correct: boolean) => {
    const s = statsRef.current.get(id) || { correct: 0, incorrect: 0, shown: 0 };
    if (correct) s.correct++;
    else s.incorrect++;
    statsRef.current.set(id, s);
  }, []);

  // Get active cards (not mastered = correct < 2)
  const getActiveCards = useCallback(() => {
    return cards.filter(c => {
      const s = getStats(c.id);
      return s.correct < 2;
    });
  }, [cards, getStats]);

  /** Pick next card with smart weighting.
   *  - Unseen cards get high priority
   *  - High incorrect_count cards get higher weight
   *  - Cards correct once get medium weight
   *  - Guarantees all shown at least once before repeating
   */
  const pickNext = useCallback((excludeIds?: string[]): Flashcard | null => {
    let active = getActiveCards();
    if (excludeIds?.length) active = active.filter(c => !excludeIds.includes(c.id));
    if (active.length === 0) return null;

    // Phase 1: Prioritize unseen cards
    const unseen = active.filter(c => getStats(c.id).shown === 0);
    if (unseen.length > 0) {
      const pick = unseen[Math.floor(Math.random() * unseen.length)];
      const s = statsRef.current.get(pick.id) || { correct: 0, incorrect: 0, shown: 0 };
      s.shown++;
      statsRef.current.set(pick.id, s);
      return pick;
    }

    // Phase 2: Weighted random — more incorrect = higher weight
    const weights = active.map(c => {
      const s = getStats(c.id);
      // Base weight 1, +2 per incorrect, -0.5 per correct (min 0.5)
      return Math.max(0.5, 1 + s.incorrect * 2 - s.correct * 0.5);
    });
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalWeight;
    for (let i = 0; i < active.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        const pick = active[i];
        const s = statsRef.current.get(pick.id) || { correct: 0, incorrect: 0, shown: 0 };
        s.shown++;
        statsRef.current.set(pick.id, s);
        return pick;
      }
    }
    // Fallback
    const pick = active[active.length - 1];
    const s = statsRef.current.get(pick.id) || { correct: 0, incorrect: 0, shown: 0 };
    s.shown++;
    statsRef.current.set(pick.id, s);
    return pick;
  }, [getActiveCards, getStats]);

  /** Pick N cards for batch games (matching). Prioritizes unseen/weak cards. */
  const pickBatch = useCallback((count: number): Flashcard[] => {
    const result: Flashcard[] = [];
    const usedIds = new Set<string>();
    for (let i = 0; i < count; i++) {
      const card = pickNext([...usedIds]);
      if (!card) break;
      result.push(card);
      usedIds.add(card.id);
    }
    return result;
  }, [pickNext]);

  const hasActiveCards = useCallback(() => getActiveCards().length > 0, [getActiveCards]);
  const masteredCount = useCallback(() => {
    return cards.filter(c => getStats(c.id).correct >= 2).length;
  }, [cards, getStats]);

  /** Get all stats for cards that were shown at least once */
  const getAllStats = useCallback(() => {
    return cards
      .map(c => ({ card: c, stats: getStats(c.id) }))
      .filter(({ stats }) => stats.shown > 0)
      .sort((a, b) => {
        // Sort: incorrect desc, then correct asc
        if (b.stats.incorrect !== a.stats.incorrect) return b.stats.incorrect - a.stats.incorrect;
        return a.stats.correct - b.stats.correct;
      });
  }, [cards, getStats]);

  const getRawStats = useCallback(() => statsRef.current, []);

  return useMemo(() => ({
    reset,
    recordResult,
    pickNext,
    pickBatch,
    hasActiveCards,
    masteredCount,
    getStats,
    getActiveCards,
    getAllStats,
    getRawStats,
  }), [
    reset,
    recordResult,
    pickNext,
    pickBatch,
    hasActiveCards,
    masteredCount,
    getStats,
    getActiveCards,
    getAllStats,
    getRawStats,
  ]);
}

/* ═══ GAME END STATS ═══ */
function GameEndStats({ stats, onRetryWrong }: { stats: { card: Flashcard; stats: WordStats }[]; onRetryWrong?: (wrongCards: Flashcard[]) => void }) {
  const [expanded, setExpanded] = useState(false);
  if (stats.length === 0) return null;
  const shown = expanded ? stats : stats.slice(0, 5);
  const wrongCards = stats.filter(s => s.stats.incorrect > 0).map(s => s.card);
  return (
    <div className="space-y-2">
      {wrongCards.length > 0 && onRetryWrong && (
        <Button
          onClick={() => onRetryWrong(wrongCards)}
          variant="outline"
          className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Ôn lại {wrongCards.length} từ sai
        </Button>
      )}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mx-auto"
      >
        {expanded ? "Ẩn" : "Xem"} chi tiết ({stats.length} từ)
        <ArrowRight className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")} />
      </button>
      {(expanded || stats.some(s => s.stats.incorrect > 0)) && (
        <div className="rounded-xl border bg-card/50 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b">
            <span>Từ</span>
            <span className="text-center"></span>
            <span className="text-center"></span>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {shown.map(({ card, stats: s }) => {
              const mastered = s.correct >= 2;
              return (
                <div key={card.id} className={cn(
                  "grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-1.5 text-sm border-b last:border-0",
                  mastered && "bg-primary/5",
                  s.incorrect > 0 && !mastered && "bg-destructive/5"
                )}>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{card.front}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{card.back}</p>
                  </div>
                  <span className="text-primary font-bold text-center w-6">{s.correct}</span>
                  <span className={cn("font-bold text-center w-6", s.incorrect > 0 ? "text-destructive" : "text-muted-foreground/30")}>{s.incorrect}</span>
                </div>
              );
            })}
          </div>
          {!expanded && stats.length > 5 && (
            <button onClick={() => setExpanded(true)} className="w-full py-1.5 text-xs text-muted-foreground hover:text-foreground border-t">
              +{stats.length - 5} từ khác
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══ SET SELECTION SCREEN ═══ */

function SetSelectionScreen({ cards, onStart, onNavigateToLibrary }: {
  cards: Flashcard[];
  onStart: (filteredCards: Flashcard[], selectedSetNames: string[]) => void;
  onNavigateToLibrary?: () => void;
}) {
  const [selectedGroupKeys, setSelectedGroupKeys] = useState<Set<string>>(new Set());
  const [setMeta, setSetMeta] = useState<Record<string, { title: string; level: string | null }>>({});
  const { levels: courseLevels } = useCourseLevels();

  const playableCards = useMemo(() => cards.filter(c => !c.mastered), [cards]);

  // Fetch set names + levels
  useEffect(() => {
    const setIds = [...new Set(playableCards.filter(c => c.sourceType === "set" && c.sourceSetId).map(c => c.sourceSetId!))];
    if (setIds.length === 0) return;
    supabase.from("flashcard_sets").select("id, title, course_level").in("id", setIds).then(({ data }) => {
      const meta: Record<string, { title: string; level: string | null }> = {};
      (data || []).forEach(s => { meta[s.id] = { title: s.title, level: s.course_level }; });
      setSetMeta(meta);
    });
  }, [playableCards]);

  // Group cards by source
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; cards: Flashcard[]; level: string | null }>();
    playableCards.forEach(card => {
      let groupKey: string;
      let label: string;
      let level: string | null = null;
      if (card.sourceType === "set" && card.sourceSetId) {
        groupKey = `set-${card.sourceSetId}`;
        const meta = setMeta[card.sourceSetId];
        label = meta?.title || `Bộ ${card.sourceSetId.slice(0, 6)}`;
        level = meta?.level || null;
      } else if (card.sourceType === "saved") {
        groupKey = "saved";
        label = "Import từ đã lưu";
      } else {
        groupKey = "manual";
        label = "Tự thêm";
      }
      const group = map.get(groupKey) || { label, cards: [], level };
      group.cards.push(card);
      map.set(groupKey, group);
    });
    return Array.from(map.entries());
  }, [playableCards, setMeta]);

  // Derive available levels from groups
  const availableLevels = useMemo(() => {
    const lvls = new Set<string>();
    groups.forEach(([, group]) => { if (group.level) lvls.add(group.level); });
    return courseLevels.filter(cl => lvls.has(cl.name));
  }, [groups, courseLevels]);

  // Default: select all groups
  useEffect(() => {
    if (groups.length > 0 && selectedGroupKeys.size === 0) {
      setSelectedGroupKeys(new Set(groups.map(([key]) => key)));
    }
  }, [groups.length]);

  const toggleGroup = (key: string) => {
    setSelectedGroupKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectByLevel = (levelName: string) => {
    const keys = new Set<string>();
    groups.forEach(([key, group]) => {
      if (group.level === levelName) keys.add(key);
    });
    setSelectedGroupKeys(keys);
  };

  const allSelected = groups.length > 0 && groups.every(([key]) => selectedGroupKeys.has(key));

  const totalSelectedCards = useMemo(() => {
    return groups.reduce((sum, [key, group]) => selectedGroupKeys.has(key) ? sum + group.cards.length : sum, 0);
  }, [groups, selectedGroupKeys]);

  const handleStart = () => {
    const selectedNames: string[] = [];
    let gameCards: Flashcard[] = [];
    groups.forEach(([key, group]) => {
      if (!selectedGroupKeys.has(key)) return;
      selectedNames.push(group.label);
      gameCards = gameCards.concat(group.cards);
    });
    onStart(gameCards, selectedNames);
  };

  if (playableCards.length < 2) {
    return (
      <div className="text-center py-16 space-y-3">
        <Gamepad2 className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground font-medium">Cần ít nhất 2 flashcard chưa thuộc để chơi</p>
        <p className="text-xs text-muted-foreground">
          Hãy thêm thẻ vào <span className="font-semibold text-primary">Của tôi</span> từ tab <span className="font-semibold text-primary">Kho thẻ</span> để bắt đầu chơi!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Library className="h-5 w-5 text-primary" />
        <h3 className="font-display font-bold">Chọn bộ từ vựng của tôi</h3>
      </div>

      <p className="text-xs text-muted-foreground">Chỉ hiển thị các thẻ bạn đã lưu vào bộ của mình</p>

      {/* Quick level filter pills */}
      {availableLevels.length > 0 && (
        <div className="flex gap-2 flex-wrap items-center">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <button
            onClick={() => setSelectedGroupKeys(new Set(groups.map(([k]) => k)))}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
              allSelected ? "bg-accent text-accent-foreground" : "bg-card border text-muted-foreground hover:text-foreground"
            )}
          >
            Tất cả
          </button>
          {availableLevels.map(cl => {
            const lc = getLevelColorConfig(cl.color_key || cl.name);
            const levelGroupKeys = groups.filter(([, g]) => g.level === cl.name).map(([k]) => k);
            const isActive = levelGroupKeys.length > 0 && levelGroupKeys.every(k => selectedGroupKeys.has(k))
              && selectedGroupKeys.size === levelGroupKeys.length;
            return (
              <button
                key={cl.id}
                onClick={() => selectByLevel(cl.name)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                  isActive
                    ? (lc ? lc.selected : "bg-accent text-accent-foreground")
                    : (lc ? `${lc.bg} ${lc.text} ${lc.border} hover:opacity-80` : "bg-card border text-muted-foreground hover:text-foreground")
                )}
              >
                {cl.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedGroupKeys(allSelected ? new Set() : new Set(groups.map(([k]) => k)))}
          className="text-xs"
        >
          {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
        </Button>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {groups.map(([key, group]) => {
          const isManual = key === "manual";
          const isSaved = key === "saved";
          const IconComp = isManual ? Keyboard : isSaved ? Star : Library;
          const iconColor = isManual ? "text-accent" : isSaved ? "text-amber-500" : "text-primary";
          const bgColor = isManual ? "bg-accent/20" : isSaved ? "bg-amber-500/20" : "bg-primary/10";
          const levelLabel = group.level;
          const lc = levelLabel ? getLevelColorConfig(levelLabel) : null;

          return (
            <label key={key} className={cn(
              "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
              selectedGroupKeys.has(key) ? "border-primary bg-primary/5" : "hover:bg-muted/30"
            )}>
              <Checkbox
                checked={selectedGroupKeys.has(key)}
                onCheckedChange={() => toggleGroup(key)}
              />
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", bgColor)}>
                <IconComp className={cn("h-4 w-4", iconColor)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm truncate">{group.label}</p>
                  {levelLabel && (
                    <span className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0",
                      lc ? `${lc.bg} ${lc.text} ${lc.border} border` : "bg-muted text-muted-foreground"
                    )}>
                      {levelLabel}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{group.cards.length} thẻ chưa thuộc</p>
              </div>
            </label>
          );
        })}
      </div>

      {/* Suggestion to browse library */}
      <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3 flex items-start gap-3">
        <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground">
          <p>Muốn thêm từ mới? Khám phá thêm từ <button type="button" onClick={onNavigateToLibrary} className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">Kho thẻ</button> và import vào bộ của bạn để chơi game.</p>
        </div>
      </div>

      <div className="pt-2">
        <Button
          onClick={handleStart}
          disabled={selectedGroupKeys.size === 0 || totalSelectedCards < 2}
          className="w-full"
          size="lg"
        >
          <Gamepad2 className="h-5 w-5 mr-2" />
          Bắt đầu chơi ({totalSelectedCards} thẻ)
        </Button>
        {selectedGroupKeys.size > 0 && totalSelectedCards < 2 && (
          <p className="text-xs text-destructive text-center mt-1">Cần ít nhất 2 thẻ để chơi</p>
        )}
      </div>
    </div>
  );
}

/* ═══ GAME HUB ═══ */
export default function VocabGameHub({ cards, onNavigateToLibrary, onSyncFlashcard }: { cards: Flashcard[]; onNavigateToLibrary?: () => void; onSyncFlashcard?: (id: string, quality: 0 | 1 | 2 | 3 | 4 | 5) => Promise<void>; }) {
  const { user } = useAuth();
  const { checkBadges } = useAutoBadges();
  _checkBadgesFn = checkBadges;
  _syncFlashcardFn = onSyncFlashcard || null;
  const [mode, setMode] = useState<GameMode>(null);
  const [retryCards, setRetryCards] = useState<Flashcard[] | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [gameCards, setGameCards] = useState<Flashcard[] | null>(null);
  const [selectedSetNames, setSelectedSetNames] = useState<string[]>([]);

  const handleRetryWrong = useCallback((wrongCards: Flashcard[]) => {
    if (wrongCards.length < 2) return;
    setRetryCards(wrongCards);
    setRetryKey(k => k + 1);
  }, []);

  const handleStartFromSets = useCallback((filteredCards: Flashcard[], names: string[]) => {
    setGameCards(filteredCards);
    setSelectedSetNames(names);
  }, []);

  const playableCards = gameCards || [];
  const activeCards = retryCards || playableCards;
  const isRetryMode = !!retryCards;

  // Step 1: Set selection (if no game cards chosen yet)
  if (!gameCards && !retryCards) {
    return <SetSelectionScreen cards={cards} onStart={handleStartFromSets} onNavigateToLibrary={onNavigateToLibrary} />;
  }

  if (activeCards.length < 2 && !mode) {
    return (
      <div className="text-center py-16">
        <Gamepad2 className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground font-medium">Cần ít nhất 2 flashcard chưa thuộc để chơi</p>
        <Button variant="ghost" className="mt-4" onClick={() => { setGameCards(null); setRetryCards(null); setMode(null); }}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Chọn lại bộ từ
        </Button>
      </div>
    );
  }

  // Step 2: Game mode selection
  if (mode === null) {
    return (
      <div className="space-y-4">
        {/* Selected sets banner */}
        {selectedSetNames.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-muted-foreground font-medium">Đang chơi:</span>
            {selectedSetNames.map((name, i) => (
              <span key={i} className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{name}</span>
            ))}
            <button onClick={() => { setGameCards(null); setMode(null); setRetryCards(null); }} className="text-muted-foreground hover:text-foreground ml-auto underline text-xs">
              Đổi bộ từ
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 mb-2">
          <Gamepad2 className="h-5 w-5 text-primary" />
          <h3 className="font-display font-bold">Chọn trò chơi</h3>
          <span className="text-xs text-muted-foreground ml-auto">{playableCards.length} thẻ sẵn sàng</span>
        </div>
        <div className="grid gap-3">
          {GAME_MODES.map(g => {
            const Icon = g.icon;
            const disabled = playableCards.length < g.minCards;
            return (
              <button
                key={g.id}
                disabled={disabled}
                onClick={() => setMode(g.id)}
                className={cn(
                  "w-full text-left rounded-2xl border p-4 transition-all bg-gradient-to-br",
                  g.color,
                  disabled ? "opacity-40 cursor-not-allowed" : "hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-card/80 flex items-center justify-center shrink-0 shadow-sm">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-sm">{g.label}</p>
                    <p className="text-xs text-muted-foreground">{g.desc}</p>
                    {disabled && <p className="text-[10px] text-destructive mt-0.5">Cần ít nhất {g.minCards} thẻ</p>}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Step 3: Gameplay
  const BackButton = () => (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <Button variant="ghost" size="sm" onClick={() => { setMode(null); setRetryCards(null); }}>
        <ChevronLeft className="h-4 w-4 mr-1" /> Chọn game khác
      </Button>
      {isRetryMode && (
        <span className="text-xs font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
          Ôn lại {activeCards.length} từ sai
        </span>
      )}
      {!isRetryMode && selectedSetNames.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {selectedSetNames.map((name, i) => (
            <span key={i} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{name}</span>
          ))}
        </div>
      )}
    </div>
  );

  const renderGame = () => {
    switch (mode) {
      case "matching":
        return <MatchingGame key={retryKey} cards={activeCards} userId={user?.id} onRetryWrong={handleRetryWrong} isRetryMode={isRetryMode} />;
      case "typing":
        return <TypingGame key={retryKey} cards={activeCards} userId={user?.id} onRetryWrong={handleRetryWrong} isRetryMode={isRetryMode} />;
      case "shooting":
        return <ShootingGame key={retryKey} cards={activeCards} userId={user?.id} onRetryWrong={handleRetryWrong} isRetryMode={isRetryMode} />;
      case "challenge":
        return <ChallengeGame key={retryKey} cards={activeCards} userId={user?.id} onRetryWrong={handleRetryWrong} isRetryMode={isRetryMode} />;
      case "shark":
        return <SharkGame key={retryKey} cards={activeCards} userId={user?.id} onRetryWrong={handleRetryWrong} isRetryMode={isRetryMode} />;
      default:
        return (
          <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
            <p className="font-medium">Không tải được trò chơi, vui lòng chọn lại.</p>
            <Button variant="outline" onClick={() => setMode(null)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Quay lại chọn game
            </Button>
          </div>
        );
    }
  };

  return (
    <div>
      <BackButton />
      {renderGame()}
    </div>
  );
}

/* ═══ 1. MATCHING GAME (existing logic) ═══ */
interface GameTile { id: string; text: string; cardId: string; side: "front" | "back"; matched: boolean }

function MatchingGame({ cards, userId, onRetryWrong, isRetryMode }: { cards: Flashcard[]; userId?: string; onRetryWrong?: (wrongCards: Flashcard[]) => void; isRetryMode?: boolean }) {
  const selector = useSmartSelector(cards);
  const [tiles, setTiles] = useState<GameTile[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [wrongPair, setWrongPair] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [round, setRound] = useState(0);

  const startRound = useCallback(() => {
    const pool = selector.pickBatch(6);
    if (pool.length < 2) { setGameOver(true); return; }
    const gameTiles: GameTile[] = [];
    pool.forEach(c => {
      gameTiles.push({ id: c.id + "-f", text: c.front, cardId: c.id, side: "front", matched: false });
      gameTiles.push({ id: c.id + "-b", text: c.back, cardId: c.id, side: "back", matched: false });
    });
    setTiles(gameTiles.sort(() => Math.random() - 0.5));
    setSelected(null); setWrongPair([]);
  }, [selector]);

  const startGame = useCallback(() => {
    selector.reset();
    setScore(0); setTotal(0); setGameOver(false); setRound(0);
  }, [selector]);

  // Start first round
  useEffect(() => { startRound(); }, [round, startRound]);
  useEffect(() => { startGame(); }, [startGame]);

  useEffect(() => { startGame(); }, [startGame]);

  const handleTileClick = (tileId: string) => {
    if (wrongPair.length > 0) return;
    const tile = tiles.find(t => t.id === tileId);
    if (!tile || tile.matched) return;
    if (!selected) { setSelected(tileId); return; }
    const prev = tiles.find(t => t.id === selected)!;
    setTotal(t => t + 1);
    if (prev.cardId === tile.cardId && prev.side !== tile.side) {
      setScore(s => s + 1);
      selector.recordResult(tile.cardId, true);
      playCorrectSound();
      const updated = tiles.map(t => t.cardId === tile.cardId ? { ...t, matched: true } : t);
      setTiles(updated); setSelected(null);
      if (updated.every(t => t.matched)) {
        playComboSound();
        // Check if more active cards remain for next round
        if (selector.hasActiveCards()) {
          setTimeout(() => setRound(r => r + 1), 800);
        } else {
          setGameOver(true);
        }
      }
    } else {
      playWrongSound();
      setWrongPair([selected, tileId]);
      setTimeout(() => { setWrongPair([]); setSelected(null); }, 800);
    }
  };

  // Save score on game over
  const scoreSavedRef = useRef(false);
  useEffect(() => {
    if (gameOver && score > 0 && !scoreSavedRef.current) {
      scoreSavedRef.current = true;
      saveGameScore(userId, "matching", score);
      syncGameToSR(selector.getRawStats());
      if (isRetryMode && selector.masteredCount() === cards.length) { fireConfetti(); playVictorySound(); }
    }
    if (!gameOver) scoreSavedRef.current = false;
  }, [gameOver, score, userId, isRetryMode, selector, cards.length]);

  if (gameOver) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 space-y-4">
          <CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
          <h3 className="font-display text-xl font-extrabold">Hoàn thành!</h3>
          <p className="text-muted-foreground">Ghép đúng {score} cặp trong {total} lượt</p>
          <p className="text-xs text-primary font-medium"> Đã thuộc: {selector.masteredCount()}/{cards.length} từ</p>
          <Button onClick={startGame}><RotateCcw className="h-4 w-4 mr-2" /> Chơi lại</Button>
        </div>
        <GameEndStats stats={selector.getAllStats()} onRetryWrong={onRetryWrong} />
        <GameLeaderboard gameMode="matching" currentUserId={userId} />
      </div>
    );
  }

  if (tiles.length === 0) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground font-medium">Ghép từ với nghĩa · {score}/{tiles.length / 2} cặp</p>
        <Button variant="ghost" size="sm" onClick={startGame}><Shuffle className="h-4 w-4 mr-1" /> Ván mới</Button>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
        {tiles.map(tile => {
          const isSelected = selected === tile.id;
          const isWrong = wrongPair.includes(tile.id);
          return (
            <button
              key={tile.id}
              onClick={() => handleTileClick(tile.id)}
              disabled={tile.matched}
              className={cn(
                "rounded-xl border-2 p-3 min-h-[80px] text-sm font-medium transition-all duration-200 text-center",
                tile.matched && "bg-primary/10 border-primary/30 text-primary opacity-60",
                isSelected && !isWrong && "border-primary bg-primary/5 ring-2 ring-primary/20",
                isWrong && "border-destructive bg-destructive/5 animate-shake",
                !tile.matched && !isSelected && !isWrong && "border-border bg-card hover:border-primary/40 hover:bg-primary/5"
              )}
            >
              {tile.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══ 2. TYPING GAME — see Vietnamese meaning, type English word ═══ */
function TypingGame({ cards, userId, onRetryWrong, isRetryMode }: { cards: Flashcard[]; userId?: string; onRetryWrong?: (wrongCards: Flashcard[]) => void; isRetryMode?: boolean }) {
  const selector = useSmartSelector(cards);
  const [currentCard, setCurrentCard] = useState<Flashcard | null>(null);
  const [answered, setAnswered] = useState(0);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameOver, setGameOver] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [paused, setPaused] = useState(false);
  const [reviewCountdown, setReviewCountdown] = useState(0);
  const [hintLevel, setHintLevel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const startGame = useCallback(() => {
    if (cards.length === 0) return;
    selector.reset();
    setInput(""); setScore(0); setWrong(0); setAnswered(0); setTimeLeft(60); setGameOver(false); setFeedback(null); setPaused(false); setReviewCountdown(0); setHintLevel(0);
    setCurrentCard(null); // will be set in effect
  }, [cards, selector]);

  // Pick first/next card
  useEffect(() => {
    if (!currentCard && !gameOver) {
      const next = selector.pickNext();
      if (next) setCurrentCard(next);
      else setGameOver(true);
    }
  }, [currentCard, gameOver, selector]);

  useEffect(() => { startGame(); }, [startGame]);

  // Timer pauses during review
  useEffect(() => {
    if (gameOver || paused) return;
    if (timeLeft <= 0) { setGameOver(true); playGameOverSound(); return; }
    const t = setTimeout(() => setTimeLeft(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, gameOver, paused]);

  useEffect(() => { if (!paused) inputRef.current?.focus(); }, [currentCard, paused]);

  // Review countdown auto-advance
  useEffect(() => {
    if (!paused || reviewCountdown <= 0) return;
    const t = setTimeout(() => {
      setReviewCountdown(p => {
        if (p <= 1) {
          setPaused(false); setFeedback(null); setInput(""); setHintLevel(0);
          setCurrentCard(null); // trigger next pick
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearTimeout(t);
  }, [paused, reviewCountdown]);

  const goToNext = useCallback(() => {
    setPaused(false); setFeedback(null); setInput(""); setReviewCountdown(0); setHintLevel(0);
    setCurrentCard(null); // trigger next pick
  }, []);

  const getHintText = (word: string, level: number) => {
    const chars = Math.min(level, word.length);
    return word.slice(0, chars) + "_ ".repeat(word.length - chars).trim();
  };

  const handleHint = () => {
    if (!currentCard || paused || gameOver) return;
    const newLevel = Math.min(hintLevel + 1, Math.ceil(currentCard.front.length / 2));
    setHintLevel(newLevel);
    setTimeLeft(t => Math.max(0, t - 3));
  };

  const handleSubmit = () => {
    if (!input.trim() || gameOver || paused || !currentCard) return;
    const isCorrect = input.trim().toLowerCase() === currentCard.front.toLowerCase();
    selector.recordResult(currentCard.id, isCorrect);
    if (isCorrect) {
      setScore(s => s + 1); setFeedback("correct"); playCorrectSound();
    } else {
      setWrong(w => w + 1); setFeedback("wrong"); playWrongSound();
    }
    setAnswered(a => a + 1);
    setPaused(true);
    setReviewCountdown(isCorrect ? 5 : 10);
  };

  // Save score on game over
  const scoreSavedRef = useRef(false);
  useEffect(() => {
    if (gameOver && score > 0 && !scoreSavedRef.current) {
      scoreSavedRef.current = true;
      saveGameScore(userId, "typing", score);
      syncGameToSR(selector.getRawStats());
      if (isRetryMode && selector.masteredCount() === cards.length) { fireConfetti(); playVictorySound(); }
    }
    if (!gameOver) scoreSavedRef.current = false;
  }, [gameOver, score, userId, isRetryMode, selector, cards.length]);

  if (gameOver) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 space-y-4">
          <Keyboard className="h-12 w-12 mx-auto text-primary" />
          <h3 className="font-display text-xl font-extrabold">Hết giờ!</h3>
          <p className="text-muted-foreground">
            Đúng <span className="text-primary font-bold">{score}</span> · Sai <span className="text-destructive font-bold">{wrong}</span>
          </p>
          <p className="text-xs text-primary font-medium"> Đã thuộc: {selector.masteredCount()}/{cards.length} từ</p>
          <Button onClick={startGame}><RotateCcw className="h-4 w-4 mr-2" /> Chơi lại</Button>
        </div>
        <GameEndStats stats={selector.getAllStats()} onRetryWrong={onRetryWrong} />
        <GameLeaderboard gameMode="typing" currentUserId={userId} />
      </div>
    );
  }

  const card = currentCard;
  if (!card) {
    // If no card after a short wait, try to pick one directly
    if (cards.length > 0 && !gameOver) {
      const fallback = selector.pickNext();
      if (fallback) {
        setTimeout(() => setCurrentCard(fallback), 0);
      }
    }
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-10 w-20 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timer & score */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-muted-foreground" />
          <span className={cn("font-bold tabular-nums", timeLeft <= 10 && "text-destructive animate-pulse")}>{timeLeft}s</span>
          {paused && <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Đang xem đáp án</span>}
        </div>
        <span className="text-muted-foreground font-medium">Đúng: {score} · Sai: {wrong}</span>
      </div>
      <Progress value={(timeLeft / 60) * 100} className="h-1.5" />

      {/* Card */}
      <div className={cn(
        "rounded-2xl border-2 p-8 text-center transition-all duration-300",
        feedback === "correct" && "border-primary bg-primary/5",
        feedback === "wrong" && "border-destructive bg-destructive/5",
        !feedback && "border-border"
      )}>
        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2">Nghĩa tiếng Việt</p>
        <p className="text-xl font-bold">{card.back}</p>
        {hintLevel > 0 && !feedback && (
          <p className="text-sm text-accent mt-2 font-mono tracking-wider"> {getHintText(card.front, hintLevel)}</p>
        )}
        {feedback === "correct" && (
          <p className="text-sm text-primary mt-2 font-bold"> {card.front}</p>
        )}
        {feedback === "wrong" && (
          <p className="text-sm text-destructive mt-2">Đáp án: <span className="font-bold">{card.front}</span></p>
        )}
      </div>

      {/* Input or Next button */}
      {paused ? (
        <div className="flex justify-center">
          <Button onClick={goToNext} className="min-w-[140px]">
            <ArrowRight className="h-4 w-4 mr-2" />
            Tiếp {reviewCountdown > 0 ? `(${reviewCountdown}s)` : ""}
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            onPaste={e => e.preventDefault()}
            onCopy={e => e.preventDefault()}
            onCut={e => e.preventDefault()}
            placeholder="Gõ từ tiếng Anh..."
            disabled={!!feedback}
            className="text-center font-medium"
            autoComplete="off"
          />
          <Button onClick={handleHint} variant="ghost" size="icon" className="shrink-0" title="Gợi ý (-3s)" disabled={!!feedback || hintLevel >= Math.ceil(card.front.length / 2)}>
            <Lightbulb className="h-4 w-4" />
          </Button>
          <Button onClick={handleSubmit} disabled={!input.trim() || !!feedback}>
            <Zap className="h-4 w-4" />
          </Button>
        </div>
      )}
      <p className="text-center text-xs text-muted-foreground">Đã trả lời: {answered} · Thuộc: {selector.masteredCount()}/{cards.length}</p>
    </div>
  );
}

/* ═══ 3. SHOOTING GAME — words fall, shoot the correct one ═══ */
interface FallingWord { id: string; text: string; cardId: string; x: number; y: number; speed: number }

type ShootingDifficulty = "easy" | "medium" | "hard";
const SHOOTING_SETTINGS: Record<ShootingDifficulty, { label: string; spawnInterval: number; speedMin: number; speedRange: number; targetHoldMs: number }> = {
  easy:   { label: "Dễ",         spawnInterval: 6000, speedMin: 0.33, speedRange: 0.04, targetHoldMs: 12000 },
  medium: { label: "Trung bình", spawnInterval: 4500, speedMin: 0.40, speedRange: 0.06, targetHoldMs: 8000 },
  hard:   { label: "Khó",        spawnInterval: 3500, speedMin: 0.55, speedRange: 0.10, targetHoldMs: 5500 },
};

function ShootingGame({ cards, userId, onRetryWrong, isRetryMode }: { cards: Flashcard[]; userId?: string; onRetryWrong?: (wrongCards: Flashcard[]) => void; isRetryMode?: boolean }) {
  const selector = useSmartSelector(cards);
  const [difficulty, setDifficulty] = useState<ShootingDifficulty | null>(null);
  const [currentCard, setCurrentCard] = useState<Flashcard | null>(null);
  const currentCardRef = useRef<Flashcard | null>(null);
  const [fallingWords, setFallingWords] = useState<FallingWord[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const livesRef = useRef(3);
  const [gameOver, setGameOver] = useState(false);
  const [flash, setFlash] = useState<"hit" | "miss" | null>(null);
  const frameRef = useRef<number>(0);
  const lastSpawnRef = useRef(0);

  // Keep refs in sync
  useEffect(() => { currentCardRef.current = currentCard; }, [currentCard]);
  useEffect(() => { livesRef.current = lives; }, [lives]);

  const startGame = useCallback((diff: ShootingDifficulty) => {
    setDifficulty(diff);
    selector.reset();
    setCurrentCard(null); currentCardRef.current = null;
    setFallingWords([]); setScore(0); setLives(3); livesRef.current = 3;
    setGameOver(false); setFlash(null);
    lastSpawnRef.current = 0;
  }, [selector]);

  // Spawn & move words
  useEffect(() => {
    if (gameOver || !difficulty) return;
    const settings = SHOOTING_SETTINGS[difficulty];
    let running = true;

    const tick = () => {
      if (!running) return;
      const now = Date.now();

      setFallingWords(prev => {
        let updated = prev.map(w => ({ ...w, y: w.y + w.speed }));
        const fallen = updated.filter(w => w.y >= 100);
        
        if (fallen.length > 0) {
          const cc = currentCardRef.current;
          const correctFallen = fallen.filter(w => cc && w.cardId === cc.id);
          if (correctFallen.length > 0 && livesRef.current > 0) {
            selector.recordResult(cc!.id, false);
            const newL = livesRef.current - 1;
            livesRef.current = newL;
            setLives(newL);
            if (newL <= 0) { setGameOver(true); playGameOverSound(); }
            else {
              // Advance to next target
              const nextCard = selector.pickNext();
              if (nextCard) { setCurrentCard(nextCard); currentCardRef.current = nextCard; }
              else { setGameOver(true); }
            }
          }
          // Remove all fallen words
          updated = updated.filter(w => w.y < 100);
        }
        return updated;
      });

      // Spawn new batch continuously
      if (now - lastSpawnRef.current > settings.spawnInterval) {
        lastSpawnRef.current = now;
        let cc = currentCardRef.current;
        if (!cc) {
          const nextCard = selector.pickNext();
          if (!nextCard) { setGameOver(true); return; }
          cc = nextCard;
          setCurrentCard(nextCard);
          currentCardRef.current = nextCard;
        }
        const wrongCards = cards.filter(c => c.id !== cc!.id).sort(() => Math.random() - 0.5).slice(0, 3);
        const options = [cc!, ...wrongCards].sort(() => Math.random() - 0.5);
        const columnWidth = 90 / Math.min(options.length, 4);
        const newWords: FallingWord[] = options.map((c, i) => ({
          id: `${now}-${i}`,
          text: c.front,
          cardId: c.id,
          x: 5 + (i * columnWidth) + Math.random() * (columnWidth * 0.3),
          y: -10 - Math.random() * 15,
          speed: settings.speedMin + Math.random() * settings.speedRange,
        }));
        setFallingWords(p => [...p, ...newWords]);
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(frameRef.current); };
  }, [gameOver, cards, difficulty, selector]);

  const handleShoot = (word: FallingWord) => {
    const cc = currentCardRef.current;
    if (!cc) return;
    if (word.cardId === cc.id) {
      setScore(s => s + 1);
      setFlash("hit");
      selector.recordResult(cc.id, true);
      playCorrectSound();
      // Remove all current batch words and advance to next card
      setFallingWords(p => p.filter(w => w.id !== word.id));
      const nextCard = selector.pickNext();
      if (nextCard) { setCurrentCard(nextCard); currentCardRef.current = nextCard; }
      else { setGameOver(true); }
    } else {
      setFlash("miss");
      selector.recordResult(cc.id, false);
      playWrongSound();
      const newL = livesRef.current - 1;
      livesRef.current = newL;
      setLives(Math.max(0, newL));
      if (newL <= 0) { setGameOver(true); playGameOverSound(); }
    }
    setTimeout(() => setFlash(null), 300);
  };

  // Save score on game over
  const scoreSavedRef = useRef(false);
  useEffect(() => {
    if (gameOver && score > 0 && !scoreSavedRef.current) {
      scoreSavedRef.current = true;
      saveGameScore(userId, "shooting", score, difficulty || undefined);
      syncGameToSR(selector.getRawStats());
      if (isRetryMode && selector.masteredCount() === cards.length) { fireConfetti(); playVictorySound(); }
    }
    if (!gameOver) scoreSavedRef.current = false;
  }, [gameOver, score, userId, difficulty, isRetryMode, selector, cards.length]);

  // Difficulty selection screen
  if (!difficulty) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 space-y-5">
          <Crosshair className="h-12 w-12 mx-auto text-primary" />
          <h3 className="font-display text-xl font-extrabold">Chọn độ khó</h3>
          <div className="flex justify-center gap-3">
            {(Object.entries(SHOOTING_SETTINGS) as [ShootingDifficulty, typeof SHOOTING_SETTINGS["easy"]][]).map(([key, val]) => (
              <Button key={key} variant="outline" onClick={() => startGame(key)} className="min-w-[100px]">
                {val.label}
              </Button>
            ))}
          </div>
        </div>
        <GameLeaderboard gameMode="shooting" currentUserId={userId} />
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 space-y-4">
          <Crosshair className="h-12 w-12 mx-auto text-primary" />
          <h3 className="font-display text-xl font-extrabold">Game Over!</h3>
          <p className="text-muted-foreground">Bạn bắn trúng <span className="text-primary font-bold">{score}</span> từ</p>
          <div className="flex justify-center gap-3">
            <Button onClick={() => startGame(difficulty)}><RotateCcw className="h-4 w-4 mr-2" /> Chơi lại</Button>
            <Button variant="outline" onClick={() => setDifficulty(null)}>Đổi độ khó</Button>
          </div>
        </div>
        <GameEndStats stats={selector.getAllStats()} onRetryWrong={onRetryWrong} />
        <GameLeaderboard gameMode="shooting" currentUserId={userId} />
      </div>
    );
  }

  const shootingTarget = currentCard;

  return (
    <div className="space-y-3">
      {/* HUD */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className={cn("text-lg", i < lives ?"text-destructive":"text-muted-foreground/20")}></span>
          ))}
        </div>
        <span className="font-bold text-primary">{score} điểm</span>
      </div>

      {/* Target word */}
      {shootingTarget ? (
        <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 text-center">
          <p className="text-[10px] uppercase font-bold text-accent tracking-widest">Bắn từ có nghĩa:</p>
          <p className="text-lg font-bold mt-1">{shootingTarget.back}</p>
        </div>
      ) : (
        <div className="rounded-xl border p-3 text-center animate-pulse">
          <Skeleton className="h-3 w-24 mx-auto mb-2" />
          <Skeleton className="h-6 w-32 mx-auto" />
        </div>
      )}

      {/* Game area */}
      <div className={cn(
        "relative rounded-2xl border-2 overflow-hidden transition-colors duration-200",
        flash === "hit" && "border-primary bg-primary/5",
        flash === "miss" && "border-destructive bg-destructive/5",
        !flash && "border-border bg-muted/30"
      )} style={{ height: 320 }}>
        {fallingWords.map(word => (
          <button
            key={word.id}
            onClick={() => handleShoot(word)}
            className="absolute px-3 py-1.5 bg-card border rounded-lg text-sm font-medium hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-sm cursor-crosshair whitespace-nowrap max-w-[45%] truncate"
            style={{
              left: `${word.x}%`,
              top: `${word.y}%`,
              transform: "translateX(-50%)",
              zIndex: Math.floor(word.y) + 10,
            }}
          >
            {word.text}
          </button>
        ))}
        {fallingWords.length === 0 && !gameOver && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40 text-sm">
            Đang chuẩn bị...
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══ 4. CHALLENGE GAME — streak mode ═══ */
type ChallengeDifficulty = "easy" | "medium" | "hard";
const CHALLENGE_SETTINGS: Record<ChallengeDifficulty, { label: string; baseTime: number; minTime: number; shrinkEvery: number }> = {
  easy:   { label: "Dễ",         baseTime: 12, minTime: 6, shrinkEvery: 7 },
  medium: { label: "Trung bình", baseTime: 8,  minTime: 4, shrinkEvery: 5 },
  hard:   { label: "Khó",        baseTime: 5,  minTime: 2, shrinkEvery: 3 },
};

function ChallengeGame({ cards, userId, onRetryWrong, isRetryMode }: { cards: Flashcard[]; userId?: string; onRetryWrong?: (wrongCards: Flashcard[]) => void; isRetryMode?: boolean }) {
  const selector = useSmartSelector(cards);
  const [difficulty, setDifficulty] = useState<ChallengeDifficulty | null>(null);
  const [currentCard, setCurrentCard] = useState<Flashcard | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [feedback, setFeedback] = useState<{ answer: string; correct: boolean } | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [timeLeft, setTimeLeft] = useState(8);

  const generateOptions = useCallback((correctCard: Flashcard) => {
    const wrongOptions = cards
      .filter(c => c.id !== correctCard.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(c => c.front);
    const all = [correctCard.front, ...wrongOptions].sort(() => Math.random() - 0.5);
    setOptions(all);
  }, [cards]);

  const pickAndShow = useCallback(() => {
    const next = selector.pickNext();
    if (!next) {
      // All mastered — reshuffle by resetting stats
      selector.reset();
      const fresh = selector.pickNext();
      if (!fresh) return;
      setCurrentCard(fresh);
      generateOptions(fresh);
    } else {
      setCurrentCard(next);
      generateOptions(next);
    }
  }, [selector, generateOptions]);

  const startGame = useCallback((diff: ChallengeDifficulty) => {
    setDifficulty(diff);
    selector.reset();
    const settings = CHALLENGE_SETTINGS[diff];
    setStreak(0); setBestStreak(0); setGameOver(false); setFeedback(null); setTimeLeft(settings.baseTime);
    const first = selector.pickNext();
    if (first) { setCurrentCard(first); generateOptions(first); }
  }, [selector, generateOptions]);

  // Timer per question
  useEffect(() => {
    if (gameOver || feedback) return;
    if (timeLeft <= 0) { setGameOver(true); return; }
    const t = setTimeout(() => setTimeLeft(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, gameOver, feedback]);

  const handleAnswer = (answer: string) => {
    if (feedback || gameOver || !currentCard) return;
    const correct = answer === currentCard.front;
    setFeedback({ answer, correct });
    selector.recordResult(currentCard.id, correct);
    if (correct) {
      setStreak(s => {
        const n = s + 1;
        setBestStreak(b => Math.max(b, n));
        if (n > 0 && n % 5 === 0) playComboSound();
        else playCorrectSound();
        return n;
      });
    } else {
      playGameOverSound();
      setGameOver(true);
      return;
    }
    setTimeout(() => {
      setFeedback(null);
      pickAndShow();
      const s = CHALLENGE_SETTINGS[difficulty!];
      setTimeLeft(Math.max(s.minTime, s.baseTime - Math.floor(streak / s.shrinkEvery)));
    }, 500);
  };

  // Save score on game over
  const scoreSavedRef = useRef(false);
  useEffect(() => {
    if (gameOver && bestStreak > 0 && !scoreSavedRef.current) {
      scoreSavedRef.current = true;
      saveGameScore(userId, "challenge", bestStreak, difficulty || undefined);
      syncGameToSR(selector.getRawStats());
      if (isRetryMode && selector.masteredCount() === cards.length) { fireConfetti(); playVictorySound(); }
    }
    if (!gameOver) scoreSavedRef.current = false;
  }, [gameOver, bestStreak, userId, difficulty, isRetryMode, selector, cards.length]);

  // Difficulty selection
  if (!difficulty) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 space-y-5">
          <Trophy className="h-12 w-12 mx-auto text-accent" />
          <h3 className="font-display text-xl font-extrabold">Chọn độ khó</h3>
          <div className="flex justify-center gap-3">
            {(Object.entries(CHALLENGE_SETTINGS) as [ChallengeDifficulty, typeof CHALLENGE_SETTINGS["easy"]][]).map(([key, val]) => (
              <Button key={key} variant="outline" onClick={() => startGame(key)} className="min-w-[100px]">
                {val.label}
              </Button>
            ))}
          </div>
        </div>
        <GameEndStats stats={selector.getAllStats()} onRetryWrong={onRetryWrong} />
        <GameLeaderboard gameMode="challenge" currentUserId={userId} />
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 space-y-4">
          <Trophy className="h-12 w-12 mx-auto text-accent" />
          <h3 className="font-display text-xl font-extrabold">Thách đấu kết thúc!</h3>
          <div className="flex justify-center gap-6">
            <div className="text-center">
              <p className="font-display text-3xl font-extrabold text-primary">{streak}</p>
              <p className="text-xs text-muted-foreground">Streak cuối</p>
            </div>
            <div className="text-center">
              <p className="font-display text-3xl font-extrabold text-accent">{bestStreak}</p>
              <p className="text-xs text-muted-foreground">Kỷ lục</p>
            </div>
          </div>
          <div className="flex justify-center gap-3">
            <Button onClick={() => startGame(difficulty)}><RotateCcw className="h-4 w-4 mr-2" /> Thách đấu lại</Button>
            <Button variant="outline" onClick={() => setDifficulty(null)}>Đổi độ khó</Button>
          </div>
        </div>
        <GameEndStats stats={selector.getAllStats()} onRetryWrong={onRetryWrong} />
        <GameLeaderboard gameMode="challenge" currentUserId={userId} />
      </div>
    );
  }

  const card = currentCard;
  if (!card) {
    return (
      <div className="space-y-4 animate-pulse">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-1.5 w-full rounded-full" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-2.5">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Streak & timer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className={cn("h-5 w-5", streak >= 5 ? "text-accent" : "text-muted-foreground")} />
          <span className="font-display text-lg font-extrabold">{streak}</span>
          <span className="text-xs text-muted-foreground">streak</span>
        </div>
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-muted-foreground" />
          <span className={cn("font-bold tabular-nums text-sm", timeLeft <= 3 && "text-destructive animate-pulse")}>{timeLeft}s</span>
        </div>
      </div>
      <Progress value={(timeLeft / (CHALLENGE_SETTINGS[difficulty!].baseTime)) * 100} className="h-1.5" />

      {/* Prompt */}
      <div className="rounded-2xl border-2 border-primary/20 p-6 text-center bg-primary/5">
        <p className="text-[10px] uppercase font-bold text-primary/50 tracking-widest mb-2">Chọn từ đúng nghĩa</p>
        <p className="text-xl font-bold">{card.back}</p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-2.5">
        {options.map(opt => {
          const isCorrect = opt === card.front;
          const isChosen = feedback?.answer === opt;
          return (
            <button
              key={opt}
              onClick={() => handleAnswer(opt)}
              disabled={!!feedback}
              className={cn(
                "rounded-xl border-2 p-4 text-sm font-medium transition-all duration-200 text-center",
                !feedback && "border-border bg-card hover:border-primary/40 hover:bg-primary/5",
                feedback && isChosen && isCorrect && "border-primary bg-primary/10 text-primary",
                feedback && isChosen && !isCorrect && "border-destructive bg-destructive/10 text-destructive",
                feedback && !isChosen && isCorrect && "border-primary/40 bg-primary/5",
                feedback && !isChosen && !isCorrect && "opacity-50"
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {streak >= 5 && (
        <p className="text-center text-xs text-accent font-bold animate-pulse">
           Streak {streak}! Tốc độ tăng dần!
        </p>
      )}
    </div>
  );
}

/* ═══ 6. SHARK GAME — type the word before the shark reaches you ═══ */
function SharkGame({ cards, userId, onRetryWrong, isRetryMode }: { cards: Flashcard[]; userId?: string; onRetryWrong?: (wrongCards: Flashcard[]) => void; isRetryMode?: boolean }) {
  const selector = useSmartSelector(cards);
  const [currentCard, setCurrentCard] = useState<Flashcard | null>(null);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [sharkPos, setSharkPos] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [paused, setPaused] = useState(false);
  const [reviewCountdown, setReviewCountdown] = useState(0);
  const [hintLevel, setHintLevel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const getSharkSpeed = useCallback((card: Flashcard) => {
    const len = card.front.length;
    if (len >= 12) return 0.2;
    if (len >= 8) return 0.3;
    if (len >= 5) return 0.4;
    return 0.5;
  }, []);

  const startGame = useCallback(() => {
    selector.reset();
    setInput(""); setScore(0); setSharkPos(0);
    setGameOver(false); setFeedback(null); setPaused(false); setReviewCountdown(0); setHintLevel(0);
    setCurrentCard(null);
  }, [selector]);

  // Pick first/next card
  useEffect(() => {
    if (!currentCard && !gameOver) {
      const next = selector.pickNext();
      if (next) setCurrentCard(next);
      else setGameOver(true);
    }
  }, [currentCard, gameOver, selector]);

  useEffect(() => { startGame(); }, [startGame]);

  // Shark auto-advances (pauses during review)
  useEffect(() => {
    if (gameOver || !currentCard || paused) return;
    const speed = getSharkSpeed(currentCard);
    timerRef.current = setInterval(() => {
      setSharkPos(prev => {
        const next = prev + speed;
        if (next >= 100) { setGameOver(true); playGameOverSound(); return 100; }
        return next;
      });
    }, 100);
    return () => clearInterval(timerRef.current);
  }, [gameOver, currentCard, paused, getSharkSpeed]);

  useEffect(() => {
    if (!gameOver && !paused) inputRef.current?.focus();
  }, [currentCard, paused, gameOver]);

  // Review countdown auto-advance
  useEffect(() => {
    if (!paused || reviewCountdown <= 0) return;
    const t = setTimeout(() => {
      setReviewCountdown(p => {
        if (p <= 1) {
          setPaused(false); setFeedback(null); setInput(""); setHintLevel(0);
          setCurrentCard(null); // trigger next pick
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearTimeout(t);
  }, [paused, reviewCountdown]);

  const goToNext = useCallback(() => {
    setPaused(false); setFeedback(null); setInput(""); setReviewCountdown(0); setHintLevel(0);
    setCurrentCard(null); // trigger next pick
  }, []);

  const getHintText = (word: string, level: number) => {
    const chars = Math.min(level, word.length);
    return word.slice(0, chars) + "_ ".repeat(word.length - chars).trim();
  };

  const handleHint = () => {
    if (!currentCard || paused || gameOver) return;
    const newLevel = Math.min(hintLevel + 1, Math.ceil(currentCard.front.length / 2));
    setHintLevel(newLevel);
    setSharkPos(p => Math.min(100, p + 5));
  };

  const handleSubmit = () => {
    if (!input.trim() || gameOver || paused || !currentCard) return;
    const isCorrect = input.trim().toLowerCase() === currentCard.front.toLowerCase();
    selector.recordResult(currentCard.id, isCorrect);

    if (isCorrect) {
      setScore(s => s + 1);
      setFeedback("correct");
      playCorrectSound();
      setSharkPos(p => Math.max(0, p - 15));
    } else {
      setFeedback("wrong");
      playWrongSound();
      setSharkPos(p => {
        const next = Math.min(100, p + 20);
        if (next >= 100) { setGameOver(true); playGameOverSound(); }
        return next;
      });
    }

    setPaused(true);
    setReviewCountdown(isCorrect ? 5 : 10);
  };

  // Save score on game over
  const scoreSavedRef = useRef(false);
  useEffect(() => {
    if (gameOver && score > 0 && !scoreSavedRef.current) {
      scoreSavedRef.current = true;
      saveGameScore(userId, "shark", score);
      syncGameToSR(selector.getRawStats());
      if (isRetryMode && selector.masteredCount() === cards.length) { fireConfetti(); playVictorySound(); }
    }
    if (!gameOver) scoreSavedRef.current = false;
  }, [gameOver, score, userId, isRetryMode, selector, cards.length]);

  if (gameOver && sharkPos >= 100) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 space-y-4">
          <div className="text-6xl"></div>
          <h3 className="font-display text-xl font-extrabold text-destructive">Cá mập đã tới!</h3>
          <p className="text-muted-foreground">Bạn trả lời đúng <span className="text-primary font-bold">{score}</span> từ trước khi bị bắt</p>
          <Button onClick={startGame}><RotateCcw className="h-4 w-4 mr-2" /> Chơi lại</Button>
        </div>
        <GameEndStats stats={selector.getAllStats()} onRetryWrong={onRetryWrong} />
        <GameLeaderboard gameMode="shark" currentUserId={userId} />
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 space-y-4">
          <div className="text-6xl"></div>
          <h3 className="font-display text-xl font-extrabold text-primary">Thoát nạn!</h3>
          <p className="text-muted-foreground">Bạn trả lời đúng <span className="text-primary font-bold">{score}</span> từ và thoát khỏi cá mập!</p>
          <Button onClick={startGame}><RotateCcw className="h-4 w-4 mr-2" /> Chơi lại</Button>
        </div>
        <GameEndStats stats={selector.getAllStats()} onRetryWrong={onRetryWrong} />
        <GameLeaderboard gameMode="shark" currentUserId={userId} />
      </div>
    );
  }

  const card = currentCard;
  if (!card) {
    if (cards.length > 0 && !gameOver) {
      const fallback = selector.pickNext();
      if (fallback) {
        setTimeout(() => setCurrentCard(fallback), 0);
      }
    }
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-28" />
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="text-center space-y-3">
          <Skeleton className="h-6 w-16 mx-auto" />
          <Skeleton className="h-8 w-48 mx-auto rounded-lg" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <Skeleton className="h-10 flex-1 rounded-lg" />
        </div>
      </div>
    );
  }

  // Shark danger level for color
  const danger = sharkPos >= 75 ? "high" : sharkPos >= 50 ? "medium" : "low";

  return (
    <div className="space-y-4">
      {/* Score */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-primary">{score} đúng</span>
        <span className="text-muted-foreground">Thuộc: {selector.masteredCount()}/{cards.length}</span>
      </div>

      {/* Ocean scene */}
      <div className={cn(
        "relative rounded-2xl border-2 overflow-hidden h-24 transition-colors duration-500",
        danger === "high" ? "border-destructive bg-destructive/5" : danger === "medium" ? "border-amber-400 bg-amber-50" : "border-blue-300 bg-blue-50"
      )}>
        {/* Water waves background */}
        <div className="absolute inset-0 opacity-20"
          style={{
            background: "repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(59,130,246,0.3) 20px, rgba(59,130,246,0.3) 40px)",
            animation: "wave 3s linear infinite",
          }}
        />

        {/* Swimmer (you) on the right */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-3xl z-10" style={{ filter: sharkPos >= 80 ? "drop-shadow(0 0 8px red)" : "none" }}>
          
        </div>

        {/* Shark approaching from left */}
        <div
          className="absolute top-1/2 -translate-y-1/2 text-4xl transition-all duration-300 z-10"
          style={{
            left: `${Math.min(sharkPos * 0.75, 72)}%`,
            transform: `translateY(-50%) ${sharkPos >= 70 ? "scale(1.2)" : "scale(1)"}`,
          }}
        >
          
        </div>

        {/* Danger progress bar at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-blue-200/50">
          <div
            className={cn(
              "h-full transition-all duration-300",
              danger === "high" ? "bg-destructive" : danger === "medium" ? "bg-amber-400" : "bg-blue-400"
            )}
            style={{ width: `${sharkPos}%` }}
          />
        </div>
      </div>

      {/* Word prompt */}
      <div className={cn(
        "rounded-2xl border-2 p-6 text-center transition-all duration-300",
        feedback === "correct" && "border-primary bg-primary/5",
        feedback === "wrong" && "border-destructive bg-destructive/5",
        !feedback && "border-border"
      )}>
        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2">Gõ từ tiếng Anh</p>
        <p className="text-xl font-bold">{card.back}</p>
        {hintLevel > 0 && !feedback && (
          <p className="text-sm text-accent mt-2 font-mono tracking-wider"> {getHintText(card.front, hintLevel)}</p>
        )}
        {feedback === "correct" && (
          <p className="text-sm text-primary mt-2 font-bold"> {card.front} — Cá mập bị đẩy lùi!</p>
        )}
        {feedback === "wrong" && (
          <p className="text-sm text-destructive mt-2">Đáp án: <span className="font-bold">{card.front}</span></p>
        )}
      </div>

      {/* Input or Next button */}
      {paused ? (
        <div className="flex justify-center">
          <Button onClick={goToNext} className="min-w-[140px]">
            <ArrowRight className="h-4 w-4 mr-2" />
            Tiếp {reviewCountdown > 0 ? `(${reviewCountdown}s)` : ""}
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            onPaste={e => e.preventDefault()}
            onCopy={e => e.preventDefault()}
            onCut={e => e.preventDefault()}
            placeholder="Gõ từ tiếng Anh..."
            className="flex-1"
            disabled={!!feedback}
            autoComplete="off"
          />
          <Button onClick={handleHint} variant="ghost"size="icon"className="shrink-0"title="Gợi ý (+5)"disabled={!!feedback || hintLevel >= Math.ceil(card.front.length / 2)}>
            <Lightbulb className="h-4 w-4" />
          </Button>
          <Button onClick={handleSubmit} disabled={!input.trim() || !!feedback}>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {danger === "high" && (
        <p className="text-center text-xs text-destructive font-bold animate-pulse">
           Cá mập đang rất gần! Nhanh lên!
        </p>
      )}
    </div>
  );
}
