/**
 * CourseDetailPage — /courses/:id Enhanced UI from mockup
 * (`~Projects/Admin WebApp UI (Template)/pages-course-detail.jsx`).
 *
 * Hero + emoji + difficulty bars + stats strip + tabs (lessons, outcomes, materials, classes).
 * Edit button reuses existing CourseEditorDialog.
 */

import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, BookOpen, CheckCircle2, Clock, GraduationCap,
  Layers, Pencil, School, Target, Users, Wallet, Copy, Users2,
  ChevronRight, FileText, Volume2, Sparkles, ClipboardList,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@shared/components/ui/button";
import { Skeleton } from "@shared/components/ui/skeleton";
import { Badge } from "@shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { Progress } from "@shared/components/ui/progress";
import { useCoursesAdmin } from "@admin/features/academic/hooks/useCoursesAdmin";
import { useCourseLevels } from "@shared/hooks/useCourseLevels";
import type { Course, CourseInput } from "@admin/features/academic/hooks/useCourses";
import CourseEditorDialog from "@admin/features/academic/components/CourseEditorDialog";
import { getProgramPalette, getCourseEmoji } from "@shared/utils/programColors";
import { cn } from "@shared/lib/utils";

interface LessonData {
  idx: number;
  week: number;
  name: string;
  dur: number;
  type: 'lesson' | 'practice' | 'flashcard' | 'test' | 'review';
  objs: string[];
  status: 'done' | 'active' | 'upcoming';
}

interface MaterialData {
  kind: 'pdf' | 'audio' | 'flashcard' | 'plan';
  name: string;
  size?: string;
  count?: number;
}

interface ClassUsingCourse {
  id: string;
  name: string | null;
  class_name: string | null;
  class_code: string | null;
  lifecycle_status: string | null;
  student_count: number | null;
  teacher_name: string | null;
}

interface LinkedPlan {
  id: string;
  plan_name: string | null;
  total_sessions: number | null;
  cefr_level: string | null;
}

const VND_FMT = (n: number) => {
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency", currency: "VND", maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${n.toLocaleString("vi-VN")} ₫`;
  }
};

export default function CourseDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const [editorOpen, setEditorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("lessons");

  /* Mock lesson data - will be replaced with real backend data */
  const lessons: LessonData[] = useMemo(() => [
    { idx: 1, week: 1, name: 'Form & Note Completion', dur: 90, type: 'lesson', objs: ['Số, tên, địa chỉ', 'Form filling'], status: 'done' },
    { idx: 2, week: 1, name: 'Numbers, Dates, Times', dur: 90, type: 'lesson', objs: ['Spelling numbers', 'Dates'], status: 'done' },
    { idx: 3, week: 1, name: 'Practice — Section 1', dur: 90, type: 'practice', objs: ['Mock section 1'], status: 'done' },
    { idx: 4, week: 1, name: 'Vocab Drill — Travel & Booking', dur: 60, type: 'flashcard', objs: ['80 từ chủ đề'], status: 'done' },
    { idx: 5, week: 2, name: 'Map Labelling Strategy', dur: 90, type: 'lesson', objs: ['Hướng & vị trí', 'Theo dõi map'], status: 'active' },
    { idx: 6, week: 2, name: 'Diagram & Plan Labelling', dur: 90, type: 'lesson', objs: ['Diagrams', 'Floor plans'], status: 'upcoming' },
    { idx: 7, week: 2, name: 'Practice — Section 2', dur: 90, type: 'practice', objs: ['Mock section 2'], status: 'upcoming' },
    { idx: 8, week: 2, name: 'Mid-course Quick Test', dur: 45, type: 'test', objs: ['Quiz section 1-2'], status: 'upcoming' },
    { idx: 9, week: 3, name: 'Section 3 — Conversation', dur: 90, type: 'lesson', objs: ['Multiple speakers', 'Opinions'], status: 'upcoming' },
    { idx: 10, week: 3, name: 'Section 4 — Lecture', dur: 90, type: 'lesson', objs: ['Note structure', 'Summary'], status: 'upcoming' },
    { idx: 11, week: 3, name: 'Mock Listening Full', dur: 90, type: 'test', objs: ['Full listening test'], status: 'upcoming' },
    { idx: 12, week: 3, name: 'Review & Strategy', dur: 60, type: 'review', objs: ['Tổng ôn'], status: 'upcoming' },
  ], []);

  /* Mock materials data */
  const materials: MaterialData[] = useMemo(() => [
    { kind: 'pdf', name: 'Listening Bridge — Student Book', size: '12 MB' },
    { kind: 'audio', name: 'Audio Pack — 24 tracks', size: '180 MB' },
    { kind: 'flashcard', name: 'Numbers & Dates Vocab Set', count: 120 },
    { kind: 'plan', name: 'PRE-03 Study Plan (3 weeks)', count: 12 },
  ], []);

  /* Resolve course → program (for back link + palette). */
  const courseQ = useQuery({
    queryKey: ["course-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("courses")
        .select("id, program_id, code, name, slug, description, long_description, outcomes, target_audience, problem_solving, price_vnd, duration_label, total_sessions, hours_per_session, max_students, cefr_range, color_key, icon_key, sort_order, status, image_url")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as null | {
        id: string; program_id: string; code: string | null; name: string;
        slug: string | null; description: string | null;
        long_description: string | null; outcomes: string[] | null;
        target_audience: string | null; problem_solving: string | null;
        price_vnd: number | null; duration_label: string | null;
        total_sessions: number | null; hours_per_session: number | null;
        max_students: number | null; cefr_range: string | null;
        color_key: string | null; icon_key: string | null;
        sort_order: number; status: "active" | "inactive"; image_url: string | null;
      };
    },
    staleTime: 60_000,
  });

  /* Lookup program (key + name) for breadcrumb + palette. */
  const { programs } = useCoursesAdmin();
  const program = useMemo(
    () => programs.find((p) => p.id === courseQ.data?.program_id),
    [programs, courseQ.data?.program_id],
  );

  /* Fetch linked study plans. */
  const studyPlansQ = useQuery({
    queryKey: ["course-detail-plans", id],
    enabled: !!id,
    queryFn: async (): Promise<LinkedPlan[]> => {
      // course_study_plans link table joins courses ↔ study_plans.
      const { data: links, error: linkErr } = await (supabase as any)
        .from("course_study_plans")
        .select("study_plan_id, sort_order")
        .eq("course_id", id)
        .order("sort_order", { ascending: true });
      if (linkErr || !links?.length) return [];
      const planIds = links.map((l: { study_plan_id: string }) => l.study_plan_id);
      const { data: plans, error: planErr } = await (supabase as any)
        .from("study_plans")
        .select("id, plan_name, total_sessions, cefr_level")
        .in("id", planIds);
      if (planErr) return [];
      return (plans ?? []) as LinkedPlan[];
    },
    staleTime: 60_000,
  });

  /* Classes using this course. */
  const classesUsingQ = useQuery({
    queryKey: ["course-detail-classes", id],
    enabled: !!id,
    queryFn: async (): Promise<ClassUsingCourse[]> => {
      const { data, error } = await (supabase as any)
        .from("classes")
        .select("id, name, class_name, class_code, lifecycle_status, student_count, teacher_name")
        .eq("course_id", id)
        .order("start_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as ClassUsingCourse[];
    },
    staleTime: 60_000,
  });

  /* Levels resolution (chỉ dùng cho editor — load all). */
  const { levels } = useCourseLevels({ includeOrphans: true });

  /* Lazy load editingCourse data ONLY when editor opens — avoid heavy
     useCourses() fetch on initial render of detail page. Includes
     level_ids + study_plan_ids needed cho CourseEditorDialog. */
  const editingCourseQ = useQuery({
    queryKey: ["course-detail-editing", id],
    enabled: !!id && editorOpen,
    queryFn: async (): Promise<Course | null> => {
      // Re-fetch course với level/plan link arrays
      const [courseRes, levelLinksRes, planLinksRes] = await Promise.all([
        (supabase as any)
          .from("courses")
          .select("*")
          .eq("id", id)
          .maybeSingle(),
        (supabase as any)
          .from("course_level_links")
          .select("level_id, sort_order")
          .eq("course_id", id)
          .order("sort_order", { ascending: true }),
        (supabase as any)
          .from("course_study_plans")
          .select("study_plan_id, sort_order")
          .eq("course_id", id)
          .order("sort_order", { ascending: true }),
      ]);
      if (!courseRes.data) return null;
      const c = courseRes.data;
      return {
        ...c,
        outcomes: c.outcomes ?? [],
        level_ids: (levelLinksRes.data ?? []).map((r: { level_id: string }) => r.level_id),
        study_plan_ids: (planLinksRes.data ?? []).map((r: { study_plan_id: string }) => r.study_plan_id),
      } as Course;
    },
  });
  const editingCourse = editingCourseQ.data ?? null;

  /* Class count stats derived từ classesUsingQ (already fetched). */
  const stats = useMemo(() => {
    const list = classesUsingQ.data ?? [];
    const activeClasses = list.filter(
      (c) => c.lifecycle_status === "in_progress" || c.lifecycle_status === "ready",
    ).length;
    const totalStudents = list.reduce((sum, c) => sum + (c.student_count ?? 0), 0);
    return {
      totalClasses: list.length,
      activeClasses,
      uniqueStudents: totalStudents,
    };
  }, [classesUsingQ.data]);

  if (courseQ.isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }
  if (!courseQ.data) return <Navigate to="/courses" replace />;

  const course = courseQ.data;
  const palette = program ? getProgramPalette(program.key) : getProgramPalette("ielts");
  const isInactive = course.status === "inactive";
  const outcomes = course.outcomes ?? [];

  /* Direct update — avoids useCourses hook chain. CourseEditorDialog passes
     all fields including level_ids + study_plan_ids; we update the row +
     re-write link tables. */
  const handleEditSubmit = async (input: CourseInput) => {
    if (!editingCourse) return;
    const { level_ids = [], study_plan_ids = [], ...row } = input;

    // 1) Update courses row
    const { error: updErr } = await (supabase as any)
      .from("courses")
      .update(row)
      .eq("id", editingCourse.id);
    if (updErr) throw updErr;

    // 2) Re-write course_level_links
    await (supabase as any).from("course_level_links").delete().eq("course_id", editingCourse.id);
    if (level_ids.length > 0) {
      await (supabase as any).from("course_level_links").insert(
        level_ids.map((level_id, idx) => ({
          course_id: editingCourse.id, level_id, sort_order: idx,
        })),
      );
    }

    // 3) Re-write course_study_plans
    await (supabase as any).from("course_study_plans").delete().eq("course_id", editingCourse.id);
    if (study_plan_ids.length > 0) {
      await (supabase as any).from("course_study_plans").insert(
        study_plan_ids.map((study_plan_id, idx) => ({
          course_id: editingCourse.id, study_plan_id, sort_order: idx,
        })),
      );
    }

    courseQ.refetch();
    studyPlansQ.refetch();
  };

  const emoji = getCourseEmoji(course.code || course.name);
  const difficulty = 3; // Mock difficulty 1-5
  const totalHours = (course.total_sessions || 12) * (course.hours_per_session || 1.5);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5 pb-16">
      {/* Back */}
      <Button asChild size="sm" variant="ghost" className="h-8 -ml-2 gap-1.5 text-xs text-muted-foreground">
        <Link to={program ? `/courses/programs/${program.key}` : "/courses"}>
          <ArrowLeft className="h-3.5 w-3.5" />
          {program ? `${program.name} · Khoá học` : "Tất cả khoá học"}
        </Link>
      </Button>

      {/* Enhanced Hero */}
      <section className={cn(
        "rounded-2xl border-2 overflow-hidden",
        palette.bgSoft || "bg-teal-50",
        palette.borderSoft || "border-teal-200",
        isInactive && "opacity-80"
      )}>
        <div className="p-6 md:p-8">
          <Button
            size="sm"
            variant="outline"
            className="mb-4 gap-1.5"
            onClick={() => setEditorOpen(true)}
            disabled={!editingCourse}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {program ? `${program.name} · ${program.key}` : "Tất cả khoá học"}
          </Button>

          <div className="flex items-start gap-6">
            {/* Emoji */}
            <div className="w-20 h-20 rounded-2xl bg-white border-2 border-slate-800 flex items-center justify-center text-4xl shadow-md transform -rotate-3 shrink-0">
              {emoji}
            </div>

            <div className="flex-1 min-w-0">
              {/* Meta row */}
              <div className="flex items-center gap-2 flex-wrap mb-2">
                {course.code && (
                  <code className="text-[11px] font-mono px-2 py-0.5 rounded bg-white border font-bold">
                    {course.code}
                  </code>
                )}
                <Badge variant={isInactive ? "secondary" : "default"} className="text-[10px]">
                  {isInactive ? "inactive" : "active"}
                </Badge>
                {course.cefr_range && (
                  <Badge variant="outline" className="text-[10px] bg-amber-100 border-amber-200 text-amber-800">
                    🎯 {course.cefr_range}
                  </Badge>
                )}
              </div>

              <h1 className="font-display text-3xl font-extrabold tracking-tight mb-2">
                {course.name}
              </h1>

              {course.description && (
                <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mb-3">
                  {course.description}
                </p>
              )}

              {/* Difficulty bars */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/70 rounded-full border">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Độ khó</span>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(n => (
                    <div
                      key={n}
                      className={cn(
                        "w-4 h-2 rounded-sm border",
                        n <= difficulty ? "bg-rose-500 border-rose-600" : "bg-white border-slate-300"
                      )}
                    />
                  ))}
                </div>
                <span className="text-[11px] font-medium">{difficulty}/5 · Trung bình</span>
              </div>
            </div>

            {/* Actions */}
            <div className="hidden md:flex flex-col gap-2 shrink-0">
              <Button variant="outline" size="sm" className="gap-1.5 justify-start">
                <Copy className="h-3.5 w-3.5" /> Duplicate
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 justify-start" onClick={() => setEditorOpen(true)}>
                <Pencil className="h-3.5 w-3.5" /> Sửa khoá
              </Button>
              <Button size="sm" className="gap-1.5 justify-start">
                <Users2 className="h-3.5 w-3.5" /> Gán cho lớp
              </Button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-5 gap-4 mt-6 pt-6 border-t border-dashed border-slate-300/50">
            <CdStat label="tuần" value={String(Math.ceil((course.total_sessions || 12) / 4))} />
            <CdStat label="bài học" value={String(course.total_sessions || 12)} />
            <CdStat label="tổng giờ" value={`${totalHours}h`} sub={`${course.hours_per_session || 1.5}h/buổi`} />
            <CdStat label="lớp đang chạy" value={String(stats.activeClasses)} />
            <CdStat label="học viên" value={String(stats.uniqueStudents)} />
          </div>
        </div>
      </section>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="lessons" className="gap-1.5 text-xs">
            <BookOpen className="h-3.5 w-3.5" /> Bài học ({lessons.length})
          </TabsTrigger>
          <TabsTrigger value="outcomes" className="gap-1.5 text-xs">
            <Target className="h-3.5 w-3.5" /> Mục tiêu
          </TabsTrigger>
          <TabsTrigger value="materials" className="gap-1.5 text-xs">
            <Layers className="h-3.5 w-3.5" /> Học liệu ({materials.length})
          </TabsTrigger>
          <TabsTrigger value="classes" className="gap-1.5 text-xs">
            <GraduationCap className="h-3.5 w-3.5" /> Lớp đang dùng ({classesUsingQ.data?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Lessons Tab */}
        <TabsContent value="lessons">
          <div className="rounded-xl border-2 bg-card p-5">
            {[1, 2, 3].map((wk) => {
              const weekLessons = lessons.filter(l => l.week === wk);
              if (weekLessons.length === 0) return null;
              return (
                <div key={wk} className="mb-6 last:mb-0">
                  <div className="flex items-center gap-3 mb-3 pb-2 border-b border-dashed">
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-white text-[10px] font-bold">TUẦN {wk}</span>
                    <span className="text-xs text-muted-foreground">
                      {weekLessons.length} bài · {weekLessons.reduce((s, l) => s + l.dur, 0)} phút
                    </span>
                  </div>
                  <div className="space-y-2">
                    {weekLessons.map((l) => (
                      <div
                        key={l.idx}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border transition-all",
                          l.status === 'done' ? "opacity-60 bg-slate-50" :
                          l.status === 'active' ? "bg-white border-teal-300 shadow-sm" :
                          "bg-cream-50"
                        )}
                      >
                        {/* Lesson number */}
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0",
                          l.status === 'done' ? "bg-teal-500 text-white" :
                          l.status === 'active' ? "bg-amber-300 text-slate-800" :
                          "bg-white border text-slate-600"
                        )}>
                          {l.status === 'done' ? '✓' : l.idx}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm">{l.name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {l.objs.map((o, i) => <span key={i} className="mr-2">· {o}</span>)}
                          </div>
                        </div>

                        {/* Meta */}
                        <div className="flex items-center gap-2 shrink-0">
                          <LessonTypeBadge type={l.type} />
                          <span className="text-[11px] font-medium w-8 text-right">{l.dur}'</span>
                        </div>

                        <Button variant="outline" size="sm" className="h-7 text-xs shrink-0">Mở</Button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Outcomes Tab */}
        <TabsContent value="outcomes">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 rounded-xl border-2 bg-card p-5">
              <h3 className="font-display text-base font-bold mb-4 flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-600" /> Mục tiêu sau khoá
              </h3>
              {outcomes.length > 0 ? (
                <ul className="space-y-3">
                  {outcomes.map((o, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="w-6 h-6 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center text-[10px] font-bold text-rose-600 shrink-0">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="leading-relaxed">{o}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground italic">Chưa có mục tiêu nào được định nghĩa.</p>
              )}
            </div>

            <div className="rounded-xl border-2 bg-amber-50 border-amber-200 p-5">
              <h3 className="font-display text-sm font-bold mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-700" /> Yêu cầu đầu vào
              </h3>
              <ul className="space-y-2 text-sm mb-4">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Hoàn thành khoá trước
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Vocab base 800+ từ
                </li>
              </ul>

              {/* Band progression */}
              <div className="pt-4 border-t border-dashed border-amber-300">
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl font-display font-extrabold text-slate-400">5.0</span>
                  <ArrowRight className="h-5 w-5 text-slate-300" />
                  <span className="text-2xl font-display font-extrabold text-rose-600">5.5</span>
                </div>
                <p className="text-center text-[11px] text-muted-foreground mt-2">
                  Mức band trung bình học viên đạt sau khoá
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Materials Tab */}
        <TabsContent value="materials">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {materials.map((m, i) => {
              const icon = m.kind === 'pdf' ? FileText : m.kind === 'audio' ? Volume2 : m.kind === 'flashcard' ? Sparkles : ClipboardList;
              const color = m.kind === 'pdf' ? 'rose' : m.kind === 'audio' ? 'violet' : m.kind === 'flashcard' ? 'amber' : 'teal';
              const bgColors = {
                rose: 'bg-rose-50 border-rose-200',
                violet: 'bg-violet-50 border-violet-200',
                amber: 'bg-amber-50 border-amber-200',
                teal: 'bg-teal-50 border-teal-200',
              };
              return (
                <div
                  key={i}
                  className={cn(
                    "rounded-xl border-2 p-4 flex flex-col transition-all hover:shadow-md cursor-pointer",
                    bgColors[color as keyof typeof bgColors]
                  )}
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-800 text-white flex items-center justify-center mb-3">
                    <icon className="h-5 w-5" />
                  </div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    {m.kind}
                  </div>
                  <div className="font-bold text-sm leading-tight mb-1">{m.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {m.size || `${m.count} items`}
                  </div>
                  <Button variant="outline" size="sm" className="mt-3 text-xs w-full">Mở</Button>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Classes Tab */}
        <TabsContent value="classes">
          <div className="rounded-xl border-2 bg-card overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-display font-bold flex items-center gap-2">
                <School className="h-4 w-4" />
                Lớp đang dùng ({classesUsingQ.data?.length || 0})
              </h3>
              <span className="text-[11px] text-muted-foreground">
                <strong>{stats.activeClasses}</strong> đang chạy · <strong>{stats.uniqueStudents}</strong> HV
              </span>
            </div>
            {classesUsingQ.isLoading ? (
              <div className="p-4">
                <Skeleton className="h-16 w-full" />
              </div>
            ) : !classesUsingQ.data?.length ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <School className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                <p>Chưa có lớp nào dùng khoá này.</p>
              </div>
            ) : (
              <div className="divide-y">
                {classesUsingQ.data.map((c) => (
                  <Link
                    key={c.id}
                    to={`/classes/${c.id}`}
                    className="flex items-center gap-3 p-4 text-sm hover:bg-muted/40 transition-colors"
                  >
                    <School className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{c.name ?? c.class_name ?? c.class_code ?? "(không tên)"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {c.class_code && <span>{c.class_code} · </span>}
                        {c.teacher_name ?? "Chưa có GV"} · {c.student_count ?? 0} HV
                      </p>
                    </div>
                    {c.lifecycle_status && (
                      <Badge variant="outline" className="text-[9px] uppercase">
                        {c.lifecycle_status}
                      </Badge>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Editor dialog */}
      {editingCourse && program && (
        <CourseEditorDialog
          open={editorOpen}
          onOpenChange={setEditorOpen}
          programId={program.id}
          programKey={program.key}
          programName={program.name}
          levels={levels}
          course={editingCourse}
          onSubmit={handleEditSubmit}
        />
      )}
    </div>
  );
}

/* ─── Helper Components ─── */

interface StatCardProps {
  icon: typeof Clock;
  label: string;
  value: string;
  hint?: string;
}

function StatCard({ icon: Icon, label, value, hint }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-card p-3.5 space-y-1">
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
        {label}
      </p>
      <p className="font-display text-xl font-extrabold tabular-nums leading-tight">
        {value}
      </p>
      {hint && (
        <p className="text-[10px] text-muted-foreground leading-tight">{hint}</p>
      )}
    </div>
  );
}

function CdStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="text-center">
      <div className="font-display text-2xl font-extrabold">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
      {sub && <div className="text-[9px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function LessonTypeBadge({ type }: { type: LessonData['type'] }) {
  const styles = {
    lesson: 'bg-teal-100 text-teal-700 border-teal-200',
    practice: 'bg-violet-100 text-violet-700 border-violet-200',
    flashcard: 'bg-amber-100 text-amber-700 border-amber-200',
    test: 'bg-rose-100 text-rose-700 border-rose-200',
    review: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  const labels = {
    lesson: 'BÀI HỌC',
    practice: 'LUYỆN TẬP',
    flashcard: 'FLASHCARD',
    test: 'KIỂM TRA',
    review: 'ÔN TẬP',
  };
  return (
    <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded border", styles[type])}>
      {labels[type]}
    </span>
  );
}

