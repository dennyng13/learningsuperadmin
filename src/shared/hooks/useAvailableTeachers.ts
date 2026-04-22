import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AvailableTeacherSlotParams {
  weekdays: number[]; // Backend convention: Sun=0..Sat=6
  start_time: string; // "HH:MM"
  end_time: string;
  mode: "online" | "offline" | "hybrid";
  program_key?: string | null;
}

export interface AvailableTeacher {
  teacher_id: string;
  full_name: string;
  email?: string | null;
  matching_rule_id?: string | null;
  rule_start?: string | null;       // e.g. "19:00:00"
  rule_end?: string | null;
  rule_mode?: "online" | "offline" | "hybrid" | null;
  effective_from?: string | null;
  effective_to?: string | null;
  has_conflict?: boolean;
}

/**
 * Calls find_available_teachers_for_slot RPC for EACH selected weekday,
 * then returns the intersection (teachers free in ALL selected weekdays).
 */
export function useAvailableTeachers(params: AvailableTeacherSlotParams | null) {
  return useQuery({
    queryKey: ["available-teachers", params],
    enabled: !!params && params.weekdays.length > 0 && !!params.start_time && !!params.end_time,
    queryFn: async (): Promise<AvailableTeacher[]> => {
      if (!params) return [];
      const results: AvailableTeacher[][] = [];
      for (const wd of params.weekdays) {
        const { data, error } = await (supabase.rpc as any)("find_available_teachers_for_slot", {
          p_weekday: wd,
          p_start_time: params.start_time,
          p_end_time: params.end_time,
          p_mode: params.mode,
          p_program_key: params.program_key ?? null,
        });
        if (error) throw error;
        results.push((data as AvailableTeacher[]) || []);
      }
      if (results.length === 0) return [];
      // Intersection by teacher_id
      const [first, ...rest] = results;
      const intersect = first.filter((t) => rest.every((arr) => arr.some((x) => x.teacher_id === t.teacher_id)));
      return intersect;
    },
  });
}