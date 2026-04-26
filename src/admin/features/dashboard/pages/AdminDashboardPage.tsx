import { useEffect, useState, useMemo } from "react";
import {
  FileText, Loader2, Layers,
  Upload, BarChart3, UserPlus, Award,
  ArrowRight, PenLine, ListChecks, UserSearch, ChevronRight, CalendarDays, AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@shared/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar, Cell,
} from "recharts";
import { Badge } from "@shared/components/ui/badge";
import ClassQuestionTypeStats from "@shared/components/teacher-shared/ClassQuestionTypeStats";
import PracticeErrorStats from "@admin/features/practice/components/PracticeErrorStats";
import AdminActivityCalendar from "@admin/features/dashboard/components/AdminActivityCalendar";
import TeacherProgressSummary from "@shared/components/teacher-shared/TeacherProgressSummary";
import ContentAnalytics from "@admin/features/dashboard/components/ContentAnalytics";
import AppsStatusWidget from "@admin/features/dashboard/components/AppsStatusWidget";
import TeacherActivityFeed from "@admin/features/dashboard/components/TeacherActivityFeed";
import ContractStatusWidget from "@admin/features/dashboard/components/ContractStatusWidget";
import TimesheetStatusWidget from "@admin/features/dashboard/components/TimesheetStatusWidget";
import PayrollStatusWidget from "@admin/features/dashboard/components/PayrollStatusWidget";
import DashboardHero from "@admin/features/dashboard/components/DashboardHero";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@shared/components/ui/button";

interface DashboardStats {
  totalTests: number;
  publishedTests: number;
  draftTests: number;
  totalExercises: number;
  publishedExercises: number;
  totalStudents: number;
  linkedStudents: number;
  totalTeachers: number;
  totalClasses: number;
  recentResults7d: number;
  recentPractice7d: number;
}

interface RecentItem {
  id: string;
  name: string;
  type: "test" | "exercise";
  status: string;
  section_type?: string;
  skill?: string;
  created_at: string;
}

interface DailyActivity {
  date: string;
  label: string;
  tests: number;
  practices: number;
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [activityTrend, setActivityTrend] = useState<DailyActivity[]>([]);
  const [testResultsForAnalysis, setTestResultsForAnalysis] = useState<any[]>([]);
  const [practiceResultsForAnalysis, setPracticeResultsForAnalysis] = useState<any[]>([]);
  const [prospects, setProspects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Today's schedule summary
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const { data: todaySchedule } = useQuery({
    queryKey: ["admin-today-schedule", todayStr],
    queryFn: async () => {
      const { data: classes } = await supabase
        .from("teachngo_classes")
        .select("id, class_name, class_type, room, study_plan_id, default_start_time, default_end_time")
        .eq("status", "active");
      if (!classes || classes.length === 0) return { count: 0, conflicts: 0, firstTime: null as string | null };

      const planIds = classes.filter(c => c.study_plan_id).map(c => c.study_plan_id!);
      if (planIds.length === 0) return { count: 0, conflicts: 0, firstTime: null as string | null };

      const { data: entries } = await supabase
        .from("study_plan_entries")
        .select("id, plan_id, start_time, end_time, room")
        .in("plan_id", planIds)
        .eq("entry_date", todayStr)
        .order("start_time", { ascending: true, nullsFirst: false });

      const sessions = (entries || []).map((e: any) => {
        const cls = classes.find(c => c.study_plan_id === e.plan_id);
        return { ...e, start_time: e.start_time || cls?.default_start_time, end_time: e.end_time || cls?.default_end_time, room: e.room || cls?.room };
      });

      // Detect conflicts
      let conflicts = 0;
      for (let i = 0; i < sessions.length; i++) {
        for (let j = i + 1; j < sessions.length; j++) {
          const a = sessions[i], b = sessions[j];
          if (!a.room || !b.room || a.room !== b.room) continue;
          if (!a.start_time || !b.start_time) continue;
          const aS = a.start_time.slice(0, 5), aE = (a.end_time || "").slice(0, 5);
          const bS = b.start_time.slice(0, 5), bE = (b.end_time || "").slice(0, 5);
          if (aS < (bE || "99:99") && bS < (aE || "99:99")) conflicts++;
        }
      }

      const firstTime = sessions.length > 0 && sessions[0].start_time ? sessions[0].start_time.slice(0, 5) : null;
      return { count: sessions.length, conflicts, firstTime };
    },
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setLoadError(null);

      try {
        const now = new Date();
        const sevenDaysAgo = subDays(now, 7).toISOString();
        const fourteenDaysAgo = subDays(now, 14).toISOString();

        const [
          assessmentsRes,
          exercisesRes,
          studentCountRes,
          linkedCountRes,
          teacherCountRes,
          classCountRes,
          recentResultCountRes,
          recentPracticeCountRes,
        ] = await Promise.all([
          supabase.from("assessments").select("id, name, book_name, status, created_at, section_type").order("created_at", { ascending: false }),
          supabase.from("practice_exercises").select("id, title, status, skill, created_at").order("created_at", { ascending: false }),
          supabase.from("teachngo_students").select("*", { count: "exact", head: true }),
          supabase.from("teachngo_students").select("*", { count: "exact", head: true }).not("linked_user_id", "is", null),
          supabase.from("teachers").select("*", { count: "exact", head: true }),
          supabase.from("teachngo_classes").select("*", { count: "exact", head: true }),
          supabase.from("test_results").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
          supabase.from("practice_results").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
        ]);

        const criticalError = [
          assessmentsRes.error,
          exercisesRes.error,
          studentCountRes.error,
          linkedCountRes.error,
          teacherCountRes.error,
          classCountRes.error,
          recentResultCountRes.error,
          recentPracticeCountRes.error,
        ].find(Boolean);

        if (criticalError) {
          throw criticalError;
        }

        const allTests = assessmentsRes.data || [];
        const allExercises = exercisesRes.data || [];

        setStats({
          totalTests: allTests.length,
          publishedTests: allTests.filter(a => a.status === "published").length,
          draftTests: allTests.filter(a => a.status === "draft").length,
          totalExercises: allExercises.length,
          publishedExercises: allExercises.filter(e => e.status === "published").length,
          totalStudents: studentCountRes.count || 0,
          linkedStudents: linkedCountRes.count || 0,
          totalTeachers: teacherCountRes.count || 0,
          totalClasses: classCountRes.count || 0,
          recentResults7d: recentResultCountRes.count || 0,
          recentPractice7d: recentPracticeCountRes.count || 0,
        });

        const merged: RecentItem[] = [
          ...allTests.slice(0, 5).map(t => ({
            id: t.id, name: t.name, type: "test" as const,
            status: t.status, section_type: t.section_type, created_at: t.created_at,
          })),
          ...allExercises.slice(0, 5).map(e => ({
            id: e.id, name: e.title, type: "exercise" as const,
            status: e.status, skill: e.skill, created_at: e.created_at,
          })),
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8);

        setRecentItems(merged);

        const [trendResultsRes, trendPracticeRes] = await Promise.all([
          supabase.from("test_results").select("created_at").gte("created_at", fourteenDaysAgo),
          supabase.from("practice_results").select("created_at").gte("created_at", fourteenDaysAgo),
        ]);

        const days = eachDayOfInterval({ start: subDays(now, 13), end: now });
        const trend: DailyActivity[] = days.map(day => {
          const dateStr = format(day, "yyyy-MM-dd");
          const tests = (trendResultsRes.data || []).filter(r => typeof r.created_at === "string" && r.created_at.startsWith(dateStr)).length;
          const practices = (trendPracticeRes.data || []).filter(r => typeof r.created_at === "string" && r.created_at.startsWith(dateStr)).length;
          return {
            date: dateStr,
            label: format(day, "dd/MM", { locale: vi }),
            tests,
            practices,
          };
        });
        setActivityTrend(trend);

        const thirtyDaysAgo = subDays(now, 30).toISOString();
        const [analysisResultsRes, practiceAnalysisRes, prospectsRes] = await Promise.all([
          supabase
            .from("test_results")
            .select("user_id, section_type, answers, parts_data")
            .gte("created_at", thirtyDaysAgo),
          supabase
            .from("practice_results")
            .select("exercise_id, exercise_title, skill, question_type, correct_answers, total_questions")
            .gte("created_at", thirtyDaysAgo),
          supabase
            .from("prospects")
            .select("id, full_name, source, status, suggested_level, created_at, placement_test_id, token")
            .order("created_at", { ascending: false }),
        ]);

        setTestResultsForAnalysis(analysisResultsRes.data || []);
        setPracticeResultsForAnalysis(practiceAnalysisRes.data || []);
        setProspects(prospectsRes.data || []);
      } catch (error) {
        console.error("[AdminDashboardPage] Failed to load dashboard", error);
        setStats(null);
        setRecentItems([]);
        setActivityTrend([]);
        setTestResultsForAnalysis([]);
        setPracticeResultsForAnalysis([]);
        setProspects([]);
        setLoadError(error instanceof Error ? error.message : "Không tải được dữ liệu dashboard.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [isSuperAdmin]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loadError || !stats) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="rounded-xl border border-border bg-card p-5 md:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-2">
              <h1 className="font-display text-lg font-bold text-foreground">Dashboard tạm thời chưa tải được</h1>
              <p className="text-sm text-muted-foreground">
                {loadError || "Dữ liệu dashboard hiện chưa sẵn sàng. Bạn có thể thử tải lại trang."}
              </p>
              <Button onClick={() => window.location.reload()} size="sm">Thử lại</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const s = stats;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Tổng quan hệ thống Learning+ Admin Portal</p>
      </div>

      {/* ── Hero: KPI cards + Calendar + Performance chart + Recent ── */}
      <DashboardHero
        totalStudents={s.totalStudents}
        totalTeachers={s.totalTeachers}
        totalClasses={s.totalClasses}
        totalTests={s.totalTests}
        recentResults7d={s.recentResults7d}
        recentPractice7d={s.recentPractice7d}
        recentItems={recentItems.slice(0, 6).map((it) => ({
          id: it.id,
          name: it.name,
          meta: `${it.type === "test" ? "Đề thi" : "Bài tập"}${it.section_type ? ` · ${it.section_type}` : it.skill ? ` · ${it.skill}` : ""}`,
          badge: { label: it.status, tone: it.status === "published" ? "teal" : "coral" },
        }))}
      />

      {/* ── Today's Schedule Summary ── */}
      {todaySchedule && todaySchedule.count > 0 && (
        <button
          onClick={() => navigate("/schedule")}
          className="w-full rounded-xl border bg-card p-4 text-left hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm flex items-center gap-2">
                  Hôm nay · {todaySchedule.count} buổi học
                  {todaySchedule.conflicts > 0 && (
                    <span className="flex items-center gap-1 text-destructive text-xs font-medium">
                      <AlertTriangle className="h-3 w-3" />
                      {todaySchedule.conflicts} xung đột
                    </span>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {todaySchedule.firstTime && `Buổi đầu lúc ${todaySchedule.firstTime}`}
                </p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              Xem lịch <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </button>
      )}

      {/* ── Một bài tập KPI bổ sung (không có trong Hero) ── */}
      {s.totalExercises > 0 && (
        <button
          onClick={() => navigate("/tests?type=exercise")}
          className="w-full flex items-center gap-3 rounded-xl border bg-card p-4 text-left hover:bg-muted/50 transition-colors"
        >
          <div className="h-10 w-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
            <Layers className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-display font-bold text-sm">
              {s.totalExercises} bài tập · {s.publishedExercises} đã published
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Quản lý bài luyện tập theo kỹ năng</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      {/* ── Trạng thái 2 app (IELTS Practice + Teacher's Hub) ── */}
      <AppsStatusWidget />

      {/* ── Hoạt động giáo viên (realtime feed) ── */}
      <TeacherActivityFeed />

      {/* ── HR Contracts: trạng thái ký + sắp hết hạn ── */}
      <ContractStatusWidget />

      {/* ── Bảng công: kỳ chờ duyệt / chờ khoá / đã khoá ── */}
      <TimesheetStatusWidget />

      {/* ── Bảng lương: payslip nháp / chờ TT / đã TT ── */}
      <PayrollStatusWidget />

      {/* ── Activity Trend Chart ── */}
      {activityTrend.some(d => d.tests > 0 || d.practices > 0) && (
        <div className="rounded-xl border bg-card p-4">
          <h2 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5" />
            Xu hướng hoạt động (14 ngày)
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={activityTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradTests" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradPractice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
              />
              <Area
                type="monotone"
                dataKey="tests"
                name="Bài thi"
                stroke="hsl(var(--primary))"
                fill="url(#gradTests)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="practices"
                name="Bài luyện tập"
                stroke="hsl(142 71% 45%)"
                fill="url(#gradPractice)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Overall Progress Summary ── */}
      <TeacherProgressSummary />

      {/* ── Login Streak Calendar ── */}
      <AdminActivityCalendar />

      {/* ── Question Type Error Analysis ── */}
      <ClassQuestionTypeStats results={testResultsForAnalysis} />

      {/* ── Practice Exercise Error Stats ── */}
      <PracticeErrorStats results={practiceResultsForAnalysis} />

      {/* ── Prospect Funnel ── */}
      <ProspectFunnel prospects={prospects} navigate={navigate} />

      {/* ── Content Analytics ── */}
      <ContentAnalytics />

      {/* ── Quick Actions (single column, gọn) ── */}
      <div>
        <h2 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Thao tác nhanh
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <QuickAction icon={PenLine} label="Tạo đề thi" desc="Tạo mới với câu hỏi IELTS" onClick={() => navigate("/tests/new")} />
          <QuickAction icon={Upload} label="Import đề" desc="Từ file Word/PDF" onClick={() => navigate("/tests/import")} />
          <QuickAction icon={ListChecks} label="Tạo bài tập" desc="Luyện tập theo kỹ năng" onClick={() => navigate("/tests?type=exercise")} />
          <QuickAction icon={UserPlus} label="Quản lý người dùng" desc="Học viên, giáo viên, tài khoản" onClick={() => navigate("/users")} />
          <QuickAction icon={Award} label="Huy hiệu" desc="Trao huy hiệu cho học viên" onClick={() => navigate("/badges")} />
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, desc, onClick }: {
  icon: any; label: string; desc: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 bg-card rounded-xl border px-4 py-3 text-left hover:border-primary/30 hover:shadow-sm transition-all group">
      <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-primary shrink-0 group-hover:bg-primary/10 transition-colors">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
    </button>
  );
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Chờ",
  testing: "Đang làm",
  completed: "Hoàn thành",
  enrolled: "Đăng ký",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  testing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  enrolled: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const SOURCE_COLORS = [
  "hsl(var(--primary))", "hsl(142 71% 45%)", "hsl(38 92% 50%)",
  "hsl(262 83% 58%)", "hsl(0 84% 60%)", "hsl(199 89% 48%)",
];

function ProspectFunnel({ prospects, navigate }: { prospects: any[]; navigate: (path: string) => void }) {
  const total = prospects.length;
  const testing = prospects.filter(p => p.status === "testing" || p.status === "completed" || p.status === "enrolled").length;
  const completed = prospects.filter(p => p.status === "completed" || p.status === "enrolled").length;
  const enrolled = prospects.filter(p => p.status === "enrolled").length;

  const funnel = [
    { label: "Link gửi", count: total, pct: 100 },
    { label: "Làm test", count: testing, pct: total > 0 ? Math.round((testing / total) * 100) : 0 },
    { label: "Hoàn thành", count: completed, pct: total > 0 ? Math.round((completed / total) * 100) : 0 },
    { label: "Đăng ký", count: enrolled, pct: total > 0 ? Math.round((enrolled / total) * 100) : 0 },
  ];

  // Source breakdown
  const sourceMap: Record<string, number> = {};
  for (const p of prospects) {
    const src = p.source || "Khác";
    sourceMap[src] = (sourceMap[src] || 0) + 1;
  }
  const sourceData = Object.entries(sourceMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  // Conversion by placement test
  const testMap: Record<string, { name: string; total: number; enrolled: number }> = {};
  for (const p of prospects) {
    if (!p.placement_test_id) continue;
    if (!testMap[p.placement_test_id]) testMap[p.placement_test_id] = { name: p.placement_test_id.slice(0, 8), total: 0, enrolled: 0 };
    testMap[p.placement_test_id].total++;
    if (p.status === "enrolled") testMap[p.placement_test_id].enrolled++;
  }

  const recent = prospects.slice(0, 8);

  if (total === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <UserSearch className="h-3.5 w-3.5" /> Tuyển sinh
        </h2>
        <button
          onClick={() => navigate("/placement")}
          className="text-xs text-primary hover:underline flex items-center gap-0.5"
        >
          Placement Tests <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* Funnel */}
      <div className="grid grid-cols-4 gap-2">
        {funnel.map((step, i) => (
          <div key={step.label} className="text-center">
            <div className={cn(
              "rounded-lg py-3 px-2 border transition-all",
              i === 0 ? "bg-primary/10 border-primary/20" :
              i === funnel.length - 1 ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800" :
              "bg-muted/50"
            )}>
              <p className="text-xl md:text-2xl font-bold">{step.count}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">{step.label}</p>
            </div>
            {i > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">{step.pct}%</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Source Chart */}
        {sourceData.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground mb-2">Nguồn</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={sourceData} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={80}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="value" name="Số lượng" radius={[0, 4, 4, 0]}>
                  {sourceData.map((_, i) => (
                    <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent Prospects Table */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground mb-2">Gần đây</h3>
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {recent.map(p => (
              <div
                key={p.id}
                className="flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg hover:bg-muted/50 cursor-pointer"
                onClick={() => navigate("/placement")}
              >
                <span className="flex-1 truncate font-medium">{p.full_name}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{p.source}</span>
                <Badge variant="secondary" className={cn("text-[10px] shrink-0", STATUS_COLORS[p.status] || "")}>
                  {STATUS_LABELS[p.status] || p.status}
                </Badge>
                {p.suggested_level && (
                  <span className="text-[10px] text-muted-foreground shrink-0">{p.suggested_level}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
