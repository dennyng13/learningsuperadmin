/**
 * Dashboard widget "Trạng thái 2 app" — tổng quan IELTS Practice & Teacher's Hub.
 * Tất cả query cùng 1 Supabase DB nên không cần gọi sang app khác.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { GraduationCap, BookOpenCheck, ExternalLink, Users, School, Activity, CalendarClock, FileText, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { cn } from "@shared/lib/utils";

const IELTS_URL = "https://ielts.learningplus.vn";
const TEACHER_URL = "https://teacher.learningplus.vn";

interface AppMetric {
  icon: typeof Users;
  label: string;
  value: number | string;
  hint?: string;
  live?: boolean;
}

function useAppsStatus() {
  return useQuery({
    queryKey: ["dashboard-apps-status"],
    staleTime: 60_000,
    queryFn: async () => {
      const now = new Date();
      const since24h = subDays(now, 1).toISOString();
      const since7d = subDays(now, 7).toISOString();
      const todayStr = format(now, "yyyy-MM-dd");
      const since7dDate = format(subDays(now, 6), "yyyy-MM-dd");

      const [
        { count: activeStudents },
        { count: testsRun24h },
        { count: practicesRun24h },
        { count: testsRun7d },
        { data: testRows7d },
        { data: practiceRows7d },
        { count: activeTeachers },
        { count: activeClasses },
        { data: todayEntries },
        { data: entries7d },
      ] = await Promise.all([
        supabase.from("teachngo_students")
          .select("*", { count: "exact", head: true })
          .not("linked_user_id", "is", null),
        supabase.from("test_results")
          .select("*", { count: "exact", head: true })
          .gte("created_at", since24h),
        supabase.from("practice_results")
          .select("*", { count: "exact", head: true })
          .gte("created_at", since24h),
        supabase.from("test_results")
          .select("*", { count: "exact", head: true })
          .gte("created_at", since7d),
        supabase.from("test_results")
          .select("created_at")
          .gte("created_at", since7d),
        supabase.from("practice_results")
          .select("created_at")
          .gte("created_at", since7d),
        supabase.from("teachers")
          .select("*", { count: "exact", head: true }),
        supabase.from("teachngo_classes")
          .select("*", { count: "exact", head: true })
          .eq("status", "active"),
        supabase.from("study_plan_entries")
          .select("id")
          .eq("entry_date", todayStr),
        supabase.from("study_plan_entries")
          .select("entry_date")
          .gte("entry_date", since7dDate),
      ]);

      // Build 7-day buckets (oldest → newest)
      const days: string[] = Array.from({ length: 7 }, (_, i) =>
        format(subDays(now, 6 - i), "yyyy-MM-dd")
      );
      const bucket = (
        rows: Array<{ created_at?: string; entry_date?: string }> | null,
        key: "created_at" | "entry_date",
      ) => {
        const map: Record<string, number> = Object.fromEntries(days.map((d) => [d, 0]));
        (rows || []).forEach((r) => {
          const raw = (r as any)[key];
          if (!raw) return;
          const d = key === "created_at" ? format(new Date(raw), "yyyy-MM-dd") : String(raw).slice(0, 10);
          if (d in map) map[d] += 1;
        });
        return days.map((d) => map[d]);
      };

      const tSeries = bucket(testRows7d as any, "created_at");
      const pSeries = bucket(practiceRows7d as any, "created_at");
      const ieltsSeries = tSeries.map((v, i) => v + pSeries[i]);
      const teacherSeries = bucket(entries7d as any, "entry_date");

      return {
        ielts: {
          activeStudents: activeStudents ?? 0,
          testsRun24h: testsRun24h ?? 0,
          practicesRun24h: practicesRun24h ?? 0,
          testsRun7d: testsRun7d ?? 0,
          series7d: ieltsSeries,
        },
        teacher: {
          activeTeachers: activeTeachers ?? 0,
          activeClasses: activeClasses ?? 0,
          todaySessions: (todayEntries || []).length,
          series7d: teacherSeries,
        },
        days,
      };
    },
  });
}

export default function AppsStatusWidget() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useAppsStatus();

  // Live deltas — tăng ngay khi có INSERT từ Realtime, reset về 0 khi React Query refetch
  const [runningDelta, setRunningDelta] = useState(0);
  const [classesDelta, setClassesDelta] = useState(0);
  const [sessionsDelta, setSessionsDelta] = useState(0);
  const [pulseRunning, setPulseRunning] = useState(false);
  const [pulseClasses, setPulseClasses] = useState(false);
  const [pulseSessions, setPulseSessions] = useState(false);
  const [connected, setConnected] = useState(false);
  const refetchTimer = useRef<number | null>(null);

  useEffect(() => {
    setRunningDelta(0);
    setClassesDelta(0);
    setSessionsDelta(0);
  }, [data]);

  useEffect(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");

    const scheduleRefetch = () => {
      if (refetchTimer.current) window.clearTimeout(refetchTimer.current);
      // debounce: gom nhiều INSERT liên tiếp trong 5s → 1 lần refetch count chính xác
      refetchTimer.current = window.setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["dashboard-apps-status"] });
      }, 5000);
    };

    const makeBump = (
      setDelta: React.Dispatch<React.SetStateAction<number>>,
      setPulse: React.Dispatch<React.SetStateAction<boolean>>,
      guard?: (row: any) => boolean,
    ) => (payload: any) => {
      if (guard && !guard(payload?.new)) return;
      setDelta((n) => n + 1);
      setPulse(true);
      window.setTimeout(() => setPulse(false), 800);
      scheduleRefetch();
    };

    const bumpRunning = makeBump(setRunningDelta, setPulseRunning);
    const bumpClasses = makeBump(setClassesDelta, setPulseClasses, (row) => row?.status === "active");
    const bumpSessions = makeBump(setSessionsDelta, setPulseSessions, (row) => row?.entry_date === todayStr);

    const channel = supabase
      .channel("dashboard-apps-status-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "test_results" }, bumpRunning)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "practice_results" }, bumpRunning)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "teachngo_classes" }, bumpClasses)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "study_plan_entries" }, bumpSessions)
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      if (refetchTimer.current) window.clearTimeout(refetchTimer.current);
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const ielts = data?.ielts;
  const teacher = data?.teacher;

  const liveRunning = (ielts?.testsRun24h ?? 0) + (ielts?.practicesRun24h ?? 0) + runningDelta;
  const liveClasses = (teacher?.activeClasses ?? 0) + classesDelta;
  const liveSessions = (teacher?.todaySessions ?? 0) + sessionsDelta;

  const ieltsMetrics: AppMetric[] = [
    { icon: Users, label: "Học viên kết nối", value: ielts?.activeStudents ?? 0 },
    { icon: Activity, label: "Đang làm bài (24h)", value: liveRunning, hint: "test + practice", live: pulseRunning },
    { icon: FileText, label: "Bài thi 7 ngày", value: ielts?.testsRun7d ?? 0 },
  ];

  const teacherMetrics: AppMetric[] = [
    { icon: GraduationCap, label: "Giáo viên", value: teacher?.activeTeachers ?? 0 },
    { icon: School, label: "Lớp đang hoạt động", value: liveClasses, live: pulseClasses },
    { icon: CalendarClock, label: "Buổi học hôm nay", value: liveSessions, live: pulseSessions },
  ];

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Activity className="h-3.5 w-3.5" />
          Trạng thái 2 app
        </h2>
        <span className={cn(
          "text-[11px] flex items-center gap-1.5 transition-colors",
          connected ? "text-emerald-600" : "text-muted-foreground",
        )}>
          <span className="relative flex h-2 w-2">
            {connected && <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping" />}
            <span className={cn("relative inline-flex rounded-full h-2 w-2", connected ? "bg-emerald-500" : "bg-muted-foreground/40")} />
          </span>
          {connected ? "Realtime · live" : "Đang kết nối…"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AppCard
          title="IELTS Practice"
          subtitle="Ứng dụng học viên"
          icon={BookOpenCheck}
          accent="text-blue-600"
          bg="bg-blue-500/10"
          stroke="hsl(217 91% 60%)"
          href={IELTS_URL}
          onManage={() => navigate("/users")}
          manageLabel="Quản lý học viên"
          metrics={ieltsMetrics}
          series={ielts?.series7d}
          seriesLabel="Bài làm / ngày"
          days={data?.days}
          loading={isLoading}
        />
        <AppCard
          title="Teacher's Hub"
          subtitle="Ứng dụng giáo viên"
          icon={GraduationCap}
          accent="text-emerald-600"
          bg="bg-emerald-500/10"
          stroke="hsl(160 84% 39%)"
          href={TEACHER_URL}
          onManage={() => navigate("/classes")}
          manageLabel="Quản lý lớp"
          metrics={teacherMetrics}
          series={teacher?.series7d}
          seriesLabel="Buổi học / ngày"
          days={data?.days}
          loading={isLoading}
        />
      </div>
    </div>
  );
}

function AppCard({
  title, subtitle, icon: Icon, accent, bg, href, onManage, manageLabel, metrics, loading,
}: {
  title: string;
  subtitle: string;
  icon: typeof Users;
  accent: string;
  bg: string;
  href: string;
  onManage: () => void;
  manageLabel: string;
  metrics: AppMetric[];
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border bg-background/50 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", bg)}>
            <Icon className={cn("h-5 w-5", accent)} />
          </div>
          <div className="min-w-0">
            <h3 className="font-display font-bold text-sm truncate">{title}</h3>
            <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
          </div>
        </div>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
          title={`Mở ${title}`}
        >
          Mở app <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {metrics.map((m, i) => (
          <div
            key={i}
            className={cn(
              "rounded-md bg-muted/40 p-2.5 flex flex-col gap-0.5 transition-colors",
              m.live && "bg-emerald-500/15 ring-1 ring-emerald-500/30",
            )}
          >
            <m.icon className={cn("h-3.5 w-3.5 mb-0.5", m.live ? "text-emerald-600" : "text-muted-foreground")} />
            <span className={cn("text-lg font-bold font-display leading-none transition-colors", m.live && "text-emerald-600")}>
              {loading ? <span className="inline-block h-5 w-8 bg-muted rounded animate-pulse" /> : m.value}
            </span>
            <span className="text-[10px] text-muted-foreground leading-tight">{m.label}</span>
            {m.hint && <span className="text-[9px] text-muted-foreground/70">{m.hint}</span>}
          </div>
        ))}
      </div>

      <button
        onClick={onManage}
        className="text-xs text-primary hover:underline text-left mt-auto"
      >
        → {manageLabel}
      </button>
    </div>
  );
}
