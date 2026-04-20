import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Trophy, Flame, Target, Zap, Crown, Medal, Award, Gamepad2,
  TrendingUp, Clock, Loader2, ChevronDown, Share2, Camera, Facebook, MessageCircle, Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import { cn } from "@shared/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@shared/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@shared/components/ui/tooltip";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
// html2canvas is dynamically imported in captureScreenshot to keep it out of the initial bundle.

const GAME_LABELS: Record<string, { label: string; icon: any }> = {
  matching: { label: "Ghép đôi", icon: Target },
  typing: { label: "Gõ từ", icon: Zap },
  shooting: { label: "Bắn chữ", icon: Flame },
  challenge: { label: "Thử thách", icon: Crown },
  shark: { label: "Cá mập", icon: Gamepad2 },
};

const RANK_COLORS = ["text-yellow-500", "text-muted-foreground", "text-amber-700"];
const RANK_BG = [
  "bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 border border-yellow-200 dark:border-yellow-800",
  "bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/30 dark:to-gray-900/30 border border-slate-200 dark:border-slate-700",
  "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800",
];
const RANK_ICONS = [Crown, Medal, Medal];

interface PersonalStats {
  totalGames: number;
  totalScore: number;
  bestScore: number;
  bestMode: string | null;
  modeStats: { mode: string; plays: number; best: number; avg: number }[];
  recentGames: { mode: string; score: number; difficulty: string | null; created_at: string }[];
}

interface LeaderEntry {
  user_id: string;
  total_score: number;
  total_games: number;
  best_score: number;
  player_name: string;
  avatar_url: string | null;
}

export default function GameAchievements() {
  const { user } = useAuth();
  const [myStats, setMyStats] = useState<PersonalStats | null>(null);
  const [myProfile, setMyProfile] = useState<{ name: string; avatar: string | null } | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"stats" | "leaderboard">("leaderboard");
  const [selectedMode, setSelectedMode] = useState<string>("all");

  const fetchData = async () => {
    if (!user) return;

    // Fetch all scores
    const { data: allScores } = await supabase
      .from("game_scores")
      .select("user_id, score, game_mode, difficulty, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (!allScores) { setLoading(false); return; }

    // Personal stats
    const myScores = allScores.filter(s => s.user_id === user.id);
    const modeMap = new Map<string, { plays: number; best: number; total: number }>();
    for (const s of myScores) {
      const existing = modeMap.get(s.game_mode) || { plays: 0, best: 0, total: 0 };
      existing.plays++;
      existing.best = Math.max(existing.best, s.score);
      existing.total += s.score;
      modeMap.set(s.game_mode, existing);
    }

    const modeStats = [...modeMap.entries()].map(([mode, data]) => ({
      mode,
      plays: data.plays,
      best: data.best,
      avg: Math.round(data.total / data.plays),
    })).sort((a, b) => b.best - a.best);

    const bestEntry = modeStats.length > 0 ? modeStats[0] : null;

    setMyStats({
      totalGames: myScores.length,
      totalScore: myScores.reduce((sum, s) => sum + s.score, 0),
      bestScore: bestEntry?.best || 0,
      bestMode: bestEntry?.mode || null,
      modeStats,
      recentGames: myScores.slice(0, 10).map(s => ({
        mode: s.game_mode,
        score: s.score,
        difficulty: s.difficulty,
        created_at: s.created_at,
      })),
    });

    // Global leaderboard — aggregate best scores per user per mode, then sum
    const userScores = new Map<string, { total: number; games: number; best: number }>();
    const bestPerUserMode = new Map<string, number>();

    for (const s of allScores) {
      const key = `${s.user_id}__${s.game_mode}`;
      const currentBest = bestPerUserMode.get(key) || 0;
      if (s.score > currentBest) bestPerUserMode.set(key, s.score);

      const userData = userScores.get(s.user_id) || { total: 0, games: 0, best: 0 };
      userData.games++;
      userData.best = Math.max(userData.best, s.score);
      userScores.set(s.user_id, userData);
    }

    // Sum best scores across modes for each user
    for (const [key, bestScore] of bestPerUserMode) {
      const userId = key.split("__")[0];
      const userData = userScores.get(userId)!;
      userData.total += bestScore;
    }

    const userIds = [...userScores.keys()];
    const { data: profiles } = await supabase
      .rpc("get_game_leaderboard_profiles", { user_ids: userIds });

    const profileMap = new Map<string, { name: string; avatar: string | null }>();
    for (const p of profiles || []) {
      profileMap.set(p.id, { name: p.full_name || "Ẩn danh", avatar: p.avatar_url });
    }

    const lb: LeaderEntry[] = [...userScores.entries()]
      .map(([uid, data]) => ({
        user_id: uid,
        total_score: data.total,
        total_games: data.games,
        best_score: data.best,
        player_name: profileMap.get(uid)?.name || "Ẩn danh",
        avatar_url: profileMap.get(uid)?.avatar || null,
      }))
      .sort((a, b) => b.total_score - a.total_score)
      .slice(0, 20);

    setLeaderboard(lb);
    setMyProfile(profileMap.get(user.id) || { name: user.email?.split("@")[0] || "Bạn", avatar: null });
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // Refetch when a new score is saved or tab regains focus (replaces realtime)
    const onScoreSaved = () => fetchData();
    const onFocus = () => fetchData();
    window.addEventListener("game-score-saved", onScoreSaved);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("game-score-saved", onScoreSaved);
      window.removeEventListener("focus", onFocus);
    };
  }, [user]);

  const getInitials = (name: string) =>
    name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const myRank = useMemo(() => {
    if (!user) return null;
    const idx = leaderboard.findIndex(l => l.user_id === user.id);
    return idx >= 0 ? idx + 1 : null;
  }, [leaderboard, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab toggle */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl">
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold transition-all",
            activeTab === "leaderboard" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Trophy className="h-4 w-4" />
          Bảng xếp hạng
        </button>
        <button
          onClick={() => setActiveTab("stats")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold transition-all",
            activeTab === "stats" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <TrendingUp className="h-4 w-4" />
          Thành tích cá nhân
        </button>
      </div>

      {activeTab === "stats" && myStats && <PersonalStatsView stats={myStats} profile={myProfile} />}
      {activeTab === "leaderboard" && (
        <GlobalLeaderboard
          entries={leaderboard}
          currentUserId={user?.id}
          myRank={myRank}
          getInitials={getInitials}
        />
      )}
    </div>
  );
}

/* ── Personal Stats ── */
function PersonalStatsView({ stats, profile }: { stats: PersonalStats; profile: { name: string; avatar: string | null } | null }) {
  const [showRecent, setShowRecent] = useState(false);
  const [sharing, setSharing] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  const captureScreenshot = useCallback(async () => {
    if (!statsRef.current) return null;
    setSharing(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(statsRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      return canvas;
    } catch {
      toast.error("Không thể chụp ảnh thành tích");
      return null;
    } finally {
      setSharing(false);
    }
  }, []);

  const handleDownloadScreenshot = useCallback(async () => {
    const canvas = await captureScreenshot();
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `thanh-tich-game-${format(new Date(), "dd-MM-yyyy")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Đã tải ảnh thành tích");
  }, [captureScreenshot]);

  const handleShareFacebook = useCallback(() => {
    const text =` Thành tích Vocabulary Game!\n ${stats.totalGames} lượt chơi | Điểm cao: ${stats.bestScore} | TB: ${Math.round(stats.totalScore / stats.totalGames)}`;
    const url = window.location.href;
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
      "_blank",
      "width=600,height=400"
    );
  }, [stats]);

  const handleShareZalo = useCallback(() => {
    const text =` Thành tích Vocabulary Game!\n ${stats.totalGames} lượt chơi | Điểm cao: ${stats.bestScore} | TB: ${Math.round(stats.totalScore / stats.totalGames)}`;
    const url = window.location.href;
    window.open(
      `https://zalo.me/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
      "_blank",
      "width=600,height=400"
    );
  }, [stats]);

  const handleNativeShare = useCallback(async () => {
    const canvas = await captureScreenshot();
    const text =` Thành tích Vocabulary Game!\n ${stats.totalGames} lượt chơi | Điểm cao: ${stats.bestScore} | TB: ${Math.round(stats.totalScore / stats.totalGames)}`;

    if (navigator.share && canvas) {
      try {
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], "thanh-tich.png", { type: "image/png" });
          await navigator.share({ text, files: [file] });
        });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Đã sao chép thành tích vào clipboard");
    }
  }, [stats, captureScreenshot]);

  if (stats.totalGames === 0) {
    return (
      <div className="text-center py-12">
        <Gamepad2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
        <p className="font-bold text-muted-foreground">Chưa có thành tích nào</p>
        <p className="text-xs text-muted-foreground mt-1">Chơi game để xem thống kê tại đây</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Share buttons */}
      <div className="flex items-center gap-1.5 justify-end">
        <span className="text-[10px] text-muted-foreground font-medium mr-1">Chia sẻ</span>
        <button
          onClick={handleDownloadScreenshot}
          disabled={sharing}
          className="h-8 w-8 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors"
          title="Tải ảnh"
        >
          <Download className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button
          onClick={handleShareFacebook}
          className="h-8 w-8 rounded-lg bg-[hsl(220,46%,48%)]/10 hover:bg-[hsl(220,46%,48%)]/20 flex items-center justify-center transition-colors"
          title="Facebook"
        >
          <Facebook className="h-3.5 w-3.5 text-[hsl(220,46%,48%)]" />
        </button>
        <button
          onClick={handleShareZalo}
          className="h-8 w-8 rounded-lg bg-[hsl(210,80%,50%)]/10 hover:bg-[hsl(210,80%,50%)]/20 flex items-center justify-center transition-colors"
          title="Zalo"
        >
          <MessageCircle className="h-3.5 w-3.5 text-[hsl(210,80%,50%)]" />
        </button>
        {typeof navigator !== "undefined" && navigator.share && (
          <button
            onClick={handleNativeShare}
            disabled={sharing}
            className="h-8 w-8 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
            title="Chia sẻ khác"
          >
            <Share2 className="h-3.5 w-3.5 text-primary" />
          </button>
        )}
      </div>

      <div ref={statsRef} className="space-y-4 bg-background p-3 rounded-xl">
      {/* Profile header */}
      {profile && (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-primary/20 shadow-sm">
            <AvatarImage src={profile.avatar || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
              {profile.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-bold">{profile.name}</p>
            <p className="text-[10px] text-muted-foreground">Thành tích cá nhân</p>
          </div>
        </div>
      )}
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-card border rounded-xl p-3 text-center">
          <Gamepad2 className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-lg font-extrabold">{stats.totalGames}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Lượt chơi</p>
        </div>
        <div className="bg-card border rounded-xl p-3 text-center">
          <Trophy className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
          <p className="text-lg font-extrabold">{stats.bestScore}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Điểm cao nhất</p>
        </div>
        <div className="bg-card border rounded-xl p-3 text-center">
          <TrendingUp className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
          <p className="text-lg font-extrabold">{Math.round(stats.totalScore / stats.totalGames)}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Điểm TB</p>
        </div>
      </div>

      {/* Per-mode breakdown */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5" /> Theo chế độ chơi
        </h3>
        {stats.modeStats.map(ms => {
          const config = GAME_LABELS[ms.mode];
          const Icon = config?.icon || Gamepad2;
          return (
            <div key={ms.mode} className="flex items-center gap-3 bg-card border rounded-xl px-3 py-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">{config?.label || ms.mode}</p>
                <p className="text-[10px] text-muted-foreground">{ms.plays} lượt chơi</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-extrabold text-primary">{ms.best}</p>
                <p className="text-[10px] text-muted-foreground">Trung bình: {ms.avg}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent games */}
      {stats.recentGames.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowRecent(!showRecent)}
            className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
          >
            <Clock className="h-3.5 w-3.5" />
            Lịch sử gần đây
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showRecent && "rotate-180")} />
          </button>
          {showRecent && (
            <div className="space-y-1">
              {stats.recentGames.map((g, i) => {
                const config = GAME_LABELS[g.mode];
                const Icon = config?.icon || Gamepad2;
                return (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg text-sm">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs font-medium flex-1">{config?.label || g.mode}</span>
                    {g.difficulty && (
                      <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                        {g.difficulty === "easy" ? "Dễ" : g.difficulty === "medium" ? "TB" : "Khó"}
                      </span>
                    )}
                    <span className="text-xs font-bold text-primary">{g.score}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(g.created_at), "dd/MM", { locale: vi })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

/* ── Global Leaderboard ── */
function GlobalLeaderboard({
  entries,
  currentUserId,
  myRank,
  getInitials,
}: {
  entries: LeaderEntry[];
  currentUserId?: string;
  myRank: number | null;
  getInitials: (name: string) => string;
}) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
        <p className="font-bold text-muted-foreground">Chưa có dữ liệu xếp hạng</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* My rank banner */}
      {myRank !== null && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Trophy className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold">Xếp hạng của bạn</p>
            <p className="text-2xl font-extrabold text-primary">#{myRank}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-muted-foreground">Tổng điểm</p>
            <p className="text-lg font-extrabold">{entries.find(e => e.user_id === currentUserId)?.total_score || 0}</p>
          </div>
        </div>
      )}

      {/* Top 3 podium */}
      {entries.length >= 3 && (
        <div className="flex items-end justify-center gap-3 py-4">
          {[1, 0, 2].map(rank => {
            const entry = entries[rank];
            if (!entry) return null;
            const Icon = RANK_ICONS[rank];
            const isCenter = rank === 0;
            const isMe = entry.user_id === currentUserId;
            return (
              <div key={entry.user_id} className={cn("flex flex-col items-center gap-1", isCenter ? "mb-2" : "")}>
                <Icon className={cn("h-4 w-4", RANK_COLORS[rank])} />
                <div className="relative">
                  <Avatar className={cn(isCenter ? "h-14 w-14" : "h-10 w-10", "border-2 border-background shadow-md",
                    rank === 0 ? "ring-2 ring-yellow-400" : rank === 1 ? "ring-2 ring-slate-300" : "ring-2 ring-amber-600"
                  )}>
                    <AvatarImage src={entry.avatar_url || undefined} />
                    <AvatarFallback className={cn("text-xs font-bold",
                      rank === 0 ? "bg-yellow-100 text-yellow-700" : rank === 1 ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-700"
                    )}>
                      {getInitials(entry.player_name)}
                    </AvatarFallback>
                  </Avatar>
                  {isMe && (
                    <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[8px] font-bold px-1 rounded-full">Bạn</span>
                  )}
                </div>
                <p className="text-[10px] font-bold truncate max-w-[70px] text-center">{entry.player_name}</p>
                <p className={cn("text-xs font-extrabold", RANK_COLORS[rank])}>{entry.total_score}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Full list */}
      <div className="space-y-1">
        <p className="text-[10px] text-muted-foreground text-center mb-2">
          Tổng điểm = tổng điểm cao nhất mỗi chế độ chơi
        </p>
        {entries.map((entry, i) => {
          const isMe = entry.user_id === currentUserId;
          const Icon = RANK_ICONS[i] || null;
          const isTop3 = i < 3;
          return (
            <div
              key={entry.user_id}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                isMe ? "bg-primary/10 border border-primary/20 font-bold" : isTop3 ? RANK_BG[i] : "bg-muted/40",
              )}
            >
              <span className={cn("w-5 text-center font-bold text-xs shrink-0", i < 3 ? RANK_COLORS[i] : "text-muted-foreground")}>
                {Icon ? <Icon className="h-3.5 w-3.5 inline" /> : `${i + 1}`}
              </span>
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarImage src={entry.avatar_url || undefined} />
                <AvatarFallback className="text-[8px] font-bold">{getInitials(entry.player_name)}</AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate text-xs">
                {entry.player_name}
                {isMe && <span className="text-primary ml-1">(bạn)</span>}
              </span>
              <span className="text-[10px] text-muted-foreground shrink-0">{entry.total_games} lượt</span>
              <span className="font-bold text-xs text-primary shrink-0">{entry.total_score}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
