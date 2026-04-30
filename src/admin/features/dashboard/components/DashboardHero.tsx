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

/* ───────────────── KPI Card ───────────────── */

interface KpiProps {
  label: string;
  value: number | string;
  delta?: string;
  deltaPositive?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  decor: React.ReactNode;
  iconTone?: "teal" | "coral";
  onClick?: () => void;
}

function KpiCard({ label, value, delta, deltaPositive = true, icon: Icon, decor, iconTone = "teal", onClick }: KpiProps) {
  const iconBg = iconTone === "coral" ? "bg-lp-coral text-white" : "bg-lp-teal text-white";
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative overflow-hidden rounded-pop-lg bg-white border-[2.5px] border-lp-ink text-left p-5 shadow-pop transition-all duration-150 ease-bounce hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pop-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-pop-sm min-h-[148px]"
    >
      {/* Decorative geometric SVG bottom-right */}
      <div className="pointer-events-none absolute -bottom-2 -right-2 w-28 h-28 opacity-90">
        {decor}
      </div>

      <div className="relative flex items-start justify-between">
        <div className={`h-10 w-10 rounded-pop ${iconBg} border-[2px] border-lp-ink flex items-center justify-center shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
        {delta && (
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold rounded-full px-2 py-0.5 border-[1.5px] border-lp-ink ${
            deltaPositive ? "bg-lp-mint text-white" : "bg-lp-coral text-white"
          }`}>
            <TrendingUp className={`h-3 w-3 ${!deltaPositive && "rotate-180"}`} />
            {delta}
          </span>
        )}
      </div>

      <div className="relative mt-4">
        <p className="text-[11px] uppercase tracking-[0.1em] font-display font-bold text-lp-body">{label}</p>
        <p className="font-display text-3xl md:text-4xl font-extrabold text-lp-ink mt-1 leading-none tracking-tight">
          {value}
        </p>
      </div>
    </button>
  );
}

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
    <div className="rounded-pop-lg bg-white border-[2.5px] border-lp-ink p-5 shadow-pop h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.1em] font-display font-bold text-lp-body">
            Lịch tháng
          </p>
          <h3 className="font-display text-base font-extrabold text-lp-ink capitalize mt-0.5">
            {format(today, "MMMM yyyy", { locale: vi })}
          </h3>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="inline-flex items-center gap-1 text-lp-body">
            <span className="h-1.5 w-1.5 rounded-full bg-lp-teal" /> Lớp
          </span>
          <span className="inline-flex items-center gap-1 text-lp-body">
            <span className="h-1.5 w-1.5 rounded-full bg-lp-coral" /> Sự kiện
          </span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-display font-bold uppercase text-lp-body/70 mb-1.5">
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
              className={`relative aspect-square rounded-pop flex items-center justify-center text-xs font-display font-bold transition-all cursor-default
                ${today_
                  ? "bg-lp-teal text-white border-[2px] border-lp-ink shadow-pop-xs"
                  : "text-lp-ink/80 hover:bg-lp-yellow/20"}
              `}
            >
              {format(d, "d")}
              {tone && !today_ && (
                <span className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${tone === "teal" ? "bg-lp-teal" : "bg-lp-coral"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────── Bar chart ───────────────── */

interface BarDatum { name: string; primary: number; secondary: number }

function PerformanceChart({ data }: { data: BarDatum[] }) {
  return (
    <div className="rounded-pop-lg bg-white border-[2.5px] border-lp-ink p-5 shadow-pop h-full flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.1em] font-display font-bold text-lp-body">
            Performance
          </p>
          <h3 className="font-display text-base font-extrabold text-lp-ink mt-0.5">
            Hoạt động theo skill (30 ngày)
          </h3>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="inline-flex items-center gap-1 text-lp-body font-medium">
            <span className="h-2 w-2 rounded-sm bg-lp-teal" /> Bài thi
          </span>
          <span className="inline-flex items-center gap-1 text-lp-body font-medium">
            <span className="h-2 w-2 rounded-sm bg-lp-coral" /> Luyện tập
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 0, left: -28, bottom: 0 }} barCategoryGap="28%">
            <XAxis
              dataKey="name"
              tick={{ fill: "var(--lp-body)", fontSize: 11, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--lp-body)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "var(--lp-yellow)", fillOpacity: 0.2 }}
              contentStyle={{
                background: "white",
                border: "2px solid var(--lp-ink)",
                borderRadius: "12px",
                fontSize: "12px",
                boxShadow: "4px 4px 0 0 var(--lp-ink)",
              }}
            />
            <Bar dataKey="primary" radius={[8, 8, 0, 0]} maxBarSize={20}>
              {data.map((_, i) => <Cell key={i} fill="var(--lp-teal)" />)}
            </Bar>
            <Bar dataKey="secondary" radius={[8, 8, 0, 0]} maxBarSize={20}>
              {data.map((_, i) => <Cell key={i} fill="var(--lp-coral)" />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ───────────────── Top Performers list ───────────────── */

interface PerformerItem {
  id: string;
  name: string;
  meta: string;
  badge?: { label: string; tone: "teal" | "coral" | "muted" };
}

function TopPerformers({ items }: { items: PerformerItem[] }) {
  const colors = [
    "from-lp-yellow to-lp-coral",
    "from-lp-coral to-lp-violet",
    "from-lp-teal to-lp-mint",
    "from-lp-violet to-lp-pink",
  ];
  return (
    <div className="rounded-pop-lg bg-white border-[2.5px] border-lp-ink p-5 shadow-pop h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.1em] font-display font-bold text-lp-body">
            Hoạt động gần đây
          </p>
          <h3 className="font-display text-base font-extrabold text-lp-ink mt-0.5">Nội dung mới</h3>
        </div>
      </div>
      <ul className="space-y-3">
        {items.length === 0 && (
          <li className="text-sm text-lp-body py-6 text-center">Chưa có dữ liệu</li>
        )}
        {items.map((item, i) => (
          <li key={item.id} className="flex items-center gap-3 p-2 rounded-pop hover:bg-lp-yellow/20 transition-colors">
            <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${colors[i % colors.length]} text-lp-ink font-display font-extrabold text-xs flex items-center justify-center border-[2px] border-lp-ink shrink-0`}>
              {item.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-display font-bold text-lp-ink truncate">{item.name}</p>
              <p className="text-[11px] text-lp-body truncate">{item.meta}</p>
            </div>
            {item.badge && (
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border-[1.5px] border-lp-ink
                ${item.badge.tone === "teal" ? "bg-lp-teal text-white"
                  : item.badge.tone === "coral" ? "bg-lp-coral text-white"
                  : "bg-lp-cream text-lp-body"}`}>
                {item.badge.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
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
  recentItems?: PerformerItem[];
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
        <KpiCard
          label="Total Students"
          value={totalStudents.toLocaleString("vi-VN")}
          icon={Users}
          iconTone="teal"
          decor={<CylindersDecor tone="teal" className="w-full h-full" />}
          onClick={() => navigate("/users")}
        />
        <KpiCard
          label="Teachers"
          value={totalTeachers.toLocaleString("vi-VN")}
          icon={GraduationCap}
          iconTone="coral"
          decor={<StripedArcDecor tone="coral" className="w-full h-full" />}
          onClick={() => navigate("/teachers")}
        />
        <KpiCard
          label="Active Classes"
          value={totalClasses.toLocaleString("vi-VN")}
          icon={BookOpen}
          iconTone="teal"
          decor={<RingsDecor tone="teal" className="w-full h-full" />}
          onClick={() => navigate("/classes")}
        />
        <KpiCard
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
        <TopPerformers items={recentItems.slice(0, 6)} />
      )}
    </div>
  );
}
