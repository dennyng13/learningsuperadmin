import { useEffect, useState, useMemo } from "react";
import mascotHero from "@/assets/mascot-hero.png";
import {
  FileText, Layers,
  Upload, BarChart3, UserPlus, Award,
  ArrowRight, PenLine, ListChecks, UserSearch, ChevronRight, CalendarDays, AlertTriangle,
  Sparkles, Waves, Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import { format, eachDayOfInterval } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@shared/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar, Cell,
} from "recharts";
import { Badge } from "@shared/components/ui/badge";
import { HeroBoard } from "@shared/components/ui/hero-board";
import { PopCard } from "@shared/components/ui/pop-card";
import { PopButton } from "@shared/components/ui/pop-button";
import { PopChip } from "@shared/components/ui/pop-chip";
import { StatusBadge } from "@shared/components/ui/status-badge";
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
import {
  DashboardHeroSkeleton,
  TodayScheduleSkeleton,
  AnalyticsSectionSkeleton,
} from "@admin/features/dashboard/components/DashboardSkeletons";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@shared/components/ui/button";
import {
  AnalyticsRangeProvider,
  AnalyticsRangeSelector,
  useAnalyticsRange,
  rangeDays,
  type AnalyticsRange,
} from "@shared/components/dashboard/analyticsRange";

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
  return (
    <AnalyticsRangeProvider>
      <AdminDashboardPageInner />
    </AnalyticsRangeProvider>
  );
}

function AdminDashboardPageInner() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const { range } = useAnalyticsRange();
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
      const { data: classes } = await (supabase as any)
        .from("classes")
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
        const sinceIso = range.from.toISOString();
        const untilIso = range.to.toISOString();
        const days = eachDayOfInterval({ start: range.from, end: range.to });

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
          // "Total Students" = số user có role='user' trong `user_roles`.
          // Enum `app_role` không có 'student'; learners được lưu dưới role='user'
          // (admin/super_admin/teacher là các role riêng — phần còn lại = học viên).
          supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "user"),
          (supabase as any).from("synced_students" as any).select("*", { count: "exact", head: true }).not("linked_user_id", "is", null),
          supabase.from("teachers").select("*", { count: "exact", head: true }),
          (supabase as any).from("classes" as any).select("*", { count: "exact", head: true }),
          supabase.from("test_results").select("*", { count: "exact", head: true }).gte("created_at", sinceIso).lte("created_at", untilIso),
          supabase.from("practice_results").select("*", { count: "exact", head: true }).gte("created_at", sinceIso).lte("created_at", untilIso),
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
          supabase.from("test_results").select("created_at").gte("created_at", sinceIso).lte("created_at", untilIso),
          supabase.from("practice_results").select("created_at").gte("created_at", sinceIso).lte("created_at", untilIso),
        ]);

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

        const [analysisResultsRes, practiceAnalysisRes, prospectsRes] = await Promise.all([
          supabase
            .from("test_results")
            .select("user_id, section_type, answers, parts_data")
            .gte("created_at", sinceIso)
            .lte("created_at", untilIso),
          supabase
            .from("practice_results")
            .select("exercise_id, exercise_title, skill, question_type, correct_answers, total_questions")
            .gte("created_at", sinceIso)
            .lte("created_at", untilIso),
          supabase
            .from("prospects")
            .select("id, full_name, source, status, suggested_level, created_at, placement_test_id, token")
            .gte("created_at", sinceIso)
            .lte("created_at", untilIso)
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
  }, [isSuperAdmin, range.from, range.to]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <HeroBoard
          tone="cream"
          title="Dashboard"
          subtitle="Tổng quan hệ thống Learning+ Admin Portal"
          illustration={<Sparkles className="size-20 text-lp-teal animate-bob" strokeWidth={1.75} />}
        />
        <DashboardHeroSkeleton />
        <TodayScheduleSkeleton />
        <AnalyticsSectionSkeleton />
      </div>
    );
  }

  if (loadError || !stats) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <PopCard tone="white" shadow="md" className="p-5 md:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pop bg-lp-coral/15 text-lp-coral border-[2px] border-lp-coral">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-2">
              <h1 className="font-display text-lg font-extrabold text-lp-ink">Dashboard tạm thời chưa tải được</h1>
              <p className="text-sm text-lp-body">
                {loadError || "Dữ liệu dashboard hiện chưa sẵn sàng. Bạn có thể thử tải lại trang."}
              </p>
              <PopButton tone="coral" size="sm" onClick={() => window.location.reload()}>Thử lại</PopButton>
            </div>
          </div>
        </PopCard>
      </div>
    );
  }

  const s = stats;
  const todayLabel = format(new Date(), "EEEE, d MMMM yyyy").toUpperCase();

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <HeroBoard
        tone="teal"
        title={
          <>
            <span className="block text-[11px] tracking-[0.18em] font-display font-bold text-white/70 uppercase mb-2">
              Dashboard · {todayLabel}
            </span>
            <span className="block">Mọi chuyến đi đều</span>
            <span className="inline-flex items-center flex-wrap gap-2 mt-1">
              <span className="inline-block bg-lp-yellow text-lp-ink border-[2.5px] border-lp-ink rounded-pop px-3 py-0.5 leading-tight">
                an toàn cập bến
              </span>
              <span>hôm nay</span>
              <Waves className="size-7 text-white inline-block" strokeWidth={2.5} />
            </span>
          </>
        }
        subtitle={
          <>
            {s.totalStudents.toLocaleString("vi-VN")} học viên đang lướt sóng cùng Learning Plus.
            {" "}
            {s.totalClasses} lớp đang vận hành.
          </>
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <PopButton tone="ink" size="md" onClick={() => navigate("/classes/list?action=create")}>
              <Plus className="size-4" />
              <span>Tạo lớp mới</span>
            </PopButton>
            <PopButton tone="white" size="md" onClick={() => navigate("/tests/import")}>
              <Upload className="size-4" />
              <span>Import đề thi</span>
            </PopButton>
            <PopButton tone="yellow" size="md" onClick={() => navigate("/insights")}>
              <Sparkles className="size-4" />
              <span>AI Insights</span>
            </PopButton>
          </div>
        }
        illustration={
          <img
            src={mascotHero}
            alt="Max mascot"
            className="size-40 object-contain animate-bob drop-shadow-[3px_3px_0_var(--lp-ink)]"
            loading="eager"
            decoding="async"
          />
        }
      />


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

      {/* ╔══════════ 2. LỊCH HÔM NAY ══════════╗
         Tóm tắt buổi học hôm nay + KPI bài tập (chưa có trong Hero) */}
      <section className="space-y-3">
        <h2 className="font-display text-sm font-extrabold text-lp-body uppercase tracking-[0.12em] flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5" /> Lịch hôm nay
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-fr">
          {/* Card 1: Today's schedule */}
          {(() => {
            const hasSchedule = !!todaySchedule && todaySchedule.count > 0;
            const hasConflicts = hasSchedule && (todaySchedule?.conflicts ?? 0) > 0;
            return (
              <PopCard tone="white" shadow="sm" hover="lift" className="h-full p-4 flex flex-col">
                <div className="flex items-start gap-3 flex-1">
                  <div className={cn(
                    "h-10 w-10 rounded-pop flex items-center justify-center shrink-0 border-[2px] border-lp-ink",
                    hasSchedule ? "bg-lp-teal text-white" : "bg-lp-cream text-lp-body",
                  )}>
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-extrabold text-sm text-lp-ink">
                      {hasSchedule ? `${todaySchedule!.count} buổi học hôm nay` : "Không có buổi học hôm nay"}
                    </h3>
                    <p className="text-xs text-lp-body mt-0.5">
                      {hasSchedule
                        ? (todaySchedule!.firstTime ? `Buổi đầu lúc ${todaySchedule!.firstTime}` : "Chưa có giờ cụ thể")
                        : "Lịch trống — hãy nghỉ ngơi"}
                    </p>
                    {hasSchedule && (
                      <div className="flex items-center flex-wrap gap-1.5 mt-2">
                        <PopChip tone="cream">{todaySchedule!.count} buổi</PopChip>
                        {todaySchedule!.firstTime && (
                          <PopChip tone="sky">Bắt đầu {todaySchedule!.firstTime}</PopChip>
                        )}
                        {hasConflicts && (
                          <StatusBadge status="error" label={`${todaySchedule!.conflicts} xung đột`} />
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t-2 border-lp-ink/10 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => navigate("/schedule")}
                    className="h-8 px-2 text-xs gap-1 font-display font-bold text-lp-teal hover:text-lp-teal-deep hover:underline flex items-center"
                  >
                    Xem lịch
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </PopCard>
            );
          })()}

          {/* Card 2: Exercises summary */}
          {s.totalExercises > 0 && (
            <PopCard tone="white" shadow="sm" hover="lift" className="h-full p-4 flex flex-col">
              <div className="flex items-start gap-3 flex-1">
                <div className="h-10 w-10 rounded-pop bg-lp-coral text-white flex items-center justify-center shrink-0 border-[2px] border-lp-ink">
                  <Layers className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-extrabold text-sm text-lp-ink">
                    {s.totalExercises} bài tập
                  </h3>
                  <p className="text-xs text-lp-body mt-0.5">
                    Quản lý bài luyện tập theo kỹ năng
                  </p>
                  <div className="flex items-center flex-wrap gap-1.5 mt-2">
                    <PopChip tone="teal">{s.publishedExercises} published</PopChip>
                    {s.totalExercises - s.publishedExercises > 0 && (
                      <PopChip tone="cream">{s.totalExercises - s.publishedExercises} draft</PopChip>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t-2 border-lp-ink/10 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => navigate("/tests?type=exercise")}
                  className="h-8 px-2 text-xs gap-1 font-display font-bold text-lp-teal hover:text-lp-teal-deep hover:underline flex items-center"
                >
                  Xem bài tập
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </PopCard>
          )}
        </div>
      </section>

      {/* ╔══════════ 3. ANALYTICS ══════════╗
         Toàn bộ widget phân tích, vận hành & nội dung */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-display text-sm font-extrabold text-lp-body uppercase tracking-[0.12em] flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5" /> Analytics & vận hành
          </h2>
          <AnalyticsRangeSelector />
        </div>

        {/* Operations: 2 app + activity feed */}
        <AppsStatusWidget />
        <TeacherActivityFeed range={range} />

        {/* HR & Payroll */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ContractStatusWidget />
          <TimesheetStatusWidget />
          <PayrollStatusWidget />
        </div>

        {/* Activity Trend Chart */}
        {activityTrend.some(d => d.tests > 0 || d.practices > 0) && (
        <PopCard tone="white" shadow="sm" className="p-4">
          <h2 className="font-display text-sm font-extrabold text-lp-body uppercase tracking-wider mb-4 flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5" />
            Xu hướng hoạt động ({rangeDays(range)} ngày)
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
        </PopCard>
        )}

        {/* Progress & login streak */}
        <TeacherProgressSummary />
        <AdminActivityCalendar />

        {/* Error analysis */}
        <ClassQuestionTypeStats results={testResultsForAnalysis} range={range} />
        <PracticeErrorStats results={practiceResultsForAnalysis} range={range} />

        {/* Prospects & content */}
        <ProspectFunnel prospects={prospects} navigate={navigate} />
        <ContentAnalytics range={range} />
      </section>

      {/* ╔══════════ 4. QUICK ACTIONS ══════════╗ */}
      <section>
        <h2 className="font-display text-sm font-extrabold text-lp-body uppercase tracking-[0.12em] mb-3 flex items-center gap-2">
          <ArrowRight className="h-3.5 w-3.5" /> Thao tác nhanh
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <QuickAction icon={PenLine} label="Tạo đề thi" desc="Tạo mới với câu hỏi IELTS" onClick={() => navigate("/tests/new")} />
          <QuickAction icon={Upload} label="Import đề" desc="Từ file Word/PDF" onClick={() => navigate("/tests/import")} />
          <QuickAction icon={ListChecks} label="Tạo bài tập" desc="Luyện tập theo kỹ năng" onClick={() => navigate("/tests?type=exercise")} />
          <QuickAction icon={UserPlus} label="Quản lý người dùng" desc="Học viên, giáo viên, tài khoản" onClick={() => navigate("/users")} />
          <QuickAction icon={Award} label="Huy hiệu" desc="Trao huy hiệu cho học viên" onClick={() => navigate("/badges")} />
        </div>
      </section>
    </div>
  );
}

function QuickAction({ icon: Icon, label, desc, onClick }: {
  icon: any; label: string; desc: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group w-full flex items-center gap-3 px-4 py-3 text-left",
        "bg-white border-[2px] border-lp-ink rounded-pop shadow-pop-xs",
        "transition-all duration-150 ease-bounce",
        "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pop-sm",
        "active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      )}
    >
      <div className="w-9 h-9 rounded-pop bg-lp-teal text-white flex items-center justify-center shrink-0 border-[2px] border-lp-ink">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display text-sm font-bold text-lp-ink">{label}</p>
        <p className="text-[11px] text-lp-body">{desc}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-lp-ink/30 group-hover:text-lp-coral transition-colors shrink-0" />
    </button>
  );
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Chờ",
  testing: "Đang làm",
  completed: "Hoàn thành",
  enrolled: "Đăng ký",
};

const PROSPECT_STATUS_MAP: Record<string, "pending" | "info" | "warning" | "success"> = {
  pending:   "pending",
  testing:   "info",
  completed: "warning",
  enrolled:  "success",
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
    <PopCard tone="white" shadow="sm" className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-extrabold text-lp-body uppercase tracking-wider flex items-center gap-2">
          <UserSearch className="h-3.5 w-3.5" /> Tuyển sinh
        </h2>
        <button
          onClick={() => navigate("/placement")}
          className="text-xs text-lp-teal font-display font-bold hover:text-lp-teal-deep hover:underline flex items-center gap-0.5"
        >
          Placement Tests <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* Funnel */}
      <div className="grid grid-cols-4 gap-2">
        {funnel.map((step, i) => (
          <div key={step.label} className="text-center">
            <div className={cn(
              "rounded-pop py-3 px-2 border-[2px] border-lp-ink transition-all",
              i === 0 ? "bg-lp-teal/15" :
              i === funnel.length - 1 ? "bg-lp-mint/15" :
              "bg-lp-cream",
            )}>
              <p className="font-display text-xl md:text-2xl font-extrabold text-lp-ink">{step.count}</p>
              <p className="text-[10px] md:text-xs text-lp-body mt-0.5">{step.label}</p>
            </div>
            {i > 0 && (
              <p className="text-[10px] font-display font-bold text-lp-body mt-1">{step.pct}%</p>
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
          <h3 className="text-xs font-display font-bold text-lp-body uppercase tracking-wider mb-2">Gần đây</h3>
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {recent.map(p => (
              <div
                key={p.id}
                className="flex items-center gap-2 text-sm px-2 py-1.5 rounded-pop hover:bg-lp-yellow/20 cursor-pointer transition-colors"
                onClick={() => navigate("/placement")}
              >
                <span className="flex-1 truncate font-medium text-lp-ink">{p.full_name}</span>
                <span className="text-[10px] text-lp-body shrink-0">{p.source}</span>
                <StatusBadge
                  status={PROSPECT_STATUS_MAP[p.status] ?? "pending"}
                  label={STATUS_LABELS[p.status] || p.status}
                />
                {p.suggested_level && (
                  <span className="text-[10px] text-lp-body shrink-0">{p.suggested_level}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </PopCard>
  );
}
