/**
 * React Query hooks wrapping the 5 performance RPCs + student_notes.
 * All data flows through these — never recompute lifetime/course grade in components.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  StudentLifetime,
  CourseGrade,
  ClassOverview,
  TeacherOverview,
  SchoolOverview,
} from "@shared/utils/performance";

export function useStudentLifetime(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["student-lifetime", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_student_lifetime" as any, { p_user_id: userId });
      if (error) throw error;
      return data as unknown as StudentLifetime | null;
    },
  });
}

export function useStudentCourseGrade(userId: string | null | undefined, classId: string | null | undefined) {
  return useQuery({
    queryKey: ["student-course-grade", userId, classId],
    enabled: !!userId && !!classId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_student_course_grade" as any, {
        p_user_id: userId, p_class_id: classId,
      });
      if (error) throw error;
      return data as unknown as CourseGrade | null;
    },
  });
}

export function useClassOverview(classId: string | null | undefined) {
  return useQuery({
    queryKey: ["class-overview", classId],
    enabled: !!classId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_class_overview" as any, { p_class_id: classId });
      if (error) throw error;
      return data as unknown as ClassOverview | null;
    },
  });
}

export function useTeacherOverview(teacherUserId?: string | null) {
  return useQuery({
    queryKey: ["teacher-overview", teacherUserId ?? "self"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_teacher_overview" as any, {
        p_teacher_user_id: teacherUserId ?? null,
      });
      if (error) throw error;
      return data as unknown as TeacherOverview | null;
    },
  });
}

export function useSchoolOverview() {
  return useQuery({
    queryKey: ["school-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_school_overview" as any);
      if (error) throw error;
      return data as unknown as SchoolOverview | null;
    },
  });
}

/* ───── Student Notes ───── */

export type NoteCategory = "general" | "academic" | "behavior" | "parent_meeting" | "other";

export const NOTE_CATEGORY_LABELS: Record<NoteCategory, string> = {
  general: "Chung",
  academic: "Học thuật",
  behavior: "Hành vi",
  parent_meeting: "Họp phụ huynh",
  other: "Khác",
};

export interface StudentNote {
  id: string;
  student_id: string;
  author_id: string;
  author_role: "teacher" | "admin" | "super_admin";
  class_id: string | null;
  title: string | null;
  body: string;
  category: NoteCategory;
  is_public: boolean;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export function useStudentNotes(studentId: string | null | undefined, opts?: { onlyPublic?: boolean }) {
  return useQuery({
    queryKey: ["student-notes", studentId, opts?.onlyPublic],
    enabled: !!studentId,
    queryFn: async () => {
      let q = supabase.from("student_notes" as any)
        .select("*")
        .eq("student_id", studentId!)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (opts?.onlyPublic) q = q.eq("is_public", true);
      const { data, error } = await q as any;
      if (error) throw error;
      return (data || []) as StudentNote[];
    },
  });
}

export function useUpsertStudentNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (note: Partial<StudentNote> & { student_id: string; body: string; author_role: StudentNote["author_role"] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const payload: any = { ...note, author_id: user.id };
      if (note.id) {
        const { error } = await supabase.from("student_notes" as any).update(payload).eq("id", note.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("student_notes" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["student-notes", vars.student_id] });
    },
  });
}

export function useDeleteStudentNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; student_id: string }) => {
      const { error } = await supabase.from("student_notes" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["student-notes", vars.student_id] });
    },
  });
}
