import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@shared/components/ui/tabs";
import { Avatar, AvatarFallback } from "@shared/components/ui/avatar";
import { cn } from "@shared/lib/utils";
import { Trophy, Flame, TrendingUp, Loader2 } from "lucide-react";

const MEDALS = ["","",""];

interface LeaderEntry {
  user_id: string;
  full_name: string;
  value: number;
  label: string;
}

interface Props {
  classId: string;
  className?: string;
}

export default function ClassLeaderboard({ classId, className }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState("minutes");
  const [minutesData, setMinutesData] = useState<LeaderEntry[]>([]);
  const [streakData, setStreakData] = useState<LeaderEntry[]>([]);
  const [progressData, setProgressData] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId) return;
    const fetch = async () => {
      setLoading(true);

      // Get class students with linked user ids
      const { data: enrollments } = await supabase
        .from("teachngo_class_students")
        .select("teachngo_student_id")
        .eq("class_id", classId);

      if (!enrollments?.length) { setLoading(false); return; }

      const tngIds = enrollments.map(e => e.teachngo_student_id);
      const { data: students } = await supabase
        .from("teachngo_students" as any)
        .select("teachngo_id, full_name, linked_user_id")
        .in("teachngo_id", tngIds) as any;

      const linked = (students || []).filter((s: any) => s.linked_user_id);
      if (!linked.length) { setLoading(false); return; }

      const userIds = linked.map((s: any) => s.linked_user_id);
      const nameMap: Record<string, string> = {};
      linked.forEach((s: any) => { nameMap[s.linked_user_id] = s.full_name; });

      // 1) Weekly minutes from activity_log
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const dateStr = sevenDaysAgo.toISOString().split("T")[0];

      const { data: actLogs } = await supabase
        .from("activity_log")
        .select("user_id, time_minutes, activity_date")
        .in("user_id", userIds)
        .gte("activity_date", dateStr);

      // Minutes aggregation
      const minutesMap: Record<string, number> = {};
      (actLogs || []).forEach((a: any) => {
        minutesMap[a.user_id] = (minutesMap[a.user_id] || 0) + (a.time_minutes || 0);
      });
      const minutesList: LeaderEntry[] = userIds
        .map((uid: string) => ({
          user_id: uid,
          full_name: nameMap[uid] || "?",
          value: minutesMap[uid] || 0,
          label: `${minutesMap[uid] || 0} phút`,
        }))
        .sort((a: LeaderEntry, b: LeaderEntry) => b.value - a.value)
        .slice(0, 10);
      setMinutesData(minutesList);

      // 2) Streak: consecutive days ending today or yesterday
      const datesMap: Record<string, Set<string>> = {};
      (actLogs || []).forEach((a: any) => {
        if (!datesMap[a.user_id]) datesMap[a.user_id] = new Set();
        datesMap[a.user_id].add(a.activity_date);
      });

      // Also fetch older activity for streak calculation (last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const { data: oldLogs } = await supabase
        .from("activity_log")
        .select("user_id, activity_date")
        .in("user_id", userIds)
        .gte("activity_date", ninetyDaysAgo.toISOString().split("T")[0])
        .lt("activity_date", dateStr);

      (oldLogs || []).forEach((a: any) => {
        if (!datesMap[a.user_id]) datesMap[a.user_id] = new Set();
        datesMap[a.user_id].add(a.activity_date);
      });

      const calcStreak = (dates: Set<string>): number => {
        if (!dates.size) return 0;
        const today = new Date();
        let d = new Date(today);
        // Check if today has activity, if not start from yesterday
        const todayStr = d.toISOString().split("T")[0];
        if (!dates.has(todayStr)) {
          d.setDate(d.getDate() - 1);
          if (!dates.has(d.toISOString().split("T")[0])) return 0;
        }
        let streak = 0;
        while (dates.has(d.toISOString().split("T")[0])) {
          streak++;
          d.setDate(d.getDate() - 1);
        }
        return streak;
      };

      const streakList: LeaderEntry[] = userIds
        .map((uid: string) => {
          const s = calcStreak(datesMap[uid] || new Set());
          return { user_id: uid, full_name: nameMap[uid] || "?", value: s, label: `${s} ngày` };
        })
        .sort((a: LeaderEntry, b: LeaderEntry) => b.value - a.value)
        .slice(0, 10);
      setStreakData(streakList);

      // 3) Progress: score improvement from 2 most recent test_results
      const { data: testResults } = await supabase
        .from("test_results" as any)
        .select("user_id, score, created_at")
        .in("user_id", userIds)
        .not("score", "is", null)
        .order("created_at", { ascending: false }) as any;

      const userTests: Record<string, number[]> = {};
      (testResults || []).forEach((r: any) => {
        if (!userTests[r.user_id]) userTests[r.user_id] = [];
        if (userTests[r.user_id].length < 2) userTests[r.user_id].push(Number(r.score));
      });

      const progressList: LeaderEntry[] = userIds
        .map((uid: string) => {
          const scores = userTests[uid] || [];
          const improvement = scores.length >= 2 ? scores[0] - scores[1] : 0;
          return {
            user_id: uid,
            full_name: nameMap[uid] || "?",
            value: improvement,
            label: improvement > 0 ? `+${improvement.toFixed(1)}` : improvement === 0 ? "0" : improvement.toFixed(1),
          };
        })
        .sort((a: LeaderEntry, b: LeaderEntry) => b.value - a.value)
        .slice(0, 10);
      setProgressData(progressList);

      setLoading(false);
    };
    fetch();
  }, [classId]);

  const renderList = (data: LeaderEntry[]) => {
    if (!data.length) {
      return <p className="text-xs text-muted-foreground text-center py-6">Chưa có dữ liệu</p>;
    }
    return (
      <div className="space-y-1.5">
        {data.map((entry, i) => {
          const isMe = entry.user_id === user?.id;
          const initials = entry.full_name.split(" ").map(w => w[0]).join("").slice(-2).toUpperCase();
          return (
            <div
              key={entry.user_id}
              className={cn(
                "flex items-center gap-3 h-12 rounded-xl px-3 transition-colors",
                isMe && "ring-2 ring-primary",
                i === 0 ? "bg-amber-50 dark:bg-amber-950/20" : i === 1 ? "bg-slate-50 dark:bg-slate-950/20" : i === 2 ? "bg-orange-50 dark:bg-orange-950/20" : "",
                !isMe && i > 2 && "hover:bg-muted/50"
              )}
            >
              <span className="w-8 text-center font-bold text-sm">
                {i < 3 ? MEDALS[i] : <span className="text-muted-foreground">{i + 1}</span>}
              </span>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-[10px] font-bold bg-muted">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className={cn("flex-1 text-sm truncate", isMe && "font-semibold")}>
                {entry.full_name}
              </span>
              <span className={cn(
                "text-sm font-bold tabular-nums",
                i === 0 ? "text-amber-600" : i === 1 ? "text-slate-500" : i === 2 ? "text-orange-700" : "text-muted-foreground"
              )}>
                {entry.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={cn("rounded-xl border bg-card p-4", className)}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border bg-card p-4", className)}>
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-4 w-4 text-amber-500" />
        <h3 className="font-display font-bold text-sm">Bảng xếp hạng tuần</h3>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full grid grid-cols-3 mb-3">
          <TabsTrigger value="minutes" className="text-xs gap-1">
            <Flame className="h-3 w-3" /> Chăm chỉ
          </TabsTrigger>
          <TabsTrigger value="streak" className="text-xs gap-1">
            <Flame className="h-3 w-3" /> Streak
          </TabsTrigger>
          <TabsTrigger value="progress" className="text-xs gap-1">
            <TrendingUp className="h-3 w-3" /> Tiến bộ
          </TabsTrigger>
        </TabsList>
        <TabsContent value="minutes">{renderList(minutesData)}</TabsContent>
        <TabsContent value="streak">{renderList(streakData)}</TabsContent>
        <TabsContent value="progress">{renderList(progressData)}</TabsContent>
      </Tabs>
    </div>
  );
}
