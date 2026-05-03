/**
 * TeachersBoardPage - Enhanced teacher performance board
 * UI migrated from pages-teachers-board.jsx mockup
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Award, Clock, CheckCircle, TrendingUp, Download, Plus,
  LayoutGrid, List, Grid3X3, ChevronRight, Search, Filter,
  Star, Users, Target, Clock3, School,
} from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Badge } from "@shared/components/ui/badge";
import { Progress } from "@shared/components/ui/progress";
import { cn } from "@shared/lib/utils";

// Mock data - sẽ được thay bằng API call sau
interface TeacherData {
  id: string;
  name: string;
  role: string;
  color: string;
  hours: number;
  rating: number;
  students: number;
  retention: number;
  bandLift: number;
  classes: number;
  ontime: number;
  satisfaction: number;
  growth: number;
  tier: "A+" | "A" | "B+" | "B";
  badges: string[];
  spec: string[];
}

const MOCK_TEACHERS: TeacherData[] = [
  { id: "t1", name: "Ms. Linh Trần", role: "Senior", color: "coral", hours: 78, rating: 4.92, students: 78, retention: 98, bandLift: 1.4, classes: 6, ontime: 100, satisfaction: 96, growth: 8, tier: "A+", badges: ["top3", "mentor", "7+pro"], spec: ["Writing", "Speaking"] },
  { id: "t2", name: "Mr. James Park", role: "Native", color: "yellow", hours: 42, rating: 4.88, students: 54, retention: 95, bandLift: 1.2, classes: 4, ontime: 98, satisfaction: 94, growth: 5, tier: "A", badges: ["native", "speaking"], spec: ["Speaking", "Pronunciation"] },
  { id: "t3", name: "Ms. Dung Phạm", role: "Teacher", color: "violet", hours: 84, rating: 4.81, students: 96, retention: 94, bandLift: 1.1, classes: 7, ontime: 96, satisfaction: 92, growth: 3, tier: "A", badges: ["volume", "reliable"], spec: ["Reading", "Listening"] },
  { id: "t4", name: "Mr. Khoa Nguyễn", role: "Teacher", color: "teal", hours: 72, rating: 4.76, students: 68, retention: 92, bandLift: 1.0, classes: 5, ontime: 99, satisfaction: 91, growth: 2, tier: "A", badges: ["foundation"], spec: ["Foundation"] },
  { id: "t5", name: "Mr. Tuấn Lê", role: "Teacher", color: "sky", hours: 36, rating: 4.62, students: 42, retention: 88, bandLift: 0.9, classes: 3, ontime: 94, satisfaction: 88, growth: -1, tier: "B+", badges: ["part-time"], spec: ["Beginner"] },
  { id: "t6", name: "Ms. Hà Vũ", role: "Probation", color: "yellow", hours: 24, rating: 4.45, students: 24, retention: 85, bandLift: 0.7, classes: 2, ontime: 92, satisfaction: 84, growth: 12, tier: "B", badges: ["rising"], spec: ["Pre-IELTS"] },
  { id: "t7", name: "Mr. Phong Đặng", role: "Teacher", color: "coral", hours: 64, rating: 4.58, students: 52, retention: 90, bandLift: 0.95, classes: 4, ontime: 97, satisfaction: 89, growth: 0, tier: "B+", badges: ["steady"], spec: ["IELTS B1"] },
  { id: "t8", name: "Ms. An Hoàng", role: "Senior", color: "teal", hours: 68, rating: 4.79, students: 64, retention: 93, bandLift: 1.05, classes: 5, ontime: 97, satisfaction: 90, growth: 4, tier: "A", badges: ["mentor"], spec: ["Mastery"] },
];

const TIER_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  "A+": { bg: "bg-rose-500", fg: "text-white", border: "border-rose-600" },
  "A": { bg: "bg-teal-500", fg: "text-white", border: "border-teal-600" },
  "B+": { bg: "bg-amber-400", fg: "text-slate-900", border: "border-amber-500" },
  "B": { bg: "bg-slate-400", fg: "text-white", border: "border-slate-500" },
};

const BADGE_LABELS: Record<string, string> = {
  top3: "🏆 Top 3",
  mentor: "🎓 Mentor",
  "7+pro": "👑 7.0+",
  native: "🌍 Native",
  speaking: "🎙️ Speaking",
  volume: "📊 Volume",
  reliable: "⚡ Reliable",
  foundation: "🌱 Foundation",
  "part-time": "⏱ Part-time",
  rising: "🚀 Rising",
  steady: "🎯 Steady",
};

const ROLE_COLOR_MAP: Record<string, string> = {
  coral: "bg-rose-500",
  yellow: "bg-amber-400",
  violet: "bg-violet-500",
  teal: "bg-teal-500",
  sky: "bg-sky-500",
};

type ViewMode = "grid" | "leaderboard" | "matrix";
type SortKey = "rating" | "students" | "retention" | "bandLift" | "hours" | "growth";
type FilterTier = "all" | "a" | "b";

export default function TeachersBoardPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortKey>("rating");
  const [filter, setFilter] = useState<FilterTier>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const teachers = MOCK_TEACHERS; // TODO: Replace with API call

  const stats = useMemo(() => {
    const total = teachers.length;
    const totalHours = teachers.reduce((a, t) => a + t.hours, 0);
    const totalStudents = teachers.reduce((a, t) => a + t.students, 0);
    const avgRating = total > 0 ? (teachers.reduce((a, t) => a + t.rating, 0) / total).toFixed(2) : "0.00";
    const avgRetention = total > 0 ? Math.round(teachers.reduce((a, t) => a + t.retention, 0) / total) : 0;
    return { total, totalHours, totalStudents, avgRating, avgRetention };
  }, [teachers]);

  const filteredTeachers = useMemo(() => {
    let filtered = filter === "all" 
      ? teachers 
      : teachers.filter(t => t.tier.toLowerCase().startsWith(filter));
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t => t.name.toLowerCase().includes(q));
    }

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "rating": return b.rating - a.rating;
        case "students": return b.students - a.students;
        case "retention": return b.retention - a.retention;
        case "bandLift": return b.bandLift - a.bandLift;
        case "hours": return b.hours - a.hours;
        case "growth": return b.growth - a.growth;
        default: return 0;
      }
    });
  }, [teachers, filter, sortBy, searchQuery]);

  const tierACount = teachers.filter(t => t.tier.startsWith("A")).length;
  const avgBandLift = teachers.length > 0 
    ? (teachers.reduce((a, t) => a + t.bandLift, 0) / teachers.length).toFixed(1)
    : "0.0";
  const avgOntime = teachers.length > 0
    ? Math.round(teachers.reduce((a, t) => a + t.ontime, 0) / teachers.length)
    : 0;
  const avgSatisfaction = teachers.length > 0
    ? Math.round(teachers.reduce((a, t) => a + t.satisfaction, 0) / teachers.length)
    : 0;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Người dùng · Teachers · Performance Board
          </p>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold">
            Bảng nhân sự, <span className="text-rose-500">ai sao quá chừng</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {stats.total} giáo viên active · {stats.totalHours}h giảng tháng này · {stats.totalStudents} học viên · TB {stats.avgRating}★ · retention {stats.avgRetention}%
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Award className="h-3.5 w-3.5" /> Trao badge
          </Button>
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Thêm GV
          </Button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Tier A+ / A"
          value={`${tierACount}/${stats.total}`}
          sub="tỷ lệ giáo viên giỏi"
          color="rose"
          icon={Award}
        />
        <StatCard
          label="Band lift TB"
          value={`+${avgBandLift}`}
          sub="điểm IELTS / khoá"
          color="teal"
          icon={TrendingUp}
        />
        <StatCard
          label="On-time"
          value={`${avgOntime}%`}
          sub="điểm danh đúng giờ"
          color="amber"
          icon={Clock3}
        />
        <StatCard
          label="Hài lòng"
          value={`${avgSatisfaction}%`}
          sub="feedback học viên"
          color="violet"
          icon={CheckCircle}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
        {/* View Toggle */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
          <Button
            variant={view === "grid" ? "default" : "ghost"}
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setView("grid")}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Cards
          </Button>
          <Button
            variant={view === "leaderboard" ? "default" : "ghost"}
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setView("leaderboard")}
          >
            <List className="h-3.5 w-3.5" /> Leaderboard
          </Button>
          <Button
            variant={view === "matrix" ? "default" : "ghost"}
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setView("matrix")}
          >
            <Grid3X3 className="h-3.5 w-3.5" /> Matrix 9-box
          </Button>
        </div>

        {/* Filter */}
        <div className="flex gap-1">
          {[
            { id: "all" as FilterTier, label: "Tất cả" },
            { id: "a" as FilterTier, label: "Tier A" },
            { id: "b" as FilterTier, label: "Tier B" },
          ].map(f => (
            <Button
              key={f.id}
              variant={filter === f.id ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Search & Sort */}
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm giáo viên..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs w-48"
            />
          </div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortKey)}
            className="h-8 text-xs font-semibold bg-background border rounded-md px-2"
          >
            <option value="rating">Đánh giá</option>
            <option value="students">Học viên</option>
            <option value="retention">Retention</option>
            <option value="bandLift">Band lift</option>
            <option value="hours">Giờ giảng</option>
            <option value="growth">Tăng trưởng</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {view === "grid" && <GridView teachers={filteredTeachers} onSelect={(t) => navigate(`/users/teachers/${t.id}`)} />}
      {view === "leaderboard" && <LeaderboardView teachers={filteredTeachers} onSelect={(t) => navigate(`/users/teachers/${t.id}`)} />}
      {view === "matrix" && <MatrixView teachers={filteredTeachers} onSelect={(t) => navigate(`/users/teachers/${t.id}`)} />}
    </div>
  );
}

/* ─── Components ─── */

// Hard shadow style matching template
const HARD_SHADOW = "shadow-[4px_4px_0_0_#0f172a]";
const HARD_SHADOW_SM = "shadow-[2px_2px_0_0_#0f172a]";

function StatCard({ label, value, sub, color, icon: Icon }: {
  label: string;
  value: string;
  sub: string;
  color: "rose" | "teal" | "amber" | "violet";
  icon: typeof Award;
}) {
  const colorMap = {
    rose: {
      bg: "bg-rose-500",
      border: "border-rose-600",
      text: "text-white",
      softBg: "bg-rose-50",
      softBorder: "border-rose-200",
      softText: "text-rose-700"
    },
    teal: {
      bg: "bg-teal-500",
      border: "border-teal-600",
      text: "text-white",
      softBg: "bg-teal-50",
      softBorder: "border-teal-200",
      softText: "text-teal-700"
    },
    amber: {
      bg: "bg-amber-400",
      border: "border-amber-600",
      text: "text-slate-900",
      softBg: "bg-amber-50",
      softBorder: "border-amber-200",
      softText: "text-amber-700"
    },
    violet: {
      bg: "bg-violet-500",
      border: "border-violet-600",
      text: "text-white",
      softBg: "bg-violet-50",
      softBorder: "border-violet-200",
      softText: "text-violet-700"
    },
  };

  const c = colorMap[color];

  return (
    <div className={cn(
      "rounded-xl border-2 p-4 transition-transform hover:-translate-y-0.5",
      c.softBg, c.softBorder, c.softText,
      HARD_SHADOW
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</span>
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center border-2", c.bg, c.border, c.text)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="font-display text-3xl font-extrabold tracking-tight">{value}</div>
      <div className="text-xs font-bold mt-1 opacity-70">{sub}</div>
    </div>
  );
}

function GridView({ teachers, onSelect }: { teachers: TeacherData[]; onSelect: (t: TeacherData) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {teachers.map((t, i) => {
        const tier = TIER_COLORS[t.tier];
        // Rotation for sticker effect: -3 to +3 degrees
        const rotation = ((i % 7) - 3);
        return (
          <div
            key={t.id}
            className={cn(
              "rounded-xl border-2 border-slate-800 bg-white overflow-hidden cursor-pointer transition-all hover:-translate-y-1",
              HARD_SHADOW
            )}
            onClick={() => onSelect(t)}
          >
            {/* Tier bar - thick */}
            <div className={cn("h-2 border-b-2 border-slate-800", tier.bg)} />

            {/* Header */}
            <div className="p-4 border-b-2 border-dashed border-slate-200">
              <div className="flex items-center gap-3">
                {/* Sticker avatar with rotation */}
                <div className="relative shrink-0">
                  <div
                    className={cn(
                      "w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold border-2 border-slate-800",
                      ROLE_COLOR_MAP[t.color] || "bg-slate-500",
                      t.color === "yellow" ? "text-slate-900" : "text-white",
                      HARD_SHADOW_SM
                    )}
                    style={{ transform: `rotate(${rotation}deg)` }}
                  >
                    {t.name.split(" ").pop()?.[0]}
                  </div>
                  {/* Tier badge - small sticker */}
                  <div
                    className={cn(
                      "absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold border-2 border-slate-800",
                      tier.bg, tier.fg,
                      HARD_SHADOW_SM
                    )}
                  >
                    {t.tier}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-sm truncate">{t.name}</div>
                  <div className="text-xs text-muted-foreground font-medium">{t.role}</div>
                </div>
                <div className="text-right">
                  <div className="font-display font-bold text-xl text-amber-600">{t.rating}★</div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">rating</div>
                </div>
              </div>
            </div>

            {/* Metrics - boxed style */}
            <div className="grid grid-cols-4 gap-0 p-2 bg-slate-50">
              {[
                { l: "Giờ", v: t.hours, c: "text-teal-600", bg: "bg-teal-50" },
                { l: "HV", v: t.students, c: "text-rose-600", bg: "bg-rose-50" },
                { l: "Ret", v: `${t.retention}%`, c: "text-amber-600", bg: "bg-amber-50" },
                { l: "Lift", v: `+${t.bandLift}`, c: "text-violet-600", bg: "bg-violet-50" },
              ].map((m, idx) => (
                <div
                  key={m.l}
                  className={cn(
                    "text-center p-2",
                    m.bg,
                    idx < 3 && "border-r-2 border-dashed border-slate-200"
                  )}
                >
                  <div className={cn("font-display font-bold text-lg", m.c)}>{m.v}</div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{m.l}</div>
                </div>
              ))}
            </div>

            {/* Badges */}
            <div className="p-3 border-t-2 border-slate-800 flex flex-wrap gap-1.5 items-center min-h-[56px] bg-white">
              {t.badges.slice(0, 3).map((b, bi) => (
                <span
                  key={b}
                  className={cn(
                    "text-[10px] font-bold px-2.5 py-1 rounded-full border-2 border-slate-800 bg-white",
                    HARD_SHADOW_SM
                  )}
                  style={{ transform: `rotate(${(bi % 3) - 1}deg)` }}
                >
                  {BADGE_LABELS[b] || b}
                </span>
              ))}
              <div className="flex-1" />
              <span
                className={cn(
                  "text-xs font-bold px-2 py-0.5 rounded-lg border",
                  t.growth > 0 ? "bg-teal-100 text-teal-700 border-teal-300" :
                  t.growth < 0 ? "bg-rose-100 text-rose-700 border-rose-300" :
                  "bg-slate-100 text-slate-600 border-slate-300"
                )}
              >
                {t.growth > 0 ? "↑" : t.growth < 0 ? "↓" : "→"} {Math.abs(t.growth)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LeaderboardView({ teachers, onSelect }: { teachers: TeacherData[]; onSelect: (t: TeacherData) => void }) {
  return (
    <div className="rounded-xl border-2 bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left w-12">#</th>
            <th className="px-4 py-3 text-left">Giáo viên</th>
            <th className="px-4 py-3 text-center w-16">Tier</th>
            <th className="px-4 py-3 text-right w-20">Rating</th>
            <th className="px-4 py-3 text-right w-16">HV</th>
            <th className="px-4 py-3 text-right w-20">Retention</th>
            <th className="px-4 py-3 text-right w-20">Band lift</th>
            <th className="px-4 py-3 text-right w-20">Giờ/tháng</th>
            <th className="px-4 py-3 text-right w-16">On-time</th>
            <th className="px-4 py-3 text-right w-16">Satis.</th>
            <th className="px-4 py-3 text-right w-16">Growth</th>
          </tr>
        </thead>
        <tbody>
          {teachers.map((t, i) => {
            const tier = TIER_COLORS[t.tier];
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
            return (
              <tr
                key={t.id}
                className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                onClick={() => onSelect(t)}
              >
                <td className="px-4 py-3 font-display font-bold text-lg">
                  {medal || `#${i + 1}`}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border border-slate-800",
                        ROLE_COLOR_MAP[t.color] || "bg-slate-500"
                      )}
                    >
                      {t.name.split(" ").pop()?.[0]}
                    </div>
                    <div>
                      <div className="font-bold text-sm">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.role} · {t.spec.join(", ")}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={cn(
                      "inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold border",
                      tier.bg, tier.fg, tier.border
                    )}
                  >
                    {t.tier}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-amber-600">{t.rating}★</td>
                <td className="px-4 py-3 text-right font-mono font-medium">{t.students}</td>
                <td className="px-4 py-3 text-right">
                  <PerfBar value={t.retention} max={100} />
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-teal-600">+{t.bandLift}</td>
                <td className="px-4 py-3 text-right font-mono font-medium">{t.hours}h</td>
                <td className="px-4 py-3 text-right font-mono font-medium">{t.ontime}%</td>
                <td className="px-4 py-3 text-right font-mono font-medium">{t.satisfaction}%</td>
                <td className="px-4 py-3 text-right font-mono font-bold">
                  <span className={t.growth > 0 ? "text-teal-600" : t.growth < 0 ? "text-rose-600" : ""}>
                    {t.growth > 0 ? "↑" : t.growth < 0 ? "↓" : "→"}{Math.abs(t.growth)}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MatrixView({ teachers, onSelect }: { teachers: TeacherData[]; onSelect: (t: TeacherData) => void }) {
  // 9-box matrix: Performance (rating) vs Potential (growth)
  const cells = [
    { y: 2, x: 0, label: "Rough Diamond", color: "bg-amber-100", borderColor: "border-amber-200" },
    { y: 2, x: 1, label: "High Potential", color: "bg-amber-200", borderColor: "border-amber-300" },
    { y: 2, x: 2, label: "⭐ Star", color: "bg-rose-500", borderColor: "border-rose-600", isStar: true },
    { y: 1, x: 0, label: "Inconsistent", color: "bg-slate-100", borderColor: "border-slate-200" },
    { y: 1, x: 1, label: "Core Player", color: "bg-teal-100", borderColor: "border-teal-200" },
    { y: 1, x: 2, label: "High Performer", color: "bg-amber-100", borderColor: "border-amber-200" },
    { y: 0, x: 0, label: "Risk", color: "bg-rose-100", borderColor: "border-rose-200" },
    { y: 0, x: 1, label: "Effective", color: "bg-slate-100", borderColor: "border-slate-200" },
    { y: 0, x: 2, label: "Solid Pro", color: "bg-amber-100", borderColor: "border-amber-200" },
  ];

  return (
    <div className="rounded-xl border-2 bg-card p-5">
      <div className="mb-4">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">9-box · Performance × Potential</span>
        <h2 className="font-display text-xl font-bold">Ma trận <span className="text-rose-500">nhân sự</span></h2>
        <p className="text-xs text-muted-foreground">X: Performance hiện tại · Y: Tiềm năng tăng trưởng</p>
      </div>

      <div className="grid grid-cols-[40px_1fr] gap-3">
        {/* Y axis */}
        <div className="flex items-center justify-center">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground [writing-mode:vertical-rl] [transform:rotate(180deg)]">
            ↑ Tiềm năng
          </span>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-2">
          {cells.map(cell => {
            const inCell = teachers.filter(t => {
              const px = t.rating >= 4.85 ? 2 : t.rating >= 4.7 ? 1 : 0;
              const py = t.growth >= 5 ? 2 : t.growth >= 0 ? 1 : 0;
              return px === cell.x && py === cell.y;
            });

            return (
              <div
                key={`${cell.y}-${cell.x}`}
                className={cn(
                  "rounded-xl border-2 p-3 min-h-[120px]",
                  cell.color, cell.borderColor,
                  cell.isStar && "border-slate-800 shadow-md"
                )}
              >
                <div className={cn(
                  "font-display font-bold text-xs uppercase mb-2",
                  cell.isStar ? "text-white" : "text-slate-700"
                )}>
                  {cell.label}
                </div>
                <div className="flex flex-wrap gap-1">
                  {inCell.map(t => (
                    <div
                      key={t.id}
                      onClick={() => onSelect(t)}
                      className="flex items-center gap-1 px-2 py-1 bg-white rounded-full border text-xs font-medium cursor-pointer hover:shadow-sm"
                    >
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white",
                          ROLE_COLOR_MAP[t.color] || "bg-slate-500"
                        )}
                      >
                        {t.name.split(" ").pop()?.[0]}
                      </div>
                      <span className="truncate max-w-[80px]">
                        {t.name.replace("Ms. ", "").replace("Mr. ", "")}
                      </span>
                    </div>
                  ))}
                  {inCell.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* X axis label */}
      <div className="text-center mt-2 ml-10">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Hiệu suất hiện tại →
        </span>
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-3 gap-3 mt-5">
        <div className="rounded-xl border-2 bg-rose-50 border-rose-200 p-3">
          <div className="text-xs font-bold uppercase text-rose-700 mb-1">⭐ Giữ chân</div>
          <p className="text-xs">2 ⭐ Stars cần lộ trình đặc biệt: mentor role, profit share.</p>
        </div>
        <div className="rounded-xl border-2 bg-amber-50 border-amber-200 p-3">
          <div className="text-xs font-bold uppercase text-amber-700 mb-1">🚀 Phát triển</div>
          <p className="text-xs">3 High Potentials đang lên — pair với senior.</p>
        </div>
        <div className="rounded-xl border-2 bg-red-50 border-red-200 p-3">
          <div className="text-xs font-bold uppercase text-red-700 mb-1">⚠ Cần can thiệp</div>
          <p className="text-xs">1 Risk — hiệu suất + tiềm năng đều thấp. Cần 1-1 ngay.</p>
        </div>
      </div>
    </div>
  );
}

function PerfBar({ value, max }: { value: number; max: number }) {
  const color = value >= 95 ? "bg-teal-500" : value >= 90 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full", color)} style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className="text-xs font-bold w-8 text-right">{value}%</span>
    </div>
  );
}
