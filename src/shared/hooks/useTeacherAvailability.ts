import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  TeachngoClassLite,
  TeacherAvailabilityDraft,
  TeacherAvailabilityException,
  TeacherAvailabilityRule,
  TeacherCapability,
  TeacherRecordLite,
  TeacherAvailabilitySetupState,
} from "@shared/types/availability";
import { normalizeExceptions, normalizeRules, relationMissing } from "@shared/utils/availability";

interface TeacherAvailabilityData {
  teachers: TeacherRecordLite[];
  classes: TeachngoClassLite[];
  classSessions: any[];
  rules: TeacherAvailabilityRule[];
  exceptions: TeacherAvailabilityException[];
  drafts: TeacherAvailabilityDraft[];
  capabilities: TeacherCapability[];
  setupMissing: boolean;
  setupState: TeacherAvailabilitySetupState;
  setupMessage?: string;
}

function shouldTreatAsMissing(error: unknown) {
  if (!error || !relationMissing(error)) return false;
  const message = typeof error === "object" && error && "message" in error ? String((error as any).message).toLowerCase() : "";
  return [
    "teacher_availability_drafts",
    "teacher_availability_rules",
    "teacher_availability_exceptions",
  ].some((table) => message.includes(table));
}

function isAccessProblem(error: unknown) {
  if (!error) return false;
  const message = typeof error === "object" && error && "message" in error ? String((error as any).message).toLowerCase() : "";
  const code = typeof error === "object" && error && "code" in error ? String((error as any).code).toLowerCase() : "";
  return ["permission denied", "jwt", "not authenticated", "unauthorized", "forbidden", "rls"].some((token) => message.includes(token))
    || ["42501", "401", "403", "pgrst301"].includes(code);
}

async function loadTeacherAvailabilityData(): Promise<TeacherAvailabilityData> {
  const today = new Date().toISOString().slice(0, 10);
  const [teachersRes, classesRes, draftsRes, rulesRes, exceptionsRes, capabilitiesRes, sessionsRes] = await Promise.all([
    supabase.from("teachers").select("id, full_name, email, phone, status, linked_user_id, subjects, classes").order("full_name"),
    supabase.from("teachngo_classes").select("id, class_name, teacher_id, status, level, program, schedule, class_type, room, default_start_time, default_end_time").order("class_name"),
    (supabase.from as any)("teacher_availability_drafts").select("*").order("created_at", { ascending: false }),
    (supabase.from as any)("teacher_availability_rules").select("*").order("effective_from", { ascending: false }),
    (supabase.from as any)("teacher_availability_exceptions").select("*").gte("exception_date", today).order("exception_date", { ascending: true }),
    (supabase.from as any)("teacher_capabilities").select("*").order("teacher_id"),
    (supabase.from as any)("class_sessions").select("*").gte("session_date", today).order("session_date", { ascending: true }),
  ]);

  const requiredErrors = [draftsRes.error, rulesRes.error, exceptionsRes.error].filter(Boolean);
  if (requiredErrors.some(shouldTreatAsMissing)) {
    return {
      teachers: (teachersRes.data as TeacherRecordLite[]) ?? [],
      classes: (classesRes.data as TeachngoClassLite[]) ?? [],
      classSessions: [],
      rules: [],
      exceptions: [],
      drafts: [],
      capabilities: [],
      setupMissing: true,
      setupState: "missing_required_tables",
      setupMessage: "Thiếu bảng teacher_availability_* trong DB dùng chung — hãy apply file docs/teacher-availability-flow-assumption.sql trước.",
    };
  }

  if (requiredErrors.length > 0) {
    const firstError = requiredErrors[0];
    return {
      teachers: (teachersRes.data as TeacherRecordLite[]) ?? [],
      classes: (classesRes.data as TeachngoClassLite[]) ?? [],
      classSessions: sessionsRes.error && relationMissing(sessionsRes.error) ? [] : (sessionsRes.data as any[]) ?? [],
      rules: [],
      exceptions: [],
      drafts: [],
      capabilities: capabilitiesRes.error && relationMissing(capabilitiesRes.error) ? [] : ((capabilitiesRes.data as TeacherCapability[]) ?? []),
      setupMissing: false,
      setupState: "unavailable",
      setupMessage: isAccessProblem(firstError)
        ? "Không tải được module lịch rảnh vì tài khoản hiện tại chưa có quyền đọc bảng availability trong DB dùng chung."
        : `Không tải được dữ liệu availability: ${String((firstError as any)?.message || "Unknown error")}`,
    };
  }

  return {
    teachers: (teachersRes.data as TeacherRecordLite[]) ?? [],
    classes: (classesRes.data as TeachngoClassLite[]) ?? [],
    classSessions: sessionsRes.error && relationMissing(sessionsRes.error) ? [] : (sessionsRes.data as any[]) ?? [],
    rules: normalizeRules(rulesRes.data as any[]),
    exceptions: normalizeExceptions(exceptionsRes.data as any[]),
    drafts: ((draftsRes.data as TeacherAvailabilityDraft[]) ?? []).map((draft) => ({
      ...draft,
      availability_rules: normalizeRules((draft as any).availability_rules, draft.teacher_id),
      availability_exceptions: normalizeExceptions((draft as any).availability_exceptions, draft.teacher_id),
    })),
    capabilities: capabilitiesRes.error && relationMissing(capabilitiesRes.error) ? [] : ((capabilitiesRes.data as TeacherCapability[]) ?? []),
    setupMissing: false,
    setupState: "ready",
  };
}

export function useTeacherAvailability() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["teacher-availability-admin"],
    queryFn: loadTeacherAvailabilityData,
    staleTime: 30_000,
  });

  useEffect(() => {
    const channel = (supabase as any)
      .channel("teacher-availability-admin-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teacher_availability_drafts" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["teacher-availability-admin"] });
        },
      )
      .subscribe();

    return () => {
      try {
        (supabase as any).removeChannel(channel);
      } catch {
        // noop
      }
    };
  }, [queryClient]);

  return query;
}
