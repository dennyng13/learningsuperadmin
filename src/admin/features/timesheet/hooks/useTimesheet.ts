import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  TimesheetPeriodListItem,
  TimesheetPeriodStatus,
  TimesheetPeriodWithEntries,
} from "../types";

// Until `npm run sync:types` regenerates Database types, the timesheet RPCs
// don't appear on the auto-generated `Database` enum. Cast through `any` so
// the call sites stay typed against our local mirror types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (name: string, args?: Record<string, unknown>) => supabase.rpc(name as any, args as any);

export interface PeriodListFilters {
  teacherId?: string | null;
  monthStart?: string | null; // "YYYY-MM-01"
  status?: TimesheetPeriodStatus | "all" | null;
}

export function useTimesheetPeriodList(filters: PeriodListFilters) {
  const [data, setData] = useState<TimesheetPeriodListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: rows, error: err } = await rpc("timesheet_period_list", {
      p_teacher_id: filters.teacherId ?? null,
      p_month_start: filters.monthStart ?? null,
      p_status: filters.status && filters.status !== "all" ? filters.status : null,
    });
    if (err) {
      setError(err.message);
      setData([]);
    } else {
      setData((rows as TimesheetPeriodListItem[]) ?? []);
    }
    setLoading(false);
  }, [filters.teacherId, filters.monthStart, filters.status]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useTimesheetPeriodDetail(periodId: string | undefined) {
  const [data, setData] = useState<TimesheetPeriodWithEntries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!periodId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data: result, error: err } = await rpc("timesheet_period_get_with_entries", {
      p_period_id: periodId,
    });
    if (err) {
      setError(err.message);
      setData(null);
    } else {
      setData(result as unknown as TimesheetPeriodWithEntries);
    }
    setLoading(false);
  }, [periodId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

// Mutations -------------------------------------------------------------------

export async function approvePeriod(periodId: string, message?: string) {
  const { error } = await rpc("timesheet_period_approve", {
    p_period_id: periodId,
    p_message: message ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function requestPeriodRevision(periodId: string, message: string) {
  const { error } = await rpc("timesheet_period_request_revision", {
    p_period_id: periodId,
    p_message: message,
  });
  if (error) throw new Error(error.message);
}

export async function lockPeriod(periodId: string) {
  const { error } = await rpc("timesheet_period_lock", { p_period_id: periodId });
  if (error) throw new Error(error.message);
}

export async function reopenPeriod(periodId: string) {
  const { error } = await rpc("timesheet_period_reopen", { p_period_id: periodId });
  if (error) throw new Error(error.message);
}

// Admin can also auto-create / refresh a teacher's period from class_sessions.
export async function getOrCreatePeriod(teacherId: string, monthStart: string) {
  const { data, error } = await rpc("timesheet_period_get_or_create", {
    p_teacher_id: teacherId,
    p_month_start: monthStart,
    p_sync_existing: true,
  });
  if (error) throw new Error(error.message);
  return data as string;
}
