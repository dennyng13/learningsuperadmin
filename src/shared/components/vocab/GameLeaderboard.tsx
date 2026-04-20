import { useState, useEffect } from "react";
import { Trophy, Medal, Crown, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@shared/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@shared/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/components/ui/tooltip";

interface ScoreEntry {
  id: string;
  user_id: string;
  score: number;
  difficulty: string | null;
  created_at: string;
  player_name: string;
  avatar_url: string | null;
  badges: { name: string; icon: string | null; image_url: string | null; tier: string }[];
}

interface GameLeaderboardProps {
  gameMode: string;
  currentUserId?: string;
  className?: string;
}

const RANK_ICONS = [Crown, Medal, Medal];
const RANK_COLORS = ["text-yellow-500", "text-muted-foreground", "text-amber-700"];
const RANK_BG = [
  "bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200",
  "bg-gradient-to-r from-slate-50 to-gray-50 border border-slate-200",
  "bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200",
];

const TIER_RING = {
  gold: "ring-2 ring-yellow-400",
  silver: "ring-2 ring-slate-300",
  bronze: "ring-2 ring-amber-600",
  none: "",
};

export default function GameLeaderboard({ gameMode, currentUserId, className }: GameLeaderboardProps) {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScores = async () => {
    const { data, error } = await supabase
      .from("game_scores")
      .select("id, user_id, score, difficulty, created_at")
      .eq("game_mode", gameMode)
      .order("score", { ascending: false })
      .limit(50);

    if (error) { console.error(error); setLoading(false); return; }

    // Deduplicate: best score per user
    const bestByUser = new Map<string, typeof data[0]>();
    for (const row of data || []) {
      const existing = bestByUser.get(row.user_id);
      if (!existing || row.score > existing.score) {
        bestByUser.set(row.user_id, row);
      }
    }

    const userIds = [...bestByUser.keys()];

    // Fetch profiles via SECURITY DEFINER RPC (RLS on profiles hides other users)
    const { data: profiles } = await supabase
      .rpc("get_game_leaderboard_profiles", { user_ids: userIds });

    const profileMap = new Map<string, { name: string; avatar: string | null }>();
    for (const p of profiles || []) {
      profileMap.set(p.id, { name: p.full_name || "Ẩn danh", avatar: p.avatar_url });
    }

    // Fetch badges for top 3 users
    const sorted = [...bestByUser.values()].sort((a, b) => b.score - a.score).slice(0, 10);
    const top3Ids = sorted.slice(0, 3).map(s => s.user_id);

    let badgeMap = new Map<string, ScoreEntry["badges"]>();
    if (top3Ids.length > 0) {
      const { data: userBadges } = await supabase
        .from("user_badges")
        .select("user_id, badge_id")
        .in("user_id", top3Ids);

      if (userBadges && userBadges.length > 0) {
        const badgeIds = [...new Set(userBadges.map(ub => ub.badge_id))];
        const { data: badgeDetails } = await supabase
          .from("badges")
          .select("id, name, icon, image_url, tier")
          .in("id", badgeIds)
          .eq("status", "active");

        const badgeDetailMap = new Map<string, any>();
        for (const b of badgeDetails || []) badgeDetailMap.set(b.id, b);

        for (const ub of userBadges) {
          const detail = badgeDetailMap.get(ub.badge_id);
          if (!detail) continue;
          const existing = badgeMap.get(ub.user_id) || [];
          existing.push({ name: detail.name, icon: detail.icon, image_url: detail.image_url, tier: detail.tier });
          badgeMap.set(ub.user_id, existing);
        }
      }
    }

    const entries: ScoreEntry[] = sorted.map(row => {
      const profile = profileMap.get(row.user_id);
      return {
        ...row,
        player_name: profile?.name || "Ẩn danh",
        avatar_url: profile?.avatar || null,
        badges: badgeMap.get(row.user_id) || [],
      };
    });

    setScores(entries);
    setLoading(false);
  };

  useEffect(() => {
    fetchScores();
    // Refetch when a new score is saved in this tab
    const onScoreSaved = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.gameMode === gameMode) fetchScores();
    };
    // Refetch when tab regains focus (catches scores saved in other tabs)
    const onFocus = () => fetchScores();
    window.addEventListener("game-score-saved", onScoreSaved);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("game-score-saved", onScoreSaved);
      window.removeEventListener("focus", onFocus);
    };
  }, [gameMode]);

  if (loading) {
    return <div className={cn("text-center py-4 text-xs text-muted-foreground", className)}>Đang tải bảng xếp hạng...</div>;
  }

  if (scores.length === 0) {
    return (
      <div className={cn("text-center py-4", className)}>
        <Trophy className="h-6 w-6 mx-auto text-muted-foreground/30 mb-1" />
        <p className="text-xs text-muted-foreground">Chưa có kỷ lục nào. Hãy là người đầu tiên!</p>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1.5 mb-2">
        <Trophy className="h-4 w-4 text-accent" />
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Bảng xếp hạng</span>
      </div>

      {/* Top 3 podium */}
      {scores.length >= 3 && (
        <div className="flex items-end justify-center gap-3 py-4 mb-2">
          {[1, 0, 2].map(rank => {
            const entry = scores[rank];
            if (!entry) return null;
            const Icon = RANK_ICONS[rank];
            const isCenter = rank === 0;
            return (
              <div key={entry.id} className={cn("flex flex-col items-center gap-1", isCenter ? "mb-2" : "")}>
                <Icon className={cn("h-4 w-4", RANK_COLORS[rank])} />
                <div className="relative">
                  <Avatar className={cn(isCenter ? "h-14 w-14" : "h-10 w-10", "border-2 border-background shadow-md",
                    rank === 0 ? "ring-2 ring-yellow-400" : rank === 1 ? "ring-2 ring-slate-300" : "ring-2 ring-amber-600"
                  )}>
                    <AvatarImage src={entry.avatar_url || undefined} />
                    <AvatarFallback className={cn("text-xs font-bold", rank === 0 ? "bg-yellow-100 text-yellow-700" : rank === 1 ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-700")}>
                      {getInitials(entry.player_name)}
                    </AvatarFallback>
                  </Avatar>
                  {entry.user_id === currentUserId && (
                    <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[8px] font-bold px-1 rounded-full">Bạn</span>
                  )}
                </div>
                <p className="text-[10px] font-bold truncate max-w-[70px] text-center">{entry.player_name}</p>
                <p className={cn("text-xs font-extrabold", RANK_COLORS[rank])}>{entry.score}</p>
                {/* Badges for top 3 */}
                {entry.badges.length > 0 && (
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {entry.badges.slice(0, 3).map((badge, bi) => (
                      <Tooltip key={bi}>
                        <TooltipTrigger asChild>
                          <span className="cursor-default">
                            {badge.image_url ? (
                              <img src={badge.image_url} alt={badge.name} className={cn("h-4 w-4 rounded-full object-cover", TIER_RING[badge.tier as keyof typeof TIER_RING] || "")} />
                            ) : (
                              <Award className={cn("h-3.5 w-3.5",
                                badge.tier === "gold" ? "text-yellow-500" : badge.tier === "silver" ? "text-slate-400" : badge.tier === "bronze" ? "text-amber-700" : "text-primary"
                              )} />
                            )}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-[10px]">{badge.name}</TooltipContent>
                      </Tooltip>
                    ))}
                    {entry.badges.length > 3 && (
                      <span className="text-[9px] text-muted-foreground">+{entry.badges.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Full list */}
      {scores.map((entry, i) => {
        const isMe = entry.user_id === currentUserId;
        const Icon = RANK_ICONS[i] || null;
        const isTop3 = i < 3;
        return (
          <div
            key={entry.id}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
              isMe ? "bg-primary/10 border border-primary/20 font-bold" : isTop3 ? RANK_BG[i] : "bg-muted/40",
            )}
          >
            <span className={cn("w-5 text-center font-bold text-xs shrink-0", i < 3 ? RANK_COLORS[i] : "text-muted-foreground")}>
              {Icon ? <Icon className="h-3.5 w-3.5 inline" /> : `${i + 1}`}
            </span>
            {isTop3 && (
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarImage src={entry.avatar_url || undefined} />
                <AvatarFallback className="text-[8px] font-bold">{getInitials(entry.player_name)}</AvatarFallback>
              </Avatar>
            )}
            <span className="flex-1 truncate text-xs">
              {entry.player_name}
              {isMe && <span className="text-primary ml-1">(bạn)</span>}
            </span>
            {isTop3 && entry.badges.length > 0 && (
              <div className="flex items-center gap-0.5 shrink-0">
                {entry.badges.slice(0, 2).map((badge, bi) => (
                  <Tooltip key={bi}>
                    <TooltipTrigger asChild>
                      <span className="cursor-default">
                        {badge.image_url ? (
                          <img src={badge.image_url} alt={badge.name} className="h-3.5 w-3.5 rounded-full object-cover" />
                        ) : (
                          <Award className={cn("h-3 w-3",
                            badge.tier === "gold" ? "text-yellow-500" : badge.tier === "silver" ? "text-slate-400" : badge.tier === "bronze" ? "text-amber-700" : "text-primary"
                          )} />
                        )}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-[10px]">{badge.name}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            )}
            {entry.difficulty && (
              <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5 shrink-0">
                {entry.difficulty === "easy" ? "Dễ" : entry.difficulty === "medium" ? "TB" : "Khó"}
              </span>
            )}
            <span className="font-bold text-xs text-primary shrink-0">{entry.score}</span>
          </div>
        );
      })}
    </div>
  );
}
