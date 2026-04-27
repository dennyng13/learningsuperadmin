/**
 * useCourses — danh sách Khoá học (courses) gắn với một program.
 *
 * Một Khoá học là một "gói nội dung" độc lập với Cấp độ (course_levels):
 *   - mô tả ngắn / mô tả dài
 *   - đầu ra (outcomes)
 *   - 1+ levels gắn vào (course_level_links)
 *   - 1+ study plan templates gắn vào (course_study_plans)
 *   - thống kê số lớp / học viên đang dùng (qua bảng classes)
 *
 * Realtime: subscribe trên 4 bảng (courses, course_level_links,
 * course_study_plans, classes) để mọi thay đổi reflect tức thì.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Course {
  id: string;
  program_id: string;
  name: string;
  slug: string | null;
  description: string | null;
  long_description: string | null;
  outcomes: string[];
  color_key: string | null;
  icon_key: string | null;
  sort_order: number;
  status: "active" | "inactive";
  level_ids: string[];
  study_plan_ids: string[];
  // ── Rich descriptive fields (added 2026-04-27 migration) ─────────────────
  /** Markdown / multiline mô tả đối tượng phù hợp. */
  target_audience: string | null;
  /** Khoá học giải quyết vấn đề gì (markdown / multiline). */
  problem_solving: string | null;
  /** Giá khoá học, đơn vị VND (integer). */
  price_vnd: number | null;
  /** Tổng thời lượng dạng text — vd. "1.5 tháng". */
  duration_label: string | null;
  /** Tổng số buổi học. */
  total_sessions: number | null;
  /** Số giờ học mỗi buổi. */
  hours_per_session: number | null;
  /** Sĩ số tối đa mỗi lớp. */
  max_students: number | null;
  /** CEFR text label, vd "A2 - B1". */
  cefr_range: string | null;
}

export interface CourseInput {
  program_id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  long_description?: string | null;
  outcomes?: string[];
  color_key?: string | null;
  icon_key?: string | null;
  sort_order?: number;
  status?: "active" | "inactive";
  level_ids?: string[];
  study_plan_ids?: string[];
  target_audience?: string | null;
  problem_solving?: string | null;
  price_vnd?: number | null;
  duration_label?: string | null;
  total_sessions?: number | null;
  hours_per_session?: number | null;
  max_students?: number | null;
  cefr_range?: string | null;
}

export interface CourseStats {
  /** Tổng số lớp đã/đang dùng course này. */
  totalClasses: number;
  /** Lớp đang vận hành (active/upcoming). */
  activeClasses: number;
  /** Học viên duy nhất theo class.student_ids. */
  uniqueStudents: number;
}

const EMPTY_STATS: CourseStats = { totalClasses: 0, activeClasses: 0, uniqueStudents: 0 };

/* ────────────────────────────────────────────────────────────────────────── */

async function fetchCourses(programId?: string): Promise<Course[]> {
  let q = (supabase as any)
    .from("courses")
    .select("id, program_id, name, slug, description, long_description, outcomes, color_key, icon_key, sort_order, status, target_audience, problem_solving, price_vnd, duration_label, total_sessions, hours_per_session, max_students, cefr_range")
    .order("sort_order", { ascending: true });
  if (programId) q = q.eq("program_id", programId);

  const [coursesRes, linksRes, plansRes] = await Promise.all([
    q,
    (supabase as any).from("course_level_links")
      .select("course_id, level_id, sort_order")
      .order("sort_order", { ascending: true }),
    (supabase as any).from("course_study_plans")
      .select("course_id, template_id, is_default, sort_order")
      .order("sort_order", { ascending: true }),
  ]);

  if (coursesRes.error) {
    console.error("[useCourses] fetch courses failed", coursesRes.error);
    return [];
  }
  const rows: any[] = coursesRes.data ?? [];
  const linksByCourse = new Map<string, string[]>();
  for (const l of (linksRes.data ?? []) as Array<{ course_id: string; level_id: string }>) {
    const arr = linksByCourse.get(l.course_id) ?? [];
    arr.push(l.level_id);
    linksByCourse.set(l.course_id, arr);
  }
  const plansByCourse = new Map<string, string[]>();
  for (const p of (plansRes.data ?? []) as Array<{ course_id: string; template_id: string }>) {
    const arr = plansByCourse.get(p.course_id) ?? [];
    arr.push(p.template_id);
    plansByCourse.set(p.course_id, arr);
  }

  return rows.map((r) => ({
    id: r.id,
    program_id: r.program_id,
    name: r.name,
    slug: r.slug ?? null,
    description: r.description ?? null,
    long_description: r.long_description ?? null,
    outcomes: Array.isArray(r.outcomes) ? (r.outcomes as string[]) : [],
    color_key: r.color_key ?? null,
    icon_key: r.icon_key ?? null,
    sort_order: r.sort_order ?? 0,
    status: (r.status as "active" | "inactive") ?? "active",
    level_ids: linksByCourse.get(r.id) ?? [],
    study_plan_ids: plansByCourse.get(r.id) ?? [],
    target_audience: r.target_audience ?? null,
    problem_solving: r.problem_solving ?? null,
    price_vnd: r.price_vnd != null ? Number(r.price_vnd) : null,
    duration_label: r.duration_label ?? null,
    total_sessions: r.total_sessions != null ? Number(r.total_sessions) : null,
    hours_per_session: r.hours_per_session != null ? Number(r.hours_per_session) : null,
    max_students: r.max_students != null ? Number(r.max_students) : null,
    cefr_range: r.cefr_range ?? null,
  }));
}

/**
 * Aggregate class stats per course based on `classes.level` matching one of
 * the level names linked to that course. We resolve `level_id → name` from
 * the `course_levels` table, then count classes whose `level` equals that name.
 *
 * NOTE: This is the cheapest accurate path until classes carry a `course_id`
 * column. It works because `classes.level` already mirrors a level name.
 */
async function fetchCourseStats(courses: Course[]): Promise<Record<string, CourseStats>> {
  if (courses.length === 0) return {};
  const levelIds = Array.from(new Set(courses.flatMap((c) => c.level_ids)));
  if (levelIds.length === 0) {
    return Object.fromEntries(courses.map((c) => [c.id, EMPTY_STATS]));
  }

  const { data: levels } = await (supabase as any)
    .from("course_levels")
    .select("id, name")
    .in("id", levelIds);
  const nameById = new Map<string, string>();
  for (const l of (levels ?? []) as Array<{ id: string; name: string }>) {
    nameById.set(l.id, l.name);
  }

  const allLevelNames = Array.from(new Set(
    courses.flatMap((c) => c.level_ids.map((id) => nameById.get(id)).filter(Boolean) as string[]),
  ));
  if (allLevelNames.length === 0) {
    return Object.fromEntries(courses.map((c) => [c.id, EMPTY_STATS]));
  }

  const { data: classes } = await (supabase as any)
    .from("classes")
    .select("id, level, student_count, lifecycle_status, student_ids")
    .in("level", allLevelNames);

  const out: Record<string, CourseStats> = {};
  for (const c of courses) {
    const ownLevelNames = new Set(
      c.level_ids.map((id) => nameById.get(id)).filter(Boolean) as string[],
    );
    const matched = ((classes ?? []) as any[]).filter((cls) =>
      cls.level && ownLevelNames.has(cls.level),
    );
    const studentSet = new Set<string>();
    let active = 0;
    for (const cls of matched) {
      const status = (cls.lifecycle_status ?? "").toLowerCase();
      if (["active", "in_progress", "ongoing", "upcoming", "scheduled"].includes(status)) active++;
      const ids = Array.isArray(cls.student_ids) ? cls.student_ids : [];
      for (const id of ids) if (typeof id === "string") studentSet.add(id);
    }
    out[c.id] = {
      totalClasses: matched.length,
      activeClasses: active,
      uniqueStudents: studentSet.size,
    };
  }
  return out;
}

/* ────────────────────────────────────────────────────────────────────────── */

export function useCourses(opts: { programId?: string; withStats?: boolean } = {}) {
  const { programId, withStats = true } = opts;
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<Record<string, CourseStats>>({});
  const [studyPlanNames, setStudyPlanNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchCourses(programId);
      setCourses(list);
      if (withStats) {
        const s = await fetchCourseStats(list);
        setStats(s);
      }
      // Resolve study plan template names cho các course đang hiển thị
      const allTemplateIds = Array.from(
        new Set(list.flatMap((c) => c.study_plan_ids)),
      );
      if (allTemplateIds.length > 0) {
        const { data: tpls } = await (supabase as any)
          .from("study_plan_templates")
          .select("id, template_name")
          .in("id", allTemplateIds);
        const map: Record<string, string> = {};
        for (const t of (tpls ?? []) as Array<{ id: string; template_name: string }>) {
          map[t.id] = t.template_name;
        }
        setStudyPlanNames(map);
      } else {
        setStudyPlanNames({});
      }
    } catch (e: any) {
      setError(e?.message ?? "fetch failed");
    } finally {
      setLoading(false);
    }
  }, [programId, withStats]);

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    const channel = (supabase as any)
      .channel(`courses-sync-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "courses" }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "course_level_links" }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "course_study_plans" }, () => refetch())
      .subscribe();
    return () => { try { (supabase as any).removeChannel(channel); } catch { /* noop */ } };
  }, [refetch]);

  const getStats = useMemo(() => (courseId: string): CourseStats =>
    stats[courseId] ?? EMPTY_STATS, [stats]);

  const getStudyPlanNames = useMemo(
    () => (templateIds: string[]): Array<{ id: string; name: string }> =>
      templateIds.map((id) => ({ id, name: studyPlanNames[id] ?? "Plan" })),
    [studyPlanNames],
  );

  /* ── CRUD ─────────────────────────────────────────────────────────────── */
  async function syncLevels(courseId: string, levelIds: string[]) {
    await (supabase as any).from("course_level_links").delete().eq("course_id", courseId);
    if (levelIds.length === 0) return;
    const rows = levelIds.map((level_id, idx) => ({ course_id: courseId, level_id, sort_order: idx }));
    const { error } = await (supabase as any).from("course_level_links").insert(rows);
    if (error) throw error;
  }

  async function syncStudyPlans(courseId: string, templateIds: string[]) {
    await (supabase as any).from("course_study_plans").delete().eq("course_id", courseId);
    if (templateIds.length === 0) return;
    const rows = templateIds.map((template_id, idx) => ({
      course_id: courseId, template_id, sort_order: idx, is_default: idx === 0,
    }));
    const { error } = await (supabase as any).from("course_study_plans").insert(rows);
    if (error) throw error;
  }

  async function create(input: CourseInput) {
    const { level_ids = [], study_plan_ids = [], ...payload } = input;
    const { data, error } = await (supabase as any)
      .from("courses")
      .insert({
        program_id: payload.program_id,
        name: payload.name,
        slug: payload.slug ?? null,
        description: payload.description ?? null,
        long_description: payload.long_description ?? null,
        outcomes: payload.outcomes ?? [],
        color_key: payload.color_key ?? null,
        icon_key: payload.icon_key ?? null,
        sort_order: payload.sort_order ?? 0,
        status: payload.status ?? "active",
        target_audience: payload.target_audience ?? null,
        problem_solving: payload.problem_solving ?? null,
        price_vnd: payload.price_vnd ?? null,
        duration_label: payload.duration_label ?? null,
        total_sessions: payload.total_sessions ?? null,
        hours_per_session: payload.hours_per_session ?? null,
        max_students: payload.max_students ?? null,
        cefr_range: payload.cefr_range ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;
    if (data?.id) {
      await syncLevels(data.id, level_ids);
      await syncStudyPlans(data.id, study_plan_ids);
    }
    await refetch();
  }

  async function update(id: string, input: CourseInput) {
    const { level_ids = [], study_plan_ids = [], ...payload } = input;
    const { error } = await (supabase as any)
      .from("courses")
      .update({
        program_id: payload.program_id,
        name: payload.name,
        slug: payload.slug ?? null,
        description: payload.description ?? null,
        long_description: payload.long_description ?? null,
        outcomes: payload.outcomes ?? [],
        color_key: payload.color_key ?? null,
        icon_key: payload.icon_key ?? null,
        sort_order: payload.sort_order ?? 0,
        status: payload.status ?? "active",
        target_audience: payload.target_audience ?? null,
        problem_solving: payload.problem_solving ?? null,
        price_vnd: payload.price_vnd ?? null,
        duration_label: payload.duration_label ?? null,
        total_sessions: payload.total_sessions ?? null,
        hours_per_session: payload.hours_per_session ?? null,
        max_students: payload.max_students ?? null,
        cefr_range: payload.cefr_range ?? null,
      })
      .eq("id", id);
    if (error) throw error;
    await syncLevels(id, level_ids);
    await syncStudyPlans(id, study_plan_ids);
    await refetch();
  }

  async function remove(id: string) {
    const { error } = await (supabase as any).from("courses").delete().eq("id", id);
    if (error) throw error;
    await refetch();
  }

  return {
    courses, loading, error, refetch,
    getStats, getStudyPlanNames,
    create, update, remove,
  };
}