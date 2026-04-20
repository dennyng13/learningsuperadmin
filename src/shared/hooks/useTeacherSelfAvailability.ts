import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
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

interface TeacherSelfAvailabilityData {
  teacher: TeacherRecordLite | null;
  classes: TeachngoClassLite[];
  classSessions: any[];
  rules: TeacherAvailabilityRule[];
  exceptions: TeacherAvailabilityException[];
  drafts: TeacherAvailabilityDraft[];
  capability: TeacherCapability | null;
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
    "teacher_capabilities",
  ].some((table) => message.includes(table));
}

function isAccessProblem(error: unknown) {
  if (!error) return false;
  const message = typeof error === "object" && error && "message" in error ? String((error as any).message).toLowerCase() : "";
  const code = typeof error === "object" && error && "code" in error ? String((error as any).code).toLowerCase() : "";
  return ["permission denied", "jwt", "not authenticated", "unauthorized", "forbidden", "rls"].some((token) => message.includes(token))
    || ["42501", "401", "403", "pgrst301"].includes(code);
}

async function loadTeacherSelfAvailabilityData(userId: string): Promise<TeacherSelfAvailabilityData> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: teacher, error: teacherError } = await supabase
    .from("teachers")
    .select("id, full_name, email, phone, status, linked_user_id, subjects, classes")
    .eq("linked_user_id", userId)
    .maybeSingle();

  if (teacherError) throw teacherError;

  if (!teacher) {
    return {
      teacher: null,
      classes: [],
      classSessions: [],
      rules: [],
      exceptions: [],
      drafts: [],
      capability: null,
      setupMissing: false,
      setupState: "ready",
    };
  }

  const teacherId = teacher.id;

  const [classesRes, draftsRes, rulesRes, exceptionsRes, capabilityRes, sessionsRes] = await Promise.all([
    supabase
      .from("teachngo_classes")
      .select("id, class_name, teacher_id, status, level, program, schedule, class_type, room, default_start_time, default_end_time")
      .eq("teacher_id", teacherId)
      .order("class_name"),
    (supabase.from as any)("teacher_availability_drafts")
      .select("*")
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false }),
    (supabase.from as any)("teacher_availability_rules")
      .select("*")
      .eq("teacher_id", teacherId)
      .order("effective_from", { ascending: false }),
    (supabase.from as any)("teacher_availability_exceptions")
      .select("*")
      .eq("teacher_id", teacherId)
      .gte("exception_date", today)
      .order("exception_date", { ascending: true }),
    (supabase.from as any)("teacher_capabilities")
      .select("*")
      .eq("teacher_id", teacherId)
      .maybeSingle(),
    (supabase.from as any)("class_sessions")
      .select("*")
      .eq("teacher_id", teacherId)
      .gte("session_date", today)
      .order("session_date", { ascending: true }),
  ]);

  const requiredErrors = [draftsRes.error, rulesRes.error, exceptionsRes.error, capabilityRes.error].filter(Boolean);
  if (requiredErrors.some(shouldTreatAsMissing)) {
    return {
      teacher: teacher as TeacherRecordLite,
      classes: (classesRes.data as TeachngoClassLite[]) ?? [],
      classSessions: [],
      rules: [],
      exceptions: [],
      drafts: [],
      capability: null,
      setupMissing: true,
      setupState: "missing_required_tables",
      setupMessage: "Thiếu bảng teacher_availability_* / teacher_capabilities trong DB dùng chung — hãy apply migration availability trước.",
    };
  }

  if (requiredErrors.length > 0) {
    const firstError = requiredErrors[0];
    return {
      teacher: teacher as TeacherRecordLite,
      classes: (classesRes.data as TeachngoClassLite[]) ?? [],
      classSessions: sessionsRes.error && relationMissing(sessionsRes.error) ? [] : (sessionsRes.data as any[]) ?? [],
      rules: [],
      exceptions: [],
      drafts: [],
      capability: null,
      setupMissing: false,
      setupState: "unavailable",
      setupMessage: isAccessProblem(firstError)
        ? "Tài khoản hiện tại chưa có quyền đọc dữ liệu lịch rảnh trong DB dùng chung."
        : `Không tải được dữ liệu lịch rảnh: ${String((firstError as any)?.message || "Unknown error")}`,
    };
  }

  return {
    teacher: teacher as TeacherRecordLite,
    classes: (classesRes.data as TeachngoClassLite[]) ?? [],
    classSessions: sessionsRes.error && relationMissing(sessionsRes.error) ? [] : (sessionsRes.data as any[]) ?? [],
    rules: normalizeRules(rulesRes.data as any[], teacherId),
    exceptions: normalizeExceptions(exceptionsRes.data as any[], teacherId),
    drafts: ((draftsRes.data as TeacherAvailabilityDraft[]) ?? []).map((draft) => ({
      ...draft,
      availability_rules: normalizeRules((draft as any).availability_rules, teacherId),
      availability_exceptions: normalizeExceptions((draft as any).availability_exceptions, teacherId),
    })),
    capability: capabilityRes.error && relationMissing(capabilityRes.error) ? null : ((capabilityRes.data as TeacherCapability | null) ?? null),
    setupMissing: false,
    setupState: "ready",
  };
}

export function useTeacherSelfAvailability() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["teacher-self-availability", user?.id],
    enabled: !!user?.id,
    queryFn: () => loadTeacherSelfAvailabilityData(user!.id),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!user?.id) return;

    const channel = (supabase as any)
      .channel(`teacher-self-availability-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teacher_availability_drafts" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["teacher-self-availability", user.id] });
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
  }, [queryClient, user?.id]);

  return query;
}