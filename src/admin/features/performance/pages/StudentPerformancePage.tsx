import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import {
  Loader2, ArrowLeft, PenLine, Mic, TrendingUp,
  BarChart3, Clock, CheckCircle2, Award, Calendar, Flame, Target,
  ChevronRight, Trophy, Zap, AlertTriangle, Play, Pause, Download, FileText,
  BookMarked, MessageSquare, Receipt, GraduationCap,
} from "lucide-react";
import SpeakingGrader from "@shared/components/grading/SpeakingGrader";
import WritingReview from "@shared/components/grading/WritingReview";
import StudentStudyPlanActivity from "@shared/components/teacher-shared/StudentStudyPlanActivity";
import StudentProgressCard from "@shared/components/teacher-shared/StudentProgressCard";
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, BarChart, Bar, Area, AreaChart,
} from "recharts";
import { cn } from "@shared/lib/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@shared/components/ui/select";
import { subDays, isAfter, parseISO } from "date-fns";
import { formatTimeVi, formatMinutes } from "@shared/utils/formatTime";
import { QUESTION_TYPE_LABELS_VI, analyzeAllQuestionTypes, analyzeWeakQuestionTypes, type WeakQuestionType } from "@shared/utils/questionTypes";
import { SKILL_TABS } from "@shared/utils/skillColors";
import ScoreRing from "@shared/components/ui/score-ring";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@shared/components/ui/tabs";
import LifetimeOverview from "@shared/components/performance/LifetimeOverview";
import CourseGradeView from "@shared/components/performance/CourseGradeView";
import StudentNotesPanel from "@shared/components/performance/StudentNotesPanel";

const DATE_RANGES = [
  { value: "all", label: "Tất cả" },
  { value: "7", label: "7 ngày" },
  { value: "14", label: "14 ngày" },
  { value: "30", label: "30 ngày" },
  { value: "90", label: "3 tháng" },
  { value: "180", label: "6 tháng" },
];

interface TestResultRow {
  id: string;
  assessment_name: string;
  section_type: string;
  score: number | null;
  correct_answers: number | null;
  total_questions: number | null;
  time_spent: number;
  created_at: string;
  book_name: string | null;
  answers: Record<string, string> | null;
  parts_data: any[] | null;
  speaking_parts: any[] | null;
}

interface ActivityRow {
  activity_date: string;
  reading: number;
  listening: number;
  writing: number;
  speaking: number;
  time_minutes: number;
}

interface BadgeRow {
  id: string;
  awarded_at: string;
  badge: { name: string; icon: string | null; tier: string; image_url: string | null } | null;
}

interface PracticeResultRow {
  id: string;
  exercise_title: string;
  skill: string;
  answers: any;
  created_at: string;
  time_spent: number;
}

// SKILL_TABS, QUESTION_TYPE_LABELS_VI, analyzeAllQuestionTypes, analyzeWeakQuestionTypes,
// formatTimeVi, formatMinutes, and ScoreRing are now imported from shared utilities.

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(-2).map(w => w[0]).join("").toUpperCase();
}

export default function StudentPerformancePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [results, setResults] = useState<TestResultRow[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [activeSkill, setActiveSkill] = useState("reading");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [practiceResults, setPracticeResults] = useState<PracticeResultRow[]>([]);
  const [dateRange, setDateRange] = useState("all");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // New enriched data
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [studentQuestions, setStudentQuestions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [classEnrollments, setClassEnrollments] = useState<any[]>([]);
  const [allPracticeResults, setAllPracticeResults] = useState<any[]>([]);
  const [teachngoStudentId, setTeachngoStudentId] = useState<string | null>(null);

  // Filter data by date range
  const cutoffDate = dateRange === "all" ? null : subDays(new Date(), parseInt(dateRange));
  const filteredResults = useMemo(() => {
    if (!cutoffDate) return results;
    return results.filter(r => isAfter(parseISO(r.created_at), cutoffDate));
  }, [results, dateRange]);
  const filteredActivities = useMemo(() => {
    if (!cutoffDate) return activities;
    return activities.filter(a => isAfter(parseISO(a.activity_date), cutoffDate));
  }, [activities, dateRange]);

  const togglePlay = (id: string, url: string) => {
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(url);
      audio.onended = () => setPlayingId(null);
      audio.play();
      audioRef.current = audio;
      setPlayingId(id);
    }
  };

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      setLoading(true);
      const [profileRes, resultsRes, activityRes, badgesRes, practiceRes, flashcardsRes, questionsRes, allPracticeRes] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", userId).single(),
        supabase.from("test_results").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("activity_log").select("*").eq("user_id", userId).order("activity_date", { ascending: false }).limit(90),
        supabase.from("user_badges").select("id, awarded_at, badge:badges(name, icon, tier, image_url)").eq("user_id", userId) as any,
        supabase.from("practice_results").select("id, exercise_title, skill, answers, created_at, time_spent").eq("user_id", userId).eq("skill", "speaking").order("created_at", { ascending: false }),
        supabase.from("flashcards").select("id, front, back, mastered, created_at").eq("user_id", userId),
        supabase.from("student_questions").select("id, title, status, created_at, response_at").eq("student_id", userId).order("created_at", { ascending: false }).limit(20),
        supabase.from("practice_results").select("id, exercise_title, skill, correct_answers, total_questions, score, time_spent, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
      ]);

      if (profileRes.data) setStudentName(profileRes.data.full_name || "Học viên");
      if (resultsRes.data) setResults(resultsRes.data as TestResultRow[]);
      if (activityRes.data) setActivities(activityRes.data as ActivityRow[]);
      if (badgesRes.data) setBadges(badgesRes.data as BadgeRow[]);
      if (practiceRes.data) setPracticeResults(practiceRes.data as PracticeResultRow[]);
      if (flashcardsRes.data) setFlashcards(flashcardsRes.data);
      if (questionsRes.data) setStudentQuestions(questionsRes.data);
      if (allPracticeRes.data) setAllPracticeResults(allPracticeRes.data);

      // Fetch teachngo student + payments + class enrollments
      const { data: tsData } = await supabase
        .from("teachngo_students" as any)
        .select("id, teachngo_id")
        .eq("linked_user_id", userId)
        .maybeSingle();

      if (tsData) {
        const tsId = (tsData as any).id;
        setTeachngoStudentId(tsId);
        const teachngoId = (tsData as any).teachngo_id;
        const [paymentsRes, enrollRes] = await Promise.all([
          supabase.from("student_payments").select("*").eq("student_id", tsId).order("payment_date", { ascending: false }),
          supabase.from("teachngo_class_students" as any).select("*, class:teachngo_classes(id, class_name, level, program, status, teacher_name)").eq("teachngo_student_id", teachngoId),
        ]);
        if (paymentsRes.data) setPayments(paymentsRes.data);
        if (enrollRes.data) setClassEnrollments(enrollRes.data as any[]);
      }

      setLoading(false);
    };

    fetchData();
  }, [userId]);

  const activeTab = SKILL_TABS.find(t => t.id === activeSkill)!;

  const skillResults = useMemo(
    () => filteredResults.filter(r => r.section_type === activeTab.sectionType),
    [filteredResults, activeTab]
  );

  const dashboardStats = useMemo(() => {
    const totalTests = filteredResults.length;
    const totalTimeSec = filteredResults.reduce((sum, r) => sum + (r.time_spent || 0), 0);
    const totalActivityMin = filteredActivities.reduce((sum, a) => sum + (a.time_minutes || 0), 0);
    const totalExercises = filteredActivities.reduce((sum, a) => sum + a.reading + a.listening + a.writing + a.speaking, 0);

    const sortedDates = [...new Set(filteredActivities.map(a => a.activity_date))].sort().reverse();
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < sortedDates.length; i++) {
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      const expectedStr = expected.toISOString().slice(0, 10);
      if (sortedDates[i] === expectedStr) streak++;
      else break;
    }

    const scoredResults = filteredResults.filter(r => r.score != null);
    const avgScore = scoredResults.length > 0
      ? Math.round(scoredResults.reduce((s, r) => s + Number(r.score), 0) / scoredResults.length * 10) / 10
      : null;

    return { totalTests, totalTimeSec, totalActivityMin, totalExercises, streak, avgScore, badgeCount: badges.length };
  }, [filteredResults, filteredActivities, badges]);

  const overviewStats = useMemo(() => {
    return SKILL_TABS.map(tab => {
      const skillRows = filteredResults.filter(r => r.section_type === tab.sectionType);
      const latest = skillRows[0];
      const avgScore = skillRows.length > 0
        ? skillRows.reduce((sum, r) => sum + (Number(r.score) || 0), 0) / skillRows.length
        : null;
      const prev = skillRows[1];
      const trend = latest?.score != null && prev?.score != null
        ? Number(latest.score) - Number(prev.score)
        : null;
      const weakTypes = analyzeWeakQuestionTypes(filteredResults, tab.sectionType);
      return {
        ...tab,
        count: skillRows.length,
        latestScore: latest?.score != null ? Number(latest.score) : null,
        avgScore: avgScore != null ? Math.round(avgScore * 10) / 10 : null,
        trend,
        weakTypes,
      };
    });
  }, [filteredResults]);

  const progressData = useMemo(() => {
    const reversed = [...skillResults].reverse();
    return reversed.map((r, i) => ({
      name: new Date(r.created_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
      score: Number(r.score) || 0,
      correct: r.correct_answers || 0,
      total: r.total_questions || 0,
    }));
  }, [skillResults]);

  const radarData = useMemo(() => {
    return overviewStats.map(s => ({
      skill: s.label,
      score: s.latestScore || 0,
      average: s.avgScore || 0,
    }));
  }, [overviewStats]);

  const weeklyActivity = useMemo(() => {
    const days: { label: string; date: string; minutes: number; exercises: number }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString("vi-VN", { weekday: "short", day: "numeric" });
      const act = filteredActivities.find(a => a.activity_date === dateStr);
      days.push({
        label: dayLabel,
        date: dateStr,
        minutes: act?.time_minutes || 0,
        exercises: act ? act.reading + act.listening + act.writing + act.speaking : 0,
      });
    }
    return days;
  }, [filteredActivities]);

  // Full question type analysis for active skill
  const questionTypeAnalysis = useMemo(
    () => analyzeAllQuestionTypes(filteredResults, activeTab.sectionType),
    [filteredResults, activeTab]
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-lg font-bold shrink-0 shadow-lg">
            {getInitials(studentName)}
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-xl md:text-2xl font-extrabold truncate">{studentName}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Tổng quan hoạt động và kết quả học tập
            </p>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[130px] h-9 text-xs">
                <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="hidden md:flex items-center gap-4">
            {dashboardStats.avgScore != null && (
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Điểm TB</p>
                <p className="text-3xl font-black text-primary">{dashboardStats.avgScore}</p>
              </div>
            )}
            {dashboardStats.streak > 0 && (
              <div className="text-center px-4 border-l">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Streak</p>
                <p className="text-3xl font-black text-orange-500 flex items-center gap-1">
                  <Flame className="h-5 w-5" />{dashboardStats.streak}
                </p>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="lifetime" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="lifetime">Toàn thời gian</TabsTrigger>
          <TabsTrigger value="course">Lớp hiện tại</TabsTrigger>
          <TabsTrigger value="notes">Ghi chú</TabsTrigger>
          <TabsTrigger value="details">Chi tiết kỹ năng</TabsTrigger>
        </TabsList>

        <TabsContent value="lifetime" className="space-y-4">
          {userId && <LifetimeOverview userId={userId} />}
        </TabsContent>

        <TabsContent value="course" className="space-y-4">
          {userId && <CourseGradeView userId={userId} />}
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          {userId && <StudentNotesPanel studentId={userId} mode="staff" />}
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {[
          { label: "Bài thi", value: dashboardStats.totalTests, icon: CheckCircle2, color: "text-primary bg-primary/10" },
          { label: "Thời gian thi", value: formatTimeVi(dashboardStats.totalTimeSec), icon: Clock, color: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-950/40" },
          { label: "Bài tập", value: dashboardStats.totalExercises, icon: Zap, color: "text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/40" },
          { label: "Thời gian học", value: formatMinutes(dashboardStats.totalActivityMin), icon: Calendar, color: "text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-950/40" },
          { label: "Huy hiệu", value: dashboardStats.badgeCount, icon: Trophy, color: "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-950/40" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border bg-card p-3 flex items-center gap-3">
            <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", s.color)}>
              <s.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-tight truncate">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Student Progress Card */}
      {userId && <StudentProgressCard userId={userId} />}

      {/* Skill Score Cards */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Kỹ năng</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {overviewStats.map(s => {
            const Icon = s.icon;
            const isActive = activeSkill === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSkill(s.id)}
                className={cn(
                  "group relative rounded-2xl p-4 text-left transition-all duration-200 border overflow-hidden",
                  isActive
                    ? `ring-2 ${s.ring} ${s.bg} border-transparent shadow-md`
                    : "border-border bg-card hover:shadow-sm"
                )}
              >
                {/* Gradient accent bar */}
                <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", s.gradient, isActive ? "opacity-100" : "opacity-0 group-hover:opacity-50 transition-opacity")} />

                <div className="flex items-center justify-between mb-3">
                  <div className={cn("flex items-center gap-2", isActive ? s.text : "text-muted-foreground")}>
                    <Icon className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">{s.label}</span>
                  </div>
                  {s.trend != null && s.trend !== 0 && (
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                      s.trend > 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                    )}>
                      {s.trend > 0 ? "+" : ""}{s.trend}
                    </span>
                  )}
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <p className={cn("text-3xl font-black leading-none", isActive ? s.text : "text-foreground")}>
                      {s.latestScore != null ? s.latestScore : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      {s.avgScore != null ? `TB: ${s.avgScore}` : "Chưa thi"} · {s.count} bài
                    </p>
                  </div>
                  <ScoreRing score={s.latestScore} size={48} strokeWidth={4} />
                </div>

                {/* Weak question types */}
                {s.weakTypes.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5">
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Dạng câu yếu
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {s.weakTypes.map(w => (
                        <span
                          key={w.type}
                          className={cn(
                            "inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md",
                            w.wrongRate >= 0.7
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              : w.wrongRate >= 0.5
                              ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          )}
                          title={`Sai ${w.wrongCount}/${w.totalCount} (${Math.round(w.wrongRate * 100)}%)`}
                        >
                          {w.label}
                          <span className="opacity-70">{Math.round(w.wrongRate * 100)}%</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Radar */}
        <div className="rounded-2xl border p-5 bg-card">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
            </div>
            Tổng quan kỹ năng
          </h3>
          {radarData.some(d => d.score > 0) ? (
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <PolarRadiusAxis domain={[0, 9]} tick={{ fontSize: 9 }} axisLine={false} />
                <Radar name="Mới nhất" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
                <Radar name="Trung bình" dataKey="average" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.08} strokeWidth={1.5} strokeDasharray="4 3" />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[240px] text-muted-foreground">
              <BarChart3 className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Chưa có dữ liệu</p>
            </div>
          )}
        </div>

        {/* Progress Area */}
        <div className="rounded-2xl border p-5 bg-card">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", activeTab.bg)}>
              <TrendingUp className={cn("h-3.5 w-3.5", activeTab.text)} />
            </div>
            Tiến trình {activeTab.label}
          </h3>
          {progressData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={progressData}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 9]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid hsl(var(--border))",
                    boxShadow: "0 4px 12px hsl(var(--foreground) / 0.08)",
                    fontSize: "12px",
                  }}
                />
                <Area type="monotone" dataKey="score" name="Điểm" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#scoreGradient)" dot={{ r: 4, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[240px] text-muted-foreground">
              <TrendingUp className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Chưa có dữ liệu</p>
            </div>
          )}
        </div>

        {/* Weekly Activity */}
        <div className="rounded-2xl border p-5 bg-card">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
              <Calendar className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
            </div>
            Hoạt động 7 ngày
          </h3>
          {weeklyActivity.some(d => d.minutes > 0) ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={weeklyActivity} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value: number, name: string) => [name === "minutes" ? `${value} phút` : value, name === "minutes" ? "Thời gian" : "Bài tập"]}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid hsl(var(--border))",
                    boxShadow: "0 4px 12px hsl(var(--foreground) / 0.08)",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="minutes" name="Phút" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[240px] text-muted-foreground">
              <Calendar className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Chưa có hoạt động</p>
            </div>
          )}
        </div>
      </div>

      {/* Question Type Analysis */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", activeTab.bg)}>
              <AlertTriangle className={cn("h-3.5 w-3.5", activeTab.text)} />
            </div>
            Phân tích dạng câu hỏi — {activeTab.label}
          </h3>
          {questionTypeAnalysis.length > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {questionTypeAnalysis.reduce((s, q) => s + q.totalCount, 0)} câu đã phân tích
            </span>
          )}
        </div>

        {questionTypeAnalysis.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm">Chưa có dữ liệu câu trả lời để phân tích</p>
            <p className="text-[11px] mt-1 max-w-sm text-center">Dữ liệu sẽ xuất hiện sau khi học viên hoàn thành bài thi có lưu câu trả lời</p>
          </div>
        ) : (
          <div className="p-5 space-y-3">
            {questionTypeAnalysis.map(q => {
              const correctRate = 1 - q.wrongRate;
              const correctCount = q.totalCount - q.wrongCount;
              return (
                <div key={q.type} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{q.label}</span>
                      {q.wrongRate >= 0.7 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          Yếu
                        </span>
                      )}
                      {q.wrongRate >= 0.5 && q.wrongRate < 0.7 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                          Cần cải thiện
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{correctCount} đúng</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-red-600 dark:text-red-400 font-semibold">{q.wrongCount} sai</span>
                      <span className="text-muted-foreground text-[10px]">({q.totalCount} câu)</span>
                    </div>
                  </div>
                  {/* Stacked bar */}
                  <div className="flex h-3 rounded-full overflow-hidden bg-muted/40">
                    <div
                      className="bg-emerald-500 dark:bg-emerald-600 transition-all duration-500 rounded-l-full"
                      style={{ width: `${correctRate * 100}%` }}
                      title={`Đúng: ${Math.round(correctRate * 100)}%`}
                    />
                    <div
                      className={cn(
                        "transition-all duration-500 rounded-r-full",
                        q.wrongRate >= 0.7 ? "bg-red-500 dark:bg-red-600" : q.wrongRate >= 0.5 ? "bg-orange-500 dark:bg-orange-600" : "bg-red-400 dark:bg-red-500"
                      )}
                      style={{ width: `${q.wrongRate * 100}%` }}
                      title={`Sai: ${Math.round(q.wrongRate * 100)}%`}
                    />
                  </div>
                </div>
              );
            })}

            {/* Summary */}
            <div className="pt-3 mt-3 border-t flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Tổng: {questionTypeAnalysis.length} dạng câu hỏi</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Đúng
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-500 inline-block" /> Sai
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="rounded-2xl border p-5 bg-card">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
              <Trophy className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            Huy hiệu ({badges.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {badges.map(b => {
              const tierColor = b.badge?.tier === "gold" ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20"
                : b.badge?.tier === "silver" ? "border-gray-300 bg-gray-50 dark:bg-gray-900/30"
                : b.badge?.tier === "bronze" ? "border-orange-300 bg-orange-50 dark:bg-orange-950/20"
                : "border-border bg-muted/30";
              return (
                <div key={b.id} className={cn("flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 transition-colors hover:shadow-sm", tierColor)}>
                  {b.badge?.image_url ? (
                    <img src={b.badge.image_url} alt="" className="h-7 w-7 rounded-lg object-cover" />
                  ) : (
                    <div className="h-7 w-7 rounded-lg bg-amber-200/50 dark:bg-amber-800/30 flex items-center justify-center">
                      <Award className="h-4 w-4 text-amber-600" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold">{b.badge?.name || "Huy hiệu"}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(b.awarded_at).toLocaleDateString("vi-VN")}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Practice Analytics */}
      {allPracticeResults.length > 0 && (
        <div className="rounded-2xl border p-5 bg-card">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            Kết quả luyện tập ({allPracticeResults.length} bài)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {SKILL_TABS.map(sk => {
              const skResults = allPracticeResults.filter((r: any) => r.skill?.toLowerCase() === sk.id);
              const avg = skResults.length > 0
                ? Math.round(skResults.reduce((s: number, r: any) => s + (r.correct_answers || 0) / Math.max(r.total_questions || 1, 1), 0) / skResults.length * 100)
                : null;
              return (
                <div key={sk.id} className={cn("rounded-xl p-3 border", sk.bg)}>
                  <p className={cn("text-[10px] font-bold uppercase tracking-wider", sk.text)}>{sk.label}</p>
                  <p className="text-lg font-black">{skResults.length} <span className="text-xs font-normal text-muted-foreground">bài</span></p>
                  {avg != null && <p className="text-[11px] text-muted-foreground">TB: {avg}%</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vocabulary / Flashcards */}
      {flashcards.length > 0 && (
        <div className="rounded-2xl border p-5 bg-card">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center">
              <BookMarked className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            Từ vựng & Flashcard
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-black text-foreground">{flashcards.length}</p>
              <p className="text-[10px] text-muted-foreground">Tổng thẻ</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-emerald-600">{flashcards.filter((f: any) => f.mastered).length}</p>
              <p className="text-[10px] text-muted-foreground">Đã thuộc</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-primary">
                {flashcards.length > 0 ? Math.round(flashcards.filter((f: any) => f.mastered).length / flashcards.length * 100) : 0}%
              </p>
              <p className="text-[10px] text-muted-foreground">Tỷ lệ</p>
            </div>
          </div>
        </div>
      )}

      {/* Student Questions */}
      {studentQuestions.length > 0 && (
        <div className="rounded-2xl border p-5 bg-card">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-sky-100 dark:bg-sky-950/40 flex items-center justify-center">
              <MessageSquare className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
            </div>
            Câu hỏi cho giáo viên ({studentQuestions.length})
          </h3>
          <div className="flex gap-3 mb-3 text-sm">
            <span className="text-emerald-600 font-semibold">
              {studentQuestions.filter((q: any) => q.status === "answered").length} đã trả lời
            </span>
            <span className="text-amber-600 font-semibold">
              {studentQuestions.filter((q: any) => q.status === "pending").length} chờ trả lời
            </span>
          </div>
          <div className="space-y-2">
            {studentQuestions.slice(0, 5).map((q: any) => (
              <div key={q.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                <p className="text-xs font-medium truncate flex-1">{q.title}</p>
                <Badge variant={q.status === "answered" ? "default" : "secondary"} className="text-[10px] ml-2 shrink-0">
                  {q.status === "answered" ? "Đã TL" : "Chờ"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Class Enrollment & Attendance */}
      {classEnrollments.length > 0 && (
        <div className="rounded-2xl border p-5 bg-card">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
              <GraduationCap className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
            </div>
            Lịch sử lớp học ({classEnrollments.length})
          </h3>
          <div className="space-y-3">
            {classEnrollments.map((e: any) => {
              const cls = e.class;
              const att = e.attendance_summary || {};
              const present = att.present || 0;
              const late = att.late || 0;
              const absent = att.absent || 0;
              const total = present + late + absent;
              return (
                <div key={e.id} className="rounded-xl border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{cls?.class_name || "Lớp"}</p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        {cls?.level && <span>{cls.level}</span>}
                        {cls?.teacher_name && <span>· {cls.teacher_name}</span>}
                      </div>
                    </div>
                    <Badge variant={e.status === "active" ? "default" : "secondary"} className="text-[10px] shrink-0">
                      {e.status === "active" ? "Đang học" : e.status === "completed" ? "Hoàn thành" : e.status}
                    </Badge>
                  </div>
                  {total > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Điểm danh: {total} buổi</span>
                        <span>{present} có · {late} trễ · {absent} vắng</span>
                      </div>
                      <div className="flex h-2 rounded-full overflow-hidden bg-muted/40">
                        {present > 0 && <div className="bg-emerald-500" style={{ width: `${present / total * 100}%` }} />}
                        {late > 0 && <div className="bg-amber-500" style={{ width: `${late / total * 100}%` }} />}
                        {absent > 0 && <div className="bg-red-500" style={{ width: `${absent / total * 100}%` }} />}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment History (Admin only) */}
      {(isAdmin || isSuperAdmin) && payments.length > 0 && (
        <div className="rounded-2xl border p-5 bg-card">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
              <Receipt className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            Lịch sử hoá đơn
          </h3>
          <div className="flex gap-4 text-sm mb-3">
            <span>Đã thanh toán: <strong className="text-emerald-600">
              {payments.filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + Number(p.amount || 0), 0).toLocaleString("vi-VN")} VND
            </strong></span>
            {payments.filter((p: any) => p.status === "pending" || p.status === "overdue").reduce((s: number, p: any) => s + Number(p.amount || 0), 0) > 0 && (
              <span>Còn nợ: <strong className="text-destructive">
                {payments.filter((p: any) => p.status === "pending" || p.status === "overdue").reduce((s: number, p: any) => s + Number(p.amount || 0), 0).toLocaleString("vi-VN")} VND
              </strong></span>
            )}
          </div>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 text-xs text-muted-foreground">
                  <th className="text-left px-3 py-2 font-medium">Ngày</th>
                  <th className="text-right px-3 py-2 font-medium">Số tiền</th>
                  <th className="text-left px-3 py-2 font-medium">Mô tả</th>
                  <th className="text-left px-3 py-2 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {payments.slice(0, 10).map((p: any) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-3 py-2 text-xs">{new Date(p.payment_date).toLocaleDateString("vi-VN")}</td>
                    <td className="px-3 py-2 text-right font-medium">{Number(p.amount).toLocaleString("vi-VN")}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[200px]">{p.description || "—"}</td>
                    <td className="px-3 py-2">
                      <Badge variant={p.status === "paid" ? "default" : p.status === "overdue" ? "destructive" : "secondary"} className="text-[10px]">
                        {p.status === "paid" ? "Đã trả" : p.status === "pending" ? "Chờ" : p.status === "overdue" ? "Quá hạn" : p.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Study Plan Activity */}
      {userId && <StudentStudyPlanActivity userId={userId} />}

      {/* Results Table */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", activeTab.bg)}>
              <activeTab.icon className={cn("h-3.5 w-3.5", activeTab.text)} />
            </div>
            Lịch sử {activeTab.label}
            <span className="text-muted-foreground font-normal ml-1">({skillResults.length})</span>
          </h3>
        </div>

        {skillResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <activeTab.icon className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm">Chưa có kết quả {activeTab.label}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Bài thi</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Sách</th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Điểm</th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Đúng</th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Thời gian</th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ngày</th>
                </tr>
              </thead>
              <tbody>
                {skillResults.map((r, i) => (
                  <tr key={r.id} className={cn("border-b last:border-0 transition-colors hover:bg-muted/20", i % 2 === 0 ? "" : "bg-muted/5")}>
                    <td className="px-5 py-3.5 font-medium">{r.assessment_name}</td>
                    <td className="px-5 py-3.5 text-muted-foreground text-xs">{r.book_name || "—"}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={cn(
                        "inline-flex items-center justify-center h-8 w-8 rounded-lg text-sm font-bold",
                        r.score != null && Number(r.score) >= 7 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                          : r.score != null && Number(r.score) >= 5 ? "bg-primary/10 text-primary"
                          : r.score != null ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400"
                          : "text-muted-foreground"
                      )}>
                        {r.score != null ? r.score : "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center text-muted-foreground hidden sm:table-cell">
                      {r.correct_answers != null ? (
                        <span>{r.correct_answers}<span className="text-muted-foreground/50">/{r.total_questions}</span></span>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-center text-muted-foreground hidden sm:table-cell">
                      {formatTimeVi(r.time_spent)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-muted-foreground text-xs">
                      {new Date(r.created_at).toLocaleDateString("vi-VN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Writing Feedback Section */}
      {activeSkill === "writing" && (() => {
        const writingResults = results.filter(r => r.section_type === "WRITING");
        if (writingResults.length === 0) return null;
        return (
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
                  <PenLine className="h-3.5 w-3.5 text-orange-700 dark:text-orange-400" />
                </div>
                Nhận xét Writing
              </h3>
            </div>
            <div className="p-5 space-y-4">
              {writingResults.map(result => {
                const tasks = Array.isArray((result as any).writing_tasks) ? (result as any).writing_tasks : [];
                if (tasks.length === 0) return null;
                return (
                  <div key={result.id} className="border rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-display font-bold text-sm">{result.assessment_name}</h4>
                      <span className="text-xs text-muted-foreground">
                        {new Date(result.created_at).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                    {tasks.map((task: any, idx: number) => {
                      const responseText = task?.response || task?.answer || "";
                      const taskKey = task?.taskId || `task_${idx + 1}`;
                      if (!responseText) return null;
                      return (
                        <div key={taskKey} className="border-t pt-3">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">{task?.title || `Task ${idx + 1}`}</p>
                          <WritingReview resultId={result.id} taskKey={taskKey} responseText={responseText} />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Speaking Recordings */}
      {activeSkill === "speaking" && (() => {
        const speakingTestResults = results.filter(r => r.section_type === "SPEAKING" && r.speaking_parts);
        const hasTestRecordings = speakingTestResults.some(r => {
          const parts = Array.isArray(r.speaking_parts) ? r.speaking_parts : [];
          return parts.some((p: any) => p.audioUrl);
        });

        if (!hasTestRecordings) return null;

        return (
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center">
                  <Mic className="h-3.5 w-3.5 text-violet-700 dark:text-violet-400" />
                </div>
                Bản ghi âm Speaking
              </h3>
            </div>
            <div className="p-5 space-y-4">
              {speakingTestResults.map(result => {
                const parts = (Array.isArray(result.speaking_parts) ? result.speaking_parts : []) as any[];
                const partsWithAudio = parts.filter((p: any) => p.audioUrl);
                if (partsWithAudio.length === 0) return null;
                const date = new Date(result.created_at);
                return (
                  <div key={result.id} className="border rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-display font-bold text-sm">{result.assessment_name}</h4>
                      <span className="text-xs text-muted-foreground">
                        {date.toLocaleDateString("vi-VN")} · {Math.round(result.time_spent / 60)} phút
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {partsWithAudio.map((p: any) => (
                        <div key={p.partId} className="space-y-0">
                          <div className="flex items-center justify-between text-xs bg-muted/50 rounded-lg px-3 py-2">
                            <span className="font-medium">{p.title}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => togglePlay(p.partId + result.id, p.audioUrl)}
                                className="p-1 rounded-full hover:bg-primary/10 transition-colors"
                              >
                                {playingId === p.partId + result.id ? (
                                  <Pause className="h-3.5 w-3.5 text-primary" />
                                ) : (
                                  <Play className="h-3.5 w-3.5 text-primary" />
                                )}
                              </button>
                              <a href={p.audioUrl} download={`${p.title}.webm`} className="p-1 rounded-full hover:bg-primary/10 transition-colors" title="Tải xuống">
                                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                              </a>
                              <span className="text-primary font-semibold">
                                {Math.floor(p.duration / 60)}m {p.duration % 60}s
                              </span>
                            </div>
                          </div>
                          <SpeakingGrader
                            resultId={result.id}
                            resultType="test"
                            partKey={p.partId}
                            studentId={userId!}
                            audioUrl={p.audioUrl}
                            readOnly
                          />
                        </div>
                      ))}

                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Practice Speaking Recordings */}
      {activeSkill === "speaking" && (() => {
        const practiceWithAudio = practiceResults.filter(pr => {
          const answers = pr.answers;
          if (!answers || typeof answers !== "object") return false;
          return Object.values(answers).some((a: any) => typeof a === "string" && (a.startsWith("blob:") || a.startsWith("http") || a.startsWith("data:audio")));
        });

        if (practiceWithAudio.length === 0) return null;

        return (
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center">
                  <Mic className="h-3.5 w-3.5 text-violet-700 dark:text-violet-400" />
                </div>
                Ghi âm bài tập Speaking
                <span className="text-muted-foreground font-normal ml-1">({practiceWithAudio.length})</span>
              </h3>
            </div>
            <div className="p-5 space-y-4">
              {practiceWithAudio.map(pr => {
                const answers = pr.answers as Record<string, any>;
                const audioEntries = Object.entries(answers).filter(
                  ([_, v]) => typeof v === "string" && (v.startsWith("blob:") || v.startsWith("http") || v.startsWith("data:audio"))
                );
                const date = new Date(pr.created_at);
                return (
                  <div key={pr.id} className="border rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-display font-bold text-sm">{pr.exercise_title}</h4>
                      <span className="text-xs text-muted-foreground">
                        {date.toLocaleDateString("vi-VN")} · {Math.round(pr.time_spent / 60)} phút
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {audioEntries.map(([key, url]) => (
                        <div key={key} className="space-y-0">
                          <div className="flex items-center justify-between text-xs bg-muted/50 rounded-lg px-3 py-2">
                            <span className="font-medium">Phần {key}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => togglePlay(`practice-${pr.id}-${key}`, url as string)}
                                className="p-1 rounded-full hover:bg-primary/10 transition-colors"
                              >
                                {playingId === `practice-${pr.id}-${key}` ? (
                                  <Pause className="h-3.5 w-3.5 text-primary" />
                                ) : (
                                  <Play className="h-3.5 w-3.5 text-primary" />
                                )}
                              </button>
                              <a href={url as string} download={`${pr.exercise_title}-${key}.webm`} className="p-1 rounded-full hover:bg-primary/10 transition-colors" title="Tải xuống">
                                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                              </a>
                            </div>
                          </div>
                          <SpeakingGrader
                            resultId={pr.id}
                            resultType="practice"
                            partKey={key}
                            studentId={userId!}
                            audioUrl={url as string}
                            readOnly
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
