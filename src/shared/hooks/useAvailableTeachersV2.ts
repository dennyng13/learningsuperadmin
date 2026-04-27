// Stage P2 — wraps find_available_teachers_for_slot_v2 RPC.
//
// Calls the RPC once per selected weekday and returns the intersection
// (teachers whose availability rules cover ALL selected weekdays) — same
// "all-of" semantics as v1's useAvailableTeachers, but the rows now carry
// scoring fields (capability_match_score, workload_score, revenue_score,
// total_score) which the wizard surfaces as badges.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AvailableTeacherV2Params {
  weekdays: number[];               // Backend convention: Sun=0..Sat=6
  start_time: string;               // "HH:MM"
  end_time: string;
  mode: "online" | "offline" | "hybrid";
  program_key?: string | null;
  level_key?: string | null;
}

export interface AvailableTeacherV2 {
  teacher_id: string;
  full_name: string;
  email?: string | null;
  matching_rule_id?: string | null;
  rule_start?: string | null;
  rule_end?: string | null;
  rule_mode?: "online" | "offline" | "hybrid" | null;
  effective_from?: string | null;
  effective_to?: string | null;
  has_conflict?: boolean;
  // Scoring (v2)
  capability_match_score?: number;
  workload_score?: number;
  revenue_score?: number;
  total_score?: number;
  sessions_next_28d?: number;
  avg_gross_vnd_6mo?: number | string | null;
  is_new_teacher?: boolean;
}

export function useAvailableTeachersV2(params: AvailableTeacherV2Params | null) {
  return useQuery({
    queryKey: ["available-teachers-v2", params],
    enabled: !!params && params.weekdays.length > 0 && !!params.start_time && !!params.end_time,
    queryFn: async (): Promise<AvailableTeacherV2[]> => {
      if (!params) return [];
      const results: AvailableTeacherV2[][] = [];
      for (const wd of params.weekdays) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.rpc as any)("find_available_teachers_for_slot_v2", {
          p_weekday: wd,
          p_start_time: params.start_time,
          p_end_time: params.end_time,
          p_mode: params.mode,
          p_program_key: params.program_key ?? null,
          p_level_key: params.level_key ?? null,
        });
        if (error) throw error;
        results.push((data as AvailableTeacherV2[]) || []);
      }
      if (results.length === 0) return [];
      // Intersection by teacher_id; merge scoring from the first list.
      const [first, ...rest] = results;
      const intersect = first.filter((t) =>
        rest.every((arr) => arr.some((x) => x.teacher_id === t.teacher_id)),
      );
      // For multi-weekday queries, recompute has_conflict as OR over all days.
      return intersect.map((t) => {
        const allRows = [t, ...rest.flatMap((arr) => arr.filter((x) => x.teacher_id === t.teacher_id))];
        return {
          ...t,
          has_conflict: allRows.some((r) => r.has_conflict),
        };
      });
    },
  });
}
