import { useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type {
  TeacherAvailabilityDraft,
  TeacherRecordLite,
  TeacherCapability,
  TeachngoClassLite,
} from "@shared/types/availability";
import { normalizeRules, normalizeExceptions, relationMissing } from "@shared/utils/availability";

export interface DraftWithTeacher extends TeacherAvailabilityDraft {
  teacher?: TeacherRecordLite | null;
  capability?: TeacherCapability | null;
}

export interface ProgramLite {
  id: string;
  key: string;
  name: string;
  program_key: string | null;
  level: string | null;
  color_key: string | null;
  sort_order: number;
}

interface AvailabilityDraftsData {
  drafts: DraftWithTeacher[];
  classes: TeachngoClassLite[];
  classSessions: any[];
  programs: ProgramLite[];
  setupMissing: boolean;
  errorMessage?: string;
}

async function loadDrafts(): Promise<AvailabilityDraftsData> {
  const today = new Date().toISOString().slice(0, 10);
  const [draftsRes, teachersRes, capsRes, classesRes, sessionsRes, programsRes] = await Promise.all([
    (supabase.from as any)("teacher_availability_drafts").select("*").order("created_at", { ascending: false }),
    supabase.from("teachers").select("id, full_name, email, phone, status, linked_user_id, subjects, classes"),
    (supabase.from as any)("teacher_capabilities").select("*"),
    supabase.from("teachngo_classes").select("id, class_name, teacher_id, status, level, program, schedule, class_type, room, default_start_time, default_end_time"),
    (supabase.from as any)("class_sessions").select("*").gte("session_date", today),
    (supabase.from as any)("programs").select("id, key, name, program_key, level, color_key, sort_order").eq("is_active", true).order("sort_order", { ascending: true }),
  ]);

  if (draftsRes.error) {
    if (relationMissing(draftsRes.error)) {
      return { drafts: [], classes: [], classSessions: [], programs: [], setupMissing: true, errorMessage: "Bảng teacher_availability_drafts chưa tồn tại — apply migration availability trước." };
    }
    return { drafts: [], classes: [], classSessions: [], programs: [], setupMissing: false, errorMessage: String(draftsRes.error.message || draftsRes.error) };
  }

  const teachers = (teachersRes.data as TeacherRecordLite[]) || [];
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const caps = capsRes.error ? [] : ((capsRes.data as TeacherCapability[]) || []);
  const capMap = new Map(caps.map((c) => [c.teacher_id, c]));

  const drafts = ((draftsRes.data as TeacherAvailabilityDraft[]) || []).map((d) => ({
    ...d,
    availability_rules: normalizeRules((d as any).availability_rules, d.teacher_id),
    availability_exceptions: normalizeExceptions((d as any).availability_exceptions, d.teacher_id),
    teacher: teacherMap.get(d.teacher_id) || null,
    capability: capMap.get(d.teacher_id) || null,
  })) as DraftWithTeacher[];

  return {
    drafts,
    classes: (classesRes.data as TeachngoClassLite[]) || [],
    classSessions: sessionsRes.error && relationMissing(sessionsRes.error) ? [] : ((sessionsRes.data as any[]) || []),
    programs: programsRes.error ? [] : ((programsRes.data as ProgramLite[]) || []),
    setupMissing: false,
  };
}

export function useAvailabilityDrafts() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["availability-drafts-admin"],
    queryFn: loadDrafts,
    staleTime: 30_000,
  });

  const qcRef = useRef(qc);
  qcRef.current = qc;

  useEffect(() => {
    const channel: RealtimeChannel = supabase
      .channel(`availability-drafts-admin-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "teacher_availability_drafts" },
        () => {
          qcRef.current.invalidateQueries({ queryKey: ["availability-drafts-admin"] });
        },
      )
      .subscribe();
    return () => {
      try { supabase.removeChannel(channel); } catch { /* noop */ }
    };
  }, []);

  return query;
}

export function usePendingDraftCount() {
  const { data } = useAvailabilityDrafts();
  return useMemo(() => (data?.drafts || []).filter((d) => d.status === "pending").length, [data]);
}

export function useReviewDraftMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { draftId: string; newStatus: "needs_changes" | "rejected"; reviewNote: string }) => {
      const { data, error } = await (supabase as any).rpc("review_availability_draft", {
        p_draft_id: params.draftId,
        p_new_status: params.newStatus,
        p_review_note: params.reviewNote,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["availability-drafts-admin"] }),
  });
}

export function useApproveAndApplyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { draftId: string; reviewNote?: string | null }) => {
      const { data, error } = await (supabase as any).rpc("approve_and_apply_availability", {
        p_draft_id: params.draftId,
        p_review_note: params.reviewNote ?? null,
      });
      if (error) throw error;
      return data as { rules_inserted?: number; exceptions_inserted?: number } | null;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["availability-drafts-admin"] }),
  });
}
