import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface StudyPlanTemplate {
  id: string;
  template_name: string;
  description: string | null;
  program: string | null;
  assigned_level: string | null;
  course_id: string | null;
  plan_type: string;
  skills: string[];
  total_sessions: number;
  session_duration: number;
  schedule_pattern: { type?: string; days?: string[] } | null;
  exercise_ids: string[];
  flashcard_set_ids: string[];
  materials_links: { label: string; url: string }[];
  teacher_notes: string;
  current_score: Record<string, number>;
  target_score: Record<string, number>;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  entries?: StudyPlanTemplateEntry[];
}

export interface StudyPlanTemplateEntry {
  id: string;
  template_id: string;
  session_order: number;
  day_offset: number | null;
  session_type: string | null;
  skills: string[];
  homework: string;
  class_note: string;
  class_note_files: any[];
  class_note_visible: boolean;
  links: { label: string; url: string }[];
  exercise_ids: string[];
  flashcard_set_ids: string[];
  assessment_ids: string[];
}

const cast = <T,>(d: any): T => d as unknown as T;

/** List all templates (admin sees all, teacher sees own) */
export function useStudyPlanTemplates() {
  return useQuery({
    queryKey: ["study-plan-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_plan_templates")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return cast<StudyPlanTemplate[]>(data || []);
    },
  });
}

/** Single template + entries */
export function useStudyPlanTemplate(templateId: string | null) {
  return useQuery({
    queryKey: ["study-plan-template", templateId],
    enabled: !!templateId,
    queryFn: async () => {
      const { data: tpl, error } = await supabase
        .from("study_plan_templates")
        .select("*")
        .eq("id", templateId!)
        .single();
      if (error) throw error;
      const { data: entries } = await supabase
        .from("study_plan_template_entries")
        .select("*")
        .eq("template_id", templateId!)
        .order("session_order", { ascending: true });
      return { ...cast<StudyPlanTemplate>(tpl), entries: cast<StudyPlanTemplateEntry[]>(entries || []) };
    },
  });
}

/** CRUD mutations for templates */
export function useTemplateMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const upsertTemplate = useMutation({
    mutationFn: async (tpl: Partial<StudyPlanTemplate>) => {
      const { entries, ...header } = tpl as any;
      // Sanitize: empty-string course_id is invalid for UUID column → null.
      // Same defensive cleanup for assigned_level (text but UI uses "" sentinel).
      if (header.course_id === "" || header.course_id === undefined) header.course_id = null;
      if (header.assigned_level === "") header.assigned_level = null;
      if (header.id) {
        const { error } = await supabase
          .from("study_plan_templates")
          .update(header)
          .eq("id", header.id);
        if (error) throw error;
        return header.id as string;
      }
      const { data, error } = await supabase
        .from("study_plan_templates")
        .insert({ ...header, created_by: user?.id })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["study-plan-templates"] });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("study_plan_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["study-plan-templates"] });
    },
  });

  const bulkUpsertEntries = useMutation({
    mutationFn: async ({ templateId, entries }: { templateId: string; entries: Omit<StudyPlanTemplateEntry, "id" | "template_id">[] }) => {
      await supabase.from("study_plan_template_entries").delete().eq("template_id", templateId);
      if (entries.length > 0) {
        const rows = entries.map((e, i) => ({
          ...e,
          template_id: templateId,
          session_order: e.session_order ?? i + 1,
        }));
        const { error } = await supabase.from("study_plan_template_entries").insert(rows as any);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["study-plan-template", vars.templateId] });
      qc.invalidateQueries({ queryKey: ["study-plan-templates"] });
    },
  });

  /** Clone a template into a new study_plan via RPC */
  const cloneTemplate = useMutation({
    mutationFn: async (params: {
      templateId: string;
      classIds?: string[];
      studentIds?: string[];
      startDate?: string;
      endDate?: string;
      schedulePattern?: any;
      excludedDates?: string[];
      planNameOverride?: string;
    }) => {
      const { data, error } = await supabase.rpc("clone_template_to_plan", {
        p_template_id: params.templateId,
        p_class_ids: params.classIds ?? null,
        p_student_ids: params.studentIds ?? null,
        p_start_date: params.startDate ?? null,
        p_end_date: params.endDate ?? null,
        p_schedule_pattern: params.schedulePattern ?? null,
        p_excluded_dates: params.excludedDates ?? null,
        p_plan_name_override: params.planNameOverride ?? null,
      } as any);
      if (error) throw error;
      const planId = data as string;
      // Propagate course_id từ template → plan (RPC server-side chưa biết về
      // course_id mới). Best-effort: ignore lỗi để không block luồng clone.
      try {
        const { data: tpl } = await supabase
          .from("study_plan_templates")
          .select("course_id")
          .eq("id", params.templateId)
          .maybeSingle();
        const courseId = (tpl as any)?.course_id ?? null;
        if (courseId) {
          await (supabase as any)
            .from("study_plans")
            .update({ course_id: courseId })
            .eq("id", planId);
        }
      } catch (e) {
        console.warn("[cloneTemplate] propagate course_id failed", e);
      }
      return planId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-study-plans"] });
      qc.invalidateQueries({ queryKey: ["teacher-study-plans"] });
    },
  });

  /** Push changes from an instance back to its source template (admin only) */
  const syncToTemplate = useMutation({
    mutationFn: async (planId: string) => {
      const { data, error } = await supabase.rpc("sync_plan_to_template", { p_plan_id: planId } as any);
      if (error) throw error;
      return data as boolean;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["study-plan-templates"] });
      qc.invalidateQueries({ queryKey: ["admin-study-plans"] });
    },
  });

  return { upsertTemplate, deleteTemplate, bulkUpsertEntries, cloneTemplate, syncToTemplate };
}
