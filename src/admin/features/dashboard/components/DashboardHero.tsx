import { Users, GraduationCap, BookOpen, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  CylindersDecor, StripedArcDecor, SpheresDecor, RingsDecor,
} from "./GeometricDecor";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip,
} from "recharts";
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format, isToday, isSameDay,
} from "date-fns";
import { vi } from "date-fns/locale";
import { useMemo } from "react";
import { SoftCard, StatCard, RecentList, type RecentListItem } from "@shared/components/dashboard";

/* ───────────────── Calendar widget ───────────────── */

function CalendarWidget({ activeDays }: { activeDays?: { date: Date; tone: "teal" | "coral" }[] }) {
  const today = new Date();
  const days = useMemo(
    () => eachDayOfInterval({ start: startOfMonth(today), end: endOfMonth(today) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [today.getMonth(), today.getFullYear()],
  );
  const firstDayOfWeek = startOfMonth(today).getDay(); // 0=Sun
  const padStart = (firstDayOfWeek + 6) % 7; // make Mon-first

  const weekdayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  const dotFor = (d: Date) => {
    if (!activeDays) return null;
    const m = activeDays.find((a) => isSameDay(a.date, d));
    return m?.tone ?? null;
  };

  return (
    <SoftCard
      eyebrow="Lịch tháng"
      title={format(today, "MMMM yyyy", { locale: vi })}
      action={
        <div className="flex items-center gap-3 text-[10px]">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Lớp
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Sự kiện
          </span>
        </div>
      }
      className="h-full flex flex-col [&>div:last-child]:flex-1 capitalize"
    >
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-muted-foreground/70 mb-1.5">
        {weekdayLabels.map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1 flex-1">
        {Array.from({ length: padStart }).map((_, i) => <div key={`p-${i}`} />)}
        {days.map((d) => {
          const tone = dotFor(d);
          const today_ = isToday(d);
          return (
            <div
              key={d.toISOString()}
              className={`relative aspect-square rounded-lg flex items-center justify-center text-xs font-semibold transition-all cursor-default
                ${today_
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                  : "text-foreground/80 hover:bg-secondary/60"}
              `}
            >
              {format(d, "d")}
              {tone && !today_ && (
                <span className={`absolute bottom-1 h-1 w-1 rounded-full ${tone === "teal" ? "bg-primary" : "bg-accent"}`} />
              )}
            </div>
          );
        })}
      </div>
    </SoftCard>
  );
}

/* ───────────────── Bar chart ───────────────── */

interface BarDatum { name: string; primary: number; secondary: number }

function PerformanceChart({ data }: { data: BarDatum[] }) {
  return (
    <SoftCard
      eyebrow="Performance"
      title="Hoạt động theo skill (30 ngày)"
      action={
        <div className="flex items-center gap-3 text-[10px]">
          <span className="inline-flex items-center gap-1 text-muted-foreground font-medium">
            <span className="h-2 w-2 rounded-sm bg-primary" /> Bài thi
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground font-medium">
            <span className="h-2 w-2 rounded-sm bg-accent" /> Luyện tập
          </span>
        </div>
      }
      className="h-full flex flex-col [&>div:last-child]:flex-1 [&>div:last-child]:min-h-[220px]"
    >
      <div className="h-full min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 0, left: -28, bottom: 0 }} barCategoryGap="28%">
            <XAxis
              dataKey="name"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--secondary) / 0.4)" }}
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
                fontSize: "12px",
                boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
              }}
            />
            <Bar dataKey="primary" radius={[8, 8, 0, 0]} maxBarSize={20}>
              {data.map((_, i) => <Cell key={i} fill="hsl(174 51% 47%)" />)}
            </Bar>
            <Bar dataKey="secondary" radius={[8, 8, 0, 0]} maxBarSize={20}>
              {data.map((_, i) => <Cell key={i} fill="hsl(10 93% 69%)" />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SoftCard>
  );
}

/* ───────────────── Hero shell ───────────────── */

interface DashboardHeroProps {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalTests: number;
  recentResults7d: number;
  recentPractice7d: number;
  performanceData?: BarDatum[];
  recentItems?: RecentListItem[];
  scheduleDays?: { date: Date; tone: "teal" | "coral" }[];
}

export default function DashboardHero({
  totalStudents, totalTeachers, totalClasses, totalTests,
  recentResults7d, recentPractice7d,
  performanceData, recentItems, scheduleDays,
}: DashboardHeroProps) {
  const navigate = useNavigate();

  const fallbackPerformance: BarDatum[] = useMemo(() => ([
    { name: "Listen", primary: Math.max(8, Math.round(recentResults7d * 0.9)), secondary: Math.max(6, Math.round(recentPractice7d * 0.7)) },
    { name: "Read", primary: Math.max(10, Math.round(recentResults7d * 1.1)), secondary: Math.max(8, Math.round(recentPractice7d * 0.8)) },
    { name: "Write", primary: Math.max(6, Math.round(recentResults7d * 0.6)), secondary: Math.max(4, Math.round(recentPractice7d * 0.5)) },
    { name: "Speak", primary: Math.max(4, Math.round(recentResults7d * 0.5)), secondary: Math.max(3, Math.round(recentPractice7d * 0.4)) },
  ]), [recentResults7d, recentPractice7d]);

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Total Students"
          value={totalStudents.toLocaleString("vi-VN")}
          icon={Users}
          iconTone="teal"
          decor={<CylindersDecor tone="teal" className="w-full h-full" />}
          onClick={() => navigate("/users")}
        />
        <StatCard
          label="Teachers"
          value={totalTeachers.toLocaleString("vi-VN")}
          icon={GraduationCap}
          iconTone="coral"
          decor={<StripedArcDecor tone="coral" className="w-full h-full" />}
          onClick={() => navigate("/teachers")}
        />
        <StatCard
          label="Active Classes"
          value={totalClasses.toLocaleString("vi-VN")}
          icon={BookOpen}
          iconTone="teal"
          decor={<RingsDecor tone="teal" className="w-full h-full" />}
          onClick={() => navigate("/classes")}
        />
        <StatCard
          label="Test Bank"
          value={totalTests.toLocaleString("vi-VN")}
          icon={TrendingUp}
          iconTone="coral"
          decor={<SpheresDecor tone="mixed" className="w-full h-full" />}
          onClick={() => navigate("/tests")}
        />
      </div>

      {/* Calendar + Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <CalendarWidget activeDays={scheduleDays} />
        </div>
        <div className="lg:col-span-3">
          <PerformanceChart data={performanceData?.length ? performanceData : fallbackPerformance} />
        </div>
      </div>

      {/* Top Performers / Recent */}
      {recentItems && recentItems.length > 0 && (
        <RecentList items={recentItems.slice(0, 6)} />
      )}
    </div>
  );
}