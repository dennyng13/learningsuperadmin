// Stage P2 — wraps find_lowest_revenue_teachers RPC.
//
// Returns top-N active teachers ordered by 6-month gross-payroll average
// ASC, with new teachers (no payslip) first. Used by the wizard's
// "Theo doanh thu" mode to surface who needs more hours.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LowestRevenueTeacher {
  teacher_id: string;
  full_name: string;
  email?: string | null;
  avg_gross_vnd_6mo: number | string | null;
  payslip_count: number;
  is_new_teacher: boolean;
}

export interface UseLowestRevenueTeachersParams {
  enabled?: boolean;
  limit?: number;
  program_key?: string | null;
}

export function useLowestRevenueTeachers(params: UseLowestRevenueTeachersParams = {}) {
  const { enabled = true, limit = 20, program_key = null } = params;
  return useQuery({
    queryKey: ["lowest-revenue-teachers", limit, program_key],
    enabled,
    queryFn: async (): Promise<LowestRevenueTeacher[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("find_lowest_revenue_teachers", {
        p_limit: limit,
        p_program_key: program_key ?? null,
      });
      if (error) throw error;
      return (data as LowestRevenueTeacher[]) || [];
    },
    staleTime: 60_000,
  });
}
