import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * useCreateClassWithTemplate — atomic creation when class is bound to a
 * study_plan_template. The wrapper RPC `create_class_with_template_atomic`
 * runs 3 steps in a single transaction:
 *   1. create class via create_class_atomic (without study_plan_id)
 *   2. clone the template into a study_plans instance via clone_template_to_plan
 *   3. link the new class to the cloned plan
 * Failure at any step rolls back the whole thing → no orphan class.
 *
 * Returns the new class_id (uuid) directly. Use useCreateClass when the class
 * has no template (e.g. Customized) — that hook still calls create_class_atomic.
 */

export interface CreateClassWithTemplatePayload {
  p_class_data: {
    class_name: string;
    course_title?: string | null;
    /** Issue #2 fix Day 6: persist course_id qua RPC payload (was silent-failing
     *  via post-create set_class_course_id → all app_classes.course_id NULL →
     *  class_code falls back to 'CLS'). Wrapper RPC nên honor field này. */
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
    leaderboard_enabled?: boolean;
    // study_plan_id is intentionally absent — wrapper sets it after cloning.
  };
  p_template_id: string;
  p_start_date: string;             // YYYY-MM-DD
  p_end_date: string;               // YYYY-MM-DD
  p_schedule_pattern: { type: "weekly"; days: string[] };  // days: ["mon","wed","fri"]
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

export function useCreateClassWithTemplate() {
  return useMutation<string, Error, CreateClassWithTemplatePayload>({
    mutationFn: async (payload) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("create_class_with_template_atomic", payload);
      if (error) throw error;
      return data as string;
    },
  });
}
