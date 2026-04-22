import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AvailableTeacherSlotParams {
  weekdays: number[]; // 0-6 (Sun-Sat) or 1-7 depending on backend; we pass as-is
  start_time: string; // "HH:MM"
  end_time: string;
  mode: "online" | "offline" | "hybrid";
  program_key?: string | null;
}

export interface AvailableTeacher {
  teacher_id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  matching_reasons?: string[];
  weekly_minutes?: number;
  active_class_count?: number;
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