import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CreateClassPayload {
  p_class_data: {
    class_name: string;
    course_title?: string | null;
    /** uuid trỏ vào courses.id — Issue #2 fix Day 6: persist trực tiếp qua RPC
     *  payload thay vì best-effort post-create set_class_course_id (đã silent fail).
     *  Backend RPC create_class_atomic cần honor field này; nếu chưa, frontend gửi
     *  vẫn harmless (extra field ignored). */
    course_id?: string | null;
    program: string;
    level?: string | null;
    class_type?: string | null;
    start_date: string;
    end_date: string;
    default_start_time?: string | null;
    default_end_time?: string | null;
    room?: string | null;
    max_students?: number | null;
    description?: string | null;
    study_plan_id?: string | null;
    leaderboard_enabled?: boolean;
  };
  p_primary_teacher_ids: string[];
  p_ta_teacher_ids: string[];
  p_sessions: Array<{
    session_date: string;
    start_time: string;
    end_time: string;
    mode?: string | null;
    room?: string | null;
    teacher_id: string;
  }>;
}

export interface CreateClassResult {
  class_id: string;
  sessions_created?: number;
  teachers_assigned?: number;
}

export function useCreateClass() {
  return useMutation<CreateClassResult, Error, CreateClassPayload>({
    mutationFn: async (payload) => {
      const { data, error } = await (supabase.rpc as any)("create_class_atomic", payload);
      if (error) throw error;
      return data as CreateClassResult;
    },
  });
}