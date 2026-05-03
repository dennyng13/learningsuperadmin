/**
 * CourseDetailPage — /courses/:id Day 7 build per mockup
 * (`~Projects/Admin WebApp UI (Template)/pages-course-detail.jsx`).
 *
 * Hero + 5-card stat strip + sections (description, outcomes, study plans
 * linked, classes using). Most fields are real data từ courses table; lesson
 * list + difficulty bars defer cho sprint sau (no backend tables).
 *
 * Edit button reuses existing CourseEditorDialog. Delete + clone defer.
 */

import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, BookOpen, CheckCircle2, Clock, GraduationCap,
  Layers, Pencil, School, Target, Users, Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@shared/components/ui/button";
import { Skeleton } from "@shared/components/ui/skeleton";
import { Badge } from "@shared/components/ui/badge";
import { useCoursesAdmin } from "@admin/features/academic/hooks/useCoursesAdmin";
import { useCourseLevels } from "@shared/hooks/useCourseLevels";
import type { Course, CourseInput } from "@admin/features/academic/hooks/useCourses";
import CourseEditorDialog from "@admin/features/academic/components/CourseEditorDialog";
import { getProgramPalette } from "@shared/utils/programColors";
import { cn } from "@shared/lib/utils";

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

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      {/* Back */}
      <Button asChild size="sm" variant="ghost" className="h-8 -ml-2 gap-1.5 text-xs text-muted-foreground">
        <Link to={program ? `/courses/programs/${program.key}` : "/courses"}>
          <ArrowLeft className="h-3.5 w-3.5" />
          {program ? `${program.name} · Khoá học` : "Tất cả khoá học"}
        </Link>
      </Button>

      {/* Hero */}
      <section className={cn("rounded-2xl border bg-card overflow-hidden", isInactive && "opacity-80")}>
        <div className={cn("h-1.5 w-full", palette.progressFill)} />
        <div className="p-5 md:p-6 flex items-start gap-4">
          <div className={cn("h-16 w-16 rounded-xl flex items-center justify-center shrink-0", palette.iconBg)}>
            <BookOpen className={cn("h-8 w-8", palette.iconText)} />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {course.code && (
                <code className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-bold">
                  {course.code}
                </code>
              )}
              {program && (
                <Badge variant="outline" className="text-[10px]">
                  {program.name}
                </Badge>
              )}
              {course.cefr_range && (
                <Badge variant="outline" className="text-[10px] inline-flex items-center gap-1">
                  <Target className="h-3 w-3" /> {course.cefr_range}
                </Badge>
              )}
              <span className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                isInactive ? "bg-muted text-muted-foreground" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
              )}>
                <span className={cn("h-1.5 w-1.5 rounded-full",
                  isInactive ? "bg-muted-foreground" : "bg-emerald-500",
                )} />
                {course.status}
              </span>
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold leading-tight">
              {course.name}
            </h1>
            {course.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {course.description}
              </p>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 gap-1.5"
            onClick={() => setEditorOpen(true)}
            disabled={!editingCourse}
          >
            <Pencil className="h-3.5 w-3.5" /> Sửa khoá
          </Button>
        </div>
      </section>

      {/* Stat strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Clock}
          label="Số buổi"
          value={course.total_sessions != null ? String(course.total_sessions) : "—"}
          hint={course.duration_label ?? undefined}
        />
        <StatCard
          icon={Clock}
          label="Giờ/buổi"
          value={course.hours_per_session != null ? String(course.hours_per_session) : "—"}
          hint={course.hours_per_session != null && course.total_sessions != null
            ? `${course.hours_per_session * course.total_sessions}h tổng`
            : undefined}
        />
        <StatCard
          icon={Users}
          label="Sĩ số tối đa"
          value={course.max_students != null ? String(course.max_students) : "—"}
          hint="HV/lớp"
        />
        <StatCard
          icon={Wallet}
          label="Học phí"
          value={course.price_vnd != null && course.price_vnd > 0 ? VND_FMT(course.price_vnd) : "—"}
          hint={course.duration_label ?? undefined}
        />
      </section>

      {/* Long description / Target audience / Problem solving */}
      {(course.long_description || course.target_audience || course.problem_solving) && (
        <section className="grid gap-3 md:grid-cols-2">
          {course.long_description && (
            <article className="rounded-xl border bg-card p-4 md:col-span-2">
              <h3 className="font-display text-sm font-bold mb-2 inline-flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-primary" /> Mô tả chi tiết
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {course.long_description}
              </p>
            </article>
          )}
          {course.target_audience && (
            <article className="rounded-xl border bg-card p-4">
              <h3 className="font-display text-sm font-bold mb-2 inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-violet-600" /> Đối tượng phù hợp
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {course.target_audience}
              </p>
            </article>
          )}
          {course.problem_solving && (
            <article className="rounded-xl border bg-card p-4">
              <h3 className="font-display text-sm font-bold mb-2 inline-flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-rose-600" /> Khoá này giải quyết vấn đề gì
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {course.problem_solving}
              </p>
            </article>
          )}
        </section>
      )}

      {/* Outcomes */}
      {outcomes.length > 0 && (
        <section className="rounded-xl border bg-card p-4">
          <h3 className="font-display text-sm font-bold mb-3 inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Đầu ra học tập ({outcomes.length})
          </h3>
          <ul className="space-y-1.5">
            {outcomes.map((o, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Linked study plans */}
      <section className="rounded-xl border bg-card p-4 space-y-3">
        <header className="flex items-center justify-between gap-2">
          <h3 className="font-display text-sm font-bold inline-flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-amber-600" />
            Kế hoạch học liên kết ({studyPlansQ.data?.length ?? 0})
          </h3>
          <Button asChild size="sm" variant="ghost" className="h-7 text-xs gap-1">
            <Link to="/study-plans">Quản lý plans</Link>
          </Button>
        </header>
        {studyPlansQ.isLoading ? (
          <Skeleton className="h-12 w-full" />
        ) : !studyPlansQ.data?.length ? (
          <p className="text-xs text-muted-foreground italic">Chưa gắn study plan nào.</p>
        ) : (
          <ul className="divide-y">
            {studyPlansQ.data.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2 text-sm">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium truncate flex-1">
                  {p.plan_name || <span className="italic text-muted-foreground">(chưa đặt tên)</span>}
                </span>
                {p.cefr_level && <Badge variant="outline" className="text-[10px]">{p.cefr_level}</Badge>}
                {p.total_sessions != null && (
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {p.total_sessions} buổi
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Classes using */}
      <section className="rounded-xl border bg-card p-4 space-y-3">
        <header className="flex items-center justify-between gap-2">
          <h3 className="font-display text-sm font-bold inline-flex items-center gap-1.5">
            <School className="h-3.5 w-3.5 text-teal-600" />
            Lớp đang dùng ({classesUsingQ.data?.length ?? 0})
          </h3>
          <span className="text-[11px] text-muted-foreground">
            <strong>{stats.activeClasses}</strong> đang chạy ·{" "}
            <strong>{stats.uniqueStudents}</strong> HV
          </span>
        </header>
        {classesUsingQ.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : !classesUsingQ.data?.length ? (
          <p className="text-xs text-muted-foreground italic">Chưa có lớp nào dùng khoá này.</p>
        ) : (
          <ul className="divide-y">
            {classesUsingQ.data.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/classes/${c.id}`}
                  className="flex items-center gap-3 py-2 text-sm hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors"
                >
                  <School className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {c.name ?? c.class_name ?? c.class_code ?? "(không tên)"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {c.class_code && <span>{c.class_code} · </span>}
                      {c.teacher_name ?? "Chưa có GV"} ·{" "}
                      <GraduationCap className="h-2.5 w-2.5 inline" /> {c.student_count ?? 0} HV
                    </p>
                  </div>
                  {c.lifecycle_status && (
                    <Badge variant="outline" className="text-[9px] uppercase">
                      {c.lifecycle_status}
                    </Badge>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

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

