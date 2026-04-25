import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeacherSlot {
  weekday: number;       // 0-6 or 1-7 depending on backend
  start_time: string;    // "HH:MM"
  end_time: string;
  mode?: "online" | "offline" | "hybrid" | null;
  effective_from?: string;
  effective_to?: string | null;
}

export interface TeacherSlotsParams {
  teacher_ids: string[];
  from_date: string;     // YYYY-MM-DD
  to_date: string;       // YYYY-MM-DD
  program_key?: string | null;
}

// Normalize Postgres `time` (HH:MM:SS) → "HH:MM" for UI consistency.
const trimTime = (t: unknown): string => (typeof t === "string" ? t.slice(0, 5) : "");

/**
 * Returns available slots intersection across all selected teachers.
 * Calls get_teacher_available_slots RPC for each teacher and intersects by (weekday|start|end|mode).
 *
 * RPC returns: { teacher_id, from_date, to_date, slot_count, slots: TeacherSlot[] }
 * — read `data.slots`, NOT `data`.
 */
export function useTeacherSlots(params: TeacherSlotsParams | null) {
  return useQuery({
    queryKey: ["teacher-slots", params],
    enabled: !!params && params.teacher_ids.length > 0 && !!params.from_date && !!params.to_date,
    queryFn: async (): Promise<TeacherSlot[]> => {
      if (!params) return [];
      const lists: TeacherSlot[][] = [];
      for (const tid of params.teacher_ids) {
        const { data, error } = await (supabase.rpc as any)("get_teacher_available_slots", {
          p_teacher_id: tid,
          p_from_date: params.from_date,
          p_to_date: params.to_date,
          p_program_key: params.program_key ?? null,
        });
        if (error) throw error;
        const payload = (data ?? {}) as { slots?: Array<Record<string, unknown>> };
        const rawSlots = Array.isArray(payload.slots) ? payload.slots : [];
        const slots: TeacherSlot[] = rawSlots.map((s) => ({
          weekday: Number(s.weekday),
          start_time: trimTime(s.start_time),
          end_time: trimTime(s.end_time),
          mode: (s.mode as TeacherSlot["mode"]) ?? null,
          effective_from: (s.effective_from as string | undefined) ?? undefined,
          effective_to: (s.effective_to as string | null | undefined) ?? null,
        }));
        lists.push(slots);
      }
      if (lists.length === 0) return [];
      const key = (s: TeacherSlot) => `${s.weekday}|${s.start_time}|${s.end_time}|${s.mode ?? ""}`;
      const [first, ...rest] = lists;
      return first.filter((s) => rest.every((arr) => arr.some((x) => key(x) === key(s))));
    },
  });
}