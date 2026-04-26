import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useTeacherAccessScope } from "./useTeacherAccessScope";

export interface ClassNoteFile {
  name: string;
  url: string;          // legacy public URL (for files uploaded before bucket became private)
  type: string;         // mime type
  path?: string;        // storage object path — used to generate signed URLs
}

export interface StudyPlanEntry {
  id: string;
  plan_id: string;
  entry_date: string;
  day_of_week: string | null;
  skills: string[];
  homework: string;
  class_note: string;
  class_note_files: ClassNoteFile[];
  class_note_visible: boolean;
  links: { label: string; url: string }[];
  plan_status: string | null;
  student_note: { text?: string; link?: string; imageUrl?: string; imageName?: string } | null;
  session_type: string | null;
  exercise_ids: string[];
  flashcard_set_ids: string[];
  assessment_ids: string[];
  attendance: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface StudyPlan {
  id: string;
  teachngo_student_id: string | null;
  test_date: string | null;
  progress: number;
  status: string;
  current_score: Record<string, number>;
  target_score: Record<string, number>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // New fields
  program: string | null;
  plan_name: string | null;
  plan_type: string;
  class_ids: string[];
  total_sessions: number;
  session_duration: number;
  skills: string[];
  materials_links: { label: string; url: string }[];
  exercise_ids: string[];
  flashcard_set_ids: string[];
  teacher_notes: string;
  assigned_level: string | null;
  student_ids: string[];
  schedule_pattern: { type?: string; days?: string[] } | null;
  start_date: string | null;
  end_date: string | null;
  excluded_dates: string[] | null;
  source_template_id?: string | null;
  is_template_dirty?: boolean;
  // Virtual
  entries?: StudyPlanEntry[];
  student_name?: string;
}

function castEntries(data: any[]): StudyPlanEntry[] {
  return data as unknown as StudyPlanEntry[];
}

function castPlan(p: any): StudyPlan {
  return p as unknown as StudyPlan;
}

/** Hook for the student side — loads ALL plans for the current logged-in user
 *  Covers: individual (teachngo_student_id), class-based (class_ids), and multi-student (student_ids) plans */
export function useMyStudyPlans() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-study-plans", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Find which teachngo_student this user is linked to
      const { data: students, error: stuErr } = await supabase
        .from("synced_students" as any)
        .select("teachngo_id, full_name")
        .eq("linked_user_id", user!.id);

      if (stuErr) console.warn("[useMyStudyPlans] teachngo_students error:", stuErr);
      if (!students || students.length === 0) {
        console.warn("[useMyStudyPlans] No teachngo_students linked to user", user!.id);
        return [];
      }

      const teachngoId = students[0].teachngo_id;
      const studentName = students[0].full_name;

      // Find which classes this student belongs to
      const { data: classLinks } = await supabase
        .from("class_students" as any)
        .select("class_id")
        .eq("teachngo_student_id", teachngoId);

      const classIds = (classLinks || []).map(c => c.class_id);

      // Fetch all plans where:
      // 1. teachngo_student_id matches OR
      // 2. student_ids array contains this student OR
      // 3. class_ids overlap with student's classes
      const { data: allPlans, error: plansErr } = await supabase
        .from("study_plans")
        .select("*")
        .order("created_at", { ascending: false });

      if (plansErr) console.warn("[useMyStudyPlans] study_plans error:", plansErr);
      if (!allPlans || allPlans.length === 0) {
        console.warn("[useMyStudyPlans] No plans returned by RLS for teachngoId", teachngoId);
        return [];
      }

      const matchedPlans = allPlans.filter((p: any) => {
        // Individual plan (legacy)
        if (p.teachngo_student_id === teachngoId) return true;
        const sids = Array.isArray(p.student_ids) ? p.student_ids : [];
        const pClassIds = Array.isArray(p.class_ids) ? p.class_ids : [];

        // Targeted plan: if student_ids[] is set, ONLY those students see it
        // (even if class_ids is auto-linked — class_ids is just metadata for context)
        if (sids.length > 0) {
          return sids.includes(teachngoId);
        }

        // Class-wide plan: no student_ids → everyone in the class sees it
        if (pClassIds.length > 0 && pClassIds.some((cid: string) => classIds.includes(cid))) {
          return true;
        }
        return false;
      });

      // Load entries for all matched plans
      const planIds = matchedPlans.map((p: any) => p.id);
      let entriesMap: Record<string, any[]> = {};
      if (planIds.length > 0) {
        const { data: entries } = await supabase
          .from("study_plan_entries")
          .select("*")
          .in("plan_id", planIds)
          .order("entry_date", { ascending: true });
        (entries || []).forEach((e: any) => {
          if (!entriesMap[e.plan_id]) entriesMap[e.plan_id] = [];
          entriesMap[e.plan_id].push(e);
        });
      }

      return matchedPlans.map((p: any) => ({
        ...castPlan(p),
        entries: castEntries(entriesMap[p.id] || []),
        student_name: studentName,
      })) as StudyPlan[];
    },
  });
}

/** @deprecated Use useMyStudyPlans instead — kept for backward compat */
export function useMyStudyPlan() {
  const { user } = useAuth();

  const planQuery = useQuery({
    queryKey: ["my-study-plan", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: students } = await supabase
        .from("synced_students" as any)
        .select("teachngo_id, full_name")
        .eq("linked_user_id", user!.id);

      if (!students || students.length === 0) return null;

      const teachngoId = students[0].teachngo_id;
      const studentName = students[0].full_name;

      const { data: plans } = await supabase
        .from("study_plans")
        .select("*")
        .eq("teachngo_student_id", teachngoId);

      if (!plans || plans.length === 0) return null;

      const plan = plans[0];

      const { data: entries } = await supabase
        .from("study_plan_entries")
        .select("*")
        .eq("plan_id", plan.id)
        .order("entry_date", { ascending: true });

      return {
        ...castPlan(plan),
        entries: castEntries(entries || []),
        student_name: studentName,
      } as StudyPlan;
    },
  });

  return planQuery;
}

/** Update entry status (done/delayed) or student_note */
export function useUpdateEntryStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ entryId, planStatus, studentNote }: {
      entryId: string;
      planStatus?: string | null;
      studentNote?: any;
    }) => {
      const update: any = {};
      if (planStatus !== undefined) update.plan_status = planStatus;
      if (studentNote !== undefined) update.student_note = studentNote;
      const { error } = await supabase
        .from("study_plan_entries")
        .update(update)
        .eq("id", entryId);
      if (error) throw error;
    },
    onMutate: async ({ entryId, planStatus, studentNote }) => {
      // Optimistic update for instant feedback
      await qc.cancelQueries({ queryKey: ["my-study-plans"] });
      const prev = qc.getQueryData<StudyPlan[]>(["my-study-plans"]);
      if (prev) {
        qc.setQueryData<StudyPlan[]>(["my-study-plans"], prev.map(p => ({
          ...p,
          entries: (p.entries || []).map(e =>
            e.id === entryId
              ? { ...e, ...(planStatus !== undefined ? { plan_status: planStatus } : {}), ...(studentNote !== undefined ? { student_note: studentNote } : {}) }
              : e
          ),
        })));
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["my-study-plans"], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["my-study-plan"] });
      qc.invalidateQueries({ queryKey: ["my-study-plans"] });
    },
  });
}

/** Hook for teacher side — loads ALL plans relevant to teacher's classes
 *  Covers: individual (teachngo_student_id), class-based (class_ids), and student_ids plans
 *  Admin/super_admin users see ALL plans */
export function useTeacherStudyPlans() {
  const { user } = useAuth();
  const { data: scope } = useTeacherAccessScope();

  return useQuery({
    queryKey: ["teacher-study-plans", user?.id, scope?.teacherId, scope?.canViewAllClasses],
    enabled: !!user,
    queryFn: async () => {
      // Admin/super_admin: return all plans (same as useAllStudyPlans)
      if (scope?.canViewAllClasses) {
        const { data: plans } = await supabase
          .from("study_plans")
          .select("*")
          .order("created_at", { ascending: false });

        if (!plans || plans.length === 0) return [];

        const studentIds = plans.map((p: any) => p.teachngo_student_id).filter(Boolean);
        let nameMap = new Map<string, string>();
        if (studentIds.length > 0) {
          const { data: students } = await supabase
            .from("synced_students" as any)
            .select("teachngo_id, full_name")
            .in("teachngo_id", studentIds);
          nameMap = new Map((students || []).map((s: any) => [s.teachngo_id, s.full_name]));
        }

        return plans.map((p: any) => ({
          ...castPlan(p),
          student_name: p.teachngo_student_id ? nameMap.get(p.teachngo_student_id) || "Unknown" : p.plan_name || "Kế hoạch lớp",
        })) as StudyPlan[];
      }

      // Teacher: filter by their classes/students
      if (!scope?.teacherId) return [];

      const { data: classes } = await supabase
        .from("classes" as any)
        .select("id")
        .eq("teacher_id", scope.teacherId);

      if (!classes || classes.length === 0) return [];

      const classIds = classes.map(c => c.id);
      const { data: classStudents } = await supabase
        .from("class_students" as any)
        .select("teachngo_student_id")
        .in("class_id", classIds);

      const studentIds = [...new Set((classStudents || []).map(cs => cs.teachngo_student_id))];

      const { data: allPlans } = await supabase
        .from("study_plans")
        .select("*")
        .order("created_at", { ascending: false });

      if (!allPlans || allPlans.length === 0) return [];

      const matchedPlans = allPlans.filter((p: any) => {
        if (p.teachngo_student_id && studentIds.includes(p.teachngo_student_id)) return true;
        const pClassIds = Array.isArray(p.class_ids) ? p.class_ids : [];
        if (pClassIds.length > 0 && pClassIds.some((cid: string) => classIds.includes(cid))) return true;
        const pStudentIds = Array.isArray(p.student_ids) ? p.student_ids : [];
        if (pStudentIds.length > 0 && pStudentIds.some((sid: string) => studentIds.includes(sid))) return true;
        return false;
      });

      if (studentIds.length > 0) {
        const { data: students } = await supabase
          .from("synced_students" as any)
          .select("teachngo_id, full_name")
          .in("teachngo_id", studentIds);

        const nameMap = new Map((students || []).map((s: any) => [s.teachngo_id, s.full_name]));

        return matchedPlans.map((p: any) => ({
          ...castPlan(p),
          student_name: p.teachngo_student_id ? nameMap.get(p.teachngo_student_id) || "Unknown" : p.plan_name || "Kế hoạch lớp",
        })) as StudyPlan[];
      }

      return matchedPlans.map((p: any) => ({
        ...castPlan(p),
        student_name: p.plan_name || "Kế hoạch lớp",
      })) as StudyPlan[];
    },
  });
}

/** Hook for admin side — loads all study plans with student names */
export function useAllStudyPlans() {
  return useQuery({
    queryKey: ["admin-study-plans"],
    queryFn: async () => {
      const { data: plans, error: plansErr } = await supabase
        .from("study_plans")
        .select("*")
        .order("created_at", { ascending: false });

      if (plansErr) {
        console.error("[useAllStudyPlans] fetch error:", plansErr);
        throw plansErr;
      }
      console.log("[useAllStudyPlans] loaded", plans?.length || 0, "plans");

      if (!plans || plans.length === 0) return [];

      // Get student names for plans that have teachngo_student_id
      const studentIds = plans.map((p: any) => p.teachngo_student_id).filter(Boolean);
      let nameMap = new Map<string, string>();
      if (studentIds.length > 0) {
        const { data: students } = await supabase
          .from("synced_students" as any)
          .select("teachngo_id, full_name")
          .in("teachngo_id", studentIds);
        nameMap = new Map((students || []).map((s: any) => [s.teachngo_id, s.full_name]));
      }

      return plans.map((p: any) => ({
        ...castPlan(p),
        student_name: p.teachngo_student_id ? nameMap.get(p.teachngo_student_id) || "Unknown" : p.plan_name || "Kế hoạch lớp",
      })) as StudyPlan[];
    },
  });
}

/** Load entries for a specific plan */
export function useStudyPlanEntries(planId: string | null) {
  return useQuery({
    queryKey: ["study-plan-entries", planId],
    enabled: !!planId,
    queryFn: async () => {
      const { data } = await supabase
        .from("study_plan_entries")
        .select("*")
        .eq("plan_id", planId!)
        .order("entry_date", { ascending: true });
      return castEntries(data || []);
    },
  });
}

/** Admin CRUD mutations */
export function useStudyPlanMutations() {
  const qc = useQueryClient();

  const upsertPlan = useMutation({
    mutationFn: async (plan: Partial<StudyPlan> & { teachngo_student_id?: string | null }) => {
      const { entries, student_name, ...planData } = plan as any;
      if (planData.id) {
        const { error } = await supabase
          .from("study_plans")
          .update(planData)
          .eq("id", planData.id);
        if (error) throw error;
        return planData.id;
      } else {
        const { data, error } = await supabase
          .from("study_plans")
          .insert(planData)
          .select("id")
          .single();
        if (error) throw error;
        return data.id;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-study-plans"] });
      qc.invalidateQueries({ queryKey: ["teacher-study-plans"] });
    },
  });

  const deletePlan = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase.from("study_plans").delete().eq("id", planId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-study-plans"] });
      qc.invalidateQueries({ queryKey: ["teacher-study-plans"] });
    },
  });

  const bulkUpsertEntries = useMutation({
    mutationFn: async ({ planId, entries }: { planId: string; entries: Omit<StudyPlanEntry, "id" | "created_at" | "updated_at">[] }) => {
      // Delete existing entries and re-insert
      await supabase.from("study_plan_entries").delete().eq("plan_id", planId);
      if (entries.length > 0) {
        const rows = entries.map(e => ({ ...e, plan_id: planId }));
        const { error } = await supabase.from("study_plan_entries").insert(rows as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["study-plan-entries"] });
      qc.invalidateQueries({ queryKey: ["admin-study-plans"] });
    },
  });

  return { upsertPlan, deletePlan, bulkUpsertEntries };
}
