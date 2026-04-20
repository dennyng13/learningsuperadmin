import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BadgeRow {
  id: string;
  name: string;
  icon: string | null;
  image_url: string | null;
  tier: string;
  criteria_type: string;
  criteria_config: any;
}

/**
 * Hook to automatically check & award badges after user actions.
 * Call `checkBadges(userId)` after game over, test completion, etc.
 */
/** Standalone function callable without hook context */
export async function checkBadgesForUser(userId: string) {
  if (!userId) return;
  return _checkBadgesImpl(userId);
}

export function useAutoBadges() {
  const checkBadges = useCallback(async (userId: string) => {
    return _checkBadgesImpl(userId);
  }, []);

  return { checkBadges };
}

async function _checkBadgesImpl(userId: string) {
  if (!userId) return;

    // 1. Fetch all active auto-criteria badges
    const { data: badges, error: bErr } = await supabase
      .from("badges")
      .select("id, name, icon, image_url, tier, criteria_type, criteria_config")
      .eq("status", "active")
      .neq("criteria_type", "manual");

    if (bErr || !badges || badges.length === 0) return;

    // 2. Fetch user's existing badges to skip already-awarded
    const { data: existing } = await supabase
      .from("user_badges")
      .select("badge_id")
      .eq("user_id", userId);

    const earnedSet = new Set((existing || []).map(e => e.badge_id));
    const unearnedBadges = (badges as BadgeRow[]).filter(b => !earnedSet.has(b.id));
    if (unearnedBadges.length === 0) return;

    // 3. Group by criteria type to batch queries
    const byType = new Map<string, BadgeRow[]>();
    for (const b of unearnedBadges) {
      const list = byType.get(b.criteria_type) || [];
      list.push(b);
      byType.set(b.criteria_type, list);
    }

    const newlyEarned: BadgeRow[] = [];

    // ── game_score: check best score per game mode ──
    if (byType.has("game_score")) {
      const gameBadges = byType.get("game_score")!;
      const modes = [...new Set(gameBadges.map(b => b.criteria_config?.game_mode).filter(Boolean))];

      if (modes.length > 0) {
        const { data: scores } = await supabase
          .from("game_scores")
          .select("game_mode, score")
          .eq("user_id", userId)
          .in("game_mode", modes)
          .order("score", { ascending: false });

        // Best score per mode
        const bestByMode = new Map<string, number>();
        for (const s of scores || []) {
          if (!bestByMode.has(s.game_mode) || s.score > bestByMode.get(s.game_mode)!) {
            bestByMode.set(s.game_mode, s.score);
          }
        }

        for (const badge of gameBadges) {
          const { game_mode, min_score } = badge.criteria_config || {};
          if (game_mode && min_score) {
            const best = bestByMode.get(game_mode) || 0;
            if (best >= min_score) newlyEarned.push(badge);
          }
        }
      }
    }

    // ── test_count: number of completed tests ──
    if (byType.has("test_count")) {
      const { count } = await supabase
        .from("test_results")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      for (const badge of byType.get("test_count")!) {
        const min = badge.criteria_config?.min_tests || 0;
        if ((count || 0) >= min) newlyEarned.push(badge);
      }
    }

    // ── flashcard_mastery: number of mastered flashcards ──
    if (byType.has("flashcard_mastery")) {
      const { count } = await supabase
        .from("flashcards")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("mastered", true);

      for (const badge of byType.get("flashcard_mastery")!) {
        const min = badge.criteria_config?.min_mastered || 0;
        if ((count || 0) >= min) newlyEarned.push(badge);
      }
    }

    // ── activity_streak: consecutive activity days ──
    if (byType.has("activity_streak")) {
      const { data: activities } = await supabase
        .from("activity_log")
        .select("activity_date")
        .eq("user_id", userId)
        .order("activity_date", { ascending: false })
        .limit(365);

      let streak = 0;
      if (activities && activities.length > 0) {
        const dates = activities.map(a => a.activity_date);
        const uniqueDates = [...new Set(dates)].sort().reverse();
        streak = 1;
        for (let i = 1; i < uniqueDates.length; i++) {
          const prev = new Date(uniqueDates[i - 1]);
          const curr = new Date(uniqueDates[i]);
          const diffDays = Math.round((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) streak++;
          else break;
        }
      }

      for (const badge of byType.get("activity_streak")!) {
        const min = badge.criteria_config?.min_streak || 0;
        if (streak >= min) newlyEarned.push(badge);
      }
    }

    // 4. Award newly earned badges
    if (newlyEarned.length === 0) return;

    const inserts = newlyEarned.map(b => ({ user_id: userId, badge_id: b.id }));
    const { error: insertErr } = await supabase.from("user_badges").insert(inserts);

    if (insertErr) {
      // Might be duplicate constraint — ignore
      console.warn("Badge insert error (may be duplicate):", insertErr);
      return;
    }

    // 5. Show toast for each new badge
    for (const badge of newlyEarned) {
      const tierLabel = badge.tier ==="gold"?"": badge.tier ==="silver"?"": badge.tier ==="bronze"?"":"";
      toast.success(`${tierLabel}Huy hiệu mới: ${badge.name}!`, {
        description: "Chúc mừng bạn đã đạt thành tích mới!",
        duration: 5000,
      });
    }
}
