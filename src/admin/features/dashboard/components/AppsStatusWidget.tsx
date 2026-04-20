/**
 * Dashboard widget "Trạng thái 2 app" — tổng quan IELTS Practice & Teacher's Hub.
 * Tất cả query cùng 1 Supabase DB nên không cần gọi sang app khác.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { GraduationCap, BookOpenCheck, ExternalLink, Users, School, Activity, CalendarClock, FileText, Radio, TrendingUp, TrendingDown, Minus } from "lucide-react";
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
      const prev14d = subDays(now, 14).toISOString();
      const todayStr = format(now, "yyyy-MM-dd");
      const since7dDate = format(subDays(now, 6), "yyyy-MM-dd");
      const prev14dDate = format(subDays(now, 13), "yyyy-MM-dd");
      const prev7dEndDate = format(subDays(now, 7), "yyyy-MM-dd");

      const [
        { count: activeStudents },
        { count: testsRun24h },
        { count: practicesRun24h },
        { count: testsRun7d },
        { data: testRows7d },
        { data: practiceRows7d },
        { count: testsPrev7d },
        { count: practicesPrev7d },
        { count: activeTeachers },
        { count: activeClasses },
        { data: todayEntries },
        { data: entries7d },
        { count: entriesPrev7d },
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
        // Prior 7-day window: [now-14d, now-7d)
        supabase.from("test_results")
          .select("*", { count: "exact", head: true })
          .gte("created_at", prev14d)
          .lt("created_at", since7d),
        supabase.from("practice_results")
          .select("*", { count: "exact", head: true })
          .gte("created_at", prev14d)
          .lt("created_at", since7d),
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
        supabase.from("study_plan_entries")
          .select("*", { count: "exact", head: true })
          .gte("entry_date", prev14dDate)
          .lt("entry_date", prev7dEndDate),
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

      const ieltsTotal7d = ieltsSeries.reduce((a, b) => a + b, 0);
      const ieltsPrev7dTotal = (testsPrev7d ?? 0) + (practicesPrev7d ?? 0);
      const teacherTotal7d = teacherSeries.reduce((a, b) => a + b, 0);
      const teacherPrev7dTotal = entriesPrev7d ?? 0;

      return {
        ielts: {
          activeStudents: activeStudents ?? 0,
          testsRun24h: testsRun24h ?? 0,
          practicesRun24h: practicesRun24h ?? 0,
          testsRun7d: testsRun7d ?? 0,
          series7d: ieltsSeries,
          total7d: ieltsTotal7d,
          prev7d: ieltsPrev7dTotal,
        },
        teacher: {
          activeTeachers: activeTeachers ?? 0,
          activeClasses: activeClasses ?? 0,
          todaySessions: (todayEntries || []).length,
          series7d: teacherSeries,
          total7d: teacherTotal7d,
          prev7d: teacherPrev7dTotal,
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
          total7d={ielts?.total7d}
          prev7d={ielts?.prev7d}
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
          total7d={teacher?.total7d}
          prev7d={teacher?.prev7d}
          loading={isLoading}
        />
      </div>
    </div>
  );
}

function AppCard({
  title, subtitle, icon: Icon, accent, bg, stroke, href, onManage, manageLabel, metrics, series, seriesLabel, days, total7d, prev7d, loading,
}: {
  title: string;
  subtitle: string;
  icon: typeof Users;
  accent: string;
  bg: string;
  stroke: string;
  href: string;
  onManage: () => void;
  manageLabel: string;
  metrics: AppMetric[];
  series?: number[];
  seriesLabel?: string;
  days?: string[];
  total7d?: number;
  prev7d?: number;
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

      {/* Sparkline 7 ngày */}
      {series && series.length > 0 && (
        <div className="mt-1">
          <div className="flex items-center justify-between mb-1 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] text-muted-foreground truncate">{seriesLabel ?? "7 ngày"}</span>
              <DeltaBadge current={total7d} previous={prev7d} />
            </div>
            <span className="text-[10px] text-muted-foreground font-mono shrink-0">
              {days ? `${format(new Date(days[0]), "dd/MM")} – ${format(new Date(days[days.length - 1]), "dd/MM")}` : ""}
            </span>
          </div>
          <Sparkline data={series} color={stroke} days={days} valueLabel={seriesLabel} />
        </div>
      )}

      <button
        onClick={onManage}
        className="text-xs text-primary hover:underline text-left mt-auto"
      >
        → {manageLabel}
      </button>
    </div>
  );
}

/* ── Delta % vs prior 7-day window ── */
function DeltaBadge({ current, previous }: { current?: number; previous?: number }) {
  if (current == null || previous == null) return null;
  // Edge cases
  if (previous === 0 && current === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground" title="Không có dữ liệu kỳ trước">
        <Minus className="h-3 w-3" /> 0%
      </span>
    );
  }
  if (previous === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600" title={`Kỳ trước: 0 → kỳ này: ${current}`}>
        <TrendingUp className="h-3 w-3" /> mới
      </span>
    );
  }
  const pct = ((current - previous) / previous) * 100;
  const rounded = Math.round(pct);
  const isUp = pct > 0;
  const isFlat = Math.abs(pct) < 0.5;
  const Icon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;
  const cls = isFlat
    ? "text-muted-foreground"
    : isUp
      ? "text-emerald-600"
      : "text-rose-600";
  const sign = isFlat ? "" : isUp ? "+" : "";
  return (
    <span
      className={cn("inline-flex items-center gap-0.5 text-[10px] font-semibold", cls)}
      title={`Kỳ này: ${current} · Kỳ trước (7 ngày trước đó): ${previous}`}
    >
      <Icon className="h-3 w-3" />
      {sign}{rounded}%
    </span>
  );
}

/* ── Sparkline SVG with hover tooltip ── */
function Sparkline({
  data, color, days, valueLabel, width = 280, height = 36,
}: {
  data: number[];
  color: string;
  days?: string[];
  valueLabel?: string;
  width?: number;
  height?: number;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const max = Math.max(...data, 1);
  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const step = w / Math.max(data.length - 1, 1);

  const coords = data.map((v, i) => ({
    x: pad + i * step,
    y: pad + h - (v / max) * h,
    v,
  }));

  const points = coords.map((c) => `${c.x},${c.y}`);
  const fillPoints = [...points, `${pad + (data.length - 1) * step},${height - pad}`, `${pad},${height - pad}`];
  const gradId = `spark-fill-${color.replace(/[^a-z0-9]/gi, "")}`;

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const xInVB = xRatio * width;
    // Find nearest index
    let nearest = 0;
    let minDist = Infinity;
    coords.forEach((c, i) => {
      const d = Math.abs(c.x - xInVB);
      if (d < minDist) { minDist = d; nearest = i; }
    });
    setHoverIdx(nearest);
  };

  const hover = hoverIdx != null ? coords[hoverIdx] : null;
  const hoverDay = hoverIdx != null && days?.[hoverIdx] ? days[hoverIdx] : null;
  // Tooltip x position in % for absolute div
  const tooltipLeftPct = hover ? (hover.x / width) * 100 : 0;
  const flipLeft = tooltipLeftPct > 70;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full cursor-crosshair"
        style={{ height }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <polygon points={fillPoints.join(" ")} fill={`url(#${gradId})`} />
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Last point dot (only when not hovering) */}
        {hover == null && data.length > 0 && (
          <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r={2.5} fill={color} />
        )}
        {/* Hover guide */}
        {hover && (
          <>
            <line x1={hover.x} x2={hover.x} y1={pad} y2={height - pad} stroke={color} strokeWidth={0.5} strokeDasharray="2 2" opacity={0.6} />
            <circle cx={hover.x} cy={hover.y} r={3} fill={color} stroke="hsl(var(--background))" strokeWidth={1.5} />
          </>
        )}
      </svg>

      {hover && hoverDay && (
        <div
          className={cn(
            "absolute -top-9 z-10 pointer-events-none rounded-md border bg-popover text-popover-foreground shadow-md px-2 py-1 text-[10px] whitespace-nowrap",
            flipLeft ? "-translate-x-full" : "translate-x-0",
          )}
          style={{ left: `${tooltipLeftPct}%` }}
        >
          <div className="font-mono text-muted-foreground">{format(new Date(hoverDay), "EEE dd/MM")}</div>
          <div className="font-bold tabular-nums" style={{ color }}>
            {hover.v} <span className="text-muted-foreground font-normal">{valueLabel?.replace(/\s*\/\s*ngày$/i, "") ?? ""}</span>
          </div>
        </div>
      )}
    </div>
  );
}
