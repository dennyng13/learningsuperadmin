import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  PayrollBatchDetail,
  PayrollBatchListItem,
  PayrollBatchStatus,
  PayrollPayslipDetail,
  PayrollPayslipListItem,
  PayrollPayslipStatus,
  PayrollAdjustmentType,
} from "../types";

// Until `npm run sync:types` regenerates Database types, the payroll RPCs
// don't appear on the auto-generated `Database` enum. Cast through `any` so
// the call sites stay typed against our local mirror types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (name: string, args?: Record<string, unknown>) => supabase.rpc(name as any, args as any);

// ─── Reads ──────────────────────────────────────────────────────────────────

export function usePayrollBatchList(filters: {
  monthStart?: string | null;
  status?: PayrollBatchStatus | "all" | null;
}) {
  const [data, setData] = useState<PayrollBatchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: rows, error: err } = await rpc("payroll_batch_list", {
      p_month_start: filters.monthStart ?? null,
      p_status: filters.status && filters.status !== "all" ? filters.status : null,
    });
    if (err) {
      setError(err.message);
      setData([]);
    } else {
      setData((rows as PayrollBatchListItem[]) ?? []);
    }
    setLoading(false);
  }, [filters.monthStart, filters.status]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { data, loading, error, refresh };
}

export function usePayrollBatchDetail(batchId: string | undefined) {
  const [data, setData] = useState<PayrollBatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!batchId) { setData(null); setLoading(false); return; }
    setLoading(true);
    setError(null);
    const { data: row, error: err } = await rpc("payroll_batch_get", { p_id: batchId });
    if (err) { setError(err.message); setData(null); }
    else setData(row as unknown as PayrollBatchDetail);
    setLoading(false);
  }, [batchId]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { data, loading, error, refresh };
}

export function usePayrollPayslipList(filters: {
  teacherId?: string | null;
  monthStart?: string | null;
  status?: PayrollPayslipStatus | "all" | null;
  batchId?: string | null;
}) {
  const [data, setData] = useState<PayrollPayslipListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: rows, error: err } = await rpc("payroll_payslip_list", {
      p_teacher_id: filters.teacherId ?? null,
      p_month_start: filters.monthStart ?? null,
      p_status: filters.status && filters.status !== "all" ? filters.status : null,
      p_batch_id: filters.batchId ?? null,
    });
    if (err) { setError(err.message); setData([]); }
    else setData((rows as PayrollPayslipListItem[]) ?? []);
    setLoading(false);
  }, [filters.teacherId, filters.monthStart, filters.status, filters.batchId]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { data, loading, error, refresh };
}

export function usePayrollPayslipDetail(payslipId: string | undefined) {
  const [data, setData] = useState<PayrollPayslipDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!payslipId) { setData(null); setLoading(false); return; }
    setLoading(true);
    setError(null);
    const { data: row, error: err } = await rpc("payroll_payslip_get", { p_id: payslipId });
    if (err) { setError(err.message); setData(null); }
    else setData(row as unknown as PayrollPayslipDetail);
    setLoading(false);
  }, [payslipId]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { data, loading, error, refresh };
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export async function createBatchForMonth(monthStart: string): Promise<string> {
  const { data, error } = await rpc("payroll_batch_create_for_month", {
    p_month_start: monthStart,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function createPayslip(periodId: string, batchId?: string | null): Promise<string> {
  const { data, error } = await rpc("payroll_payslip_create", {
    p_period_id: periodId,
    p_batch_id: batchId ?? null,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function rebuildPayslipLines(payslipId: string) {
  const { error } = await rpc("payroll_payslip_rebuild_lines", { p_payslip_id: payslipId });
  if (error) throw new Error(error.message);
}

export async function upsertAdjustment(input: {
  id: string | null;
  payslipId: string;
  type: PayrollAdjustmentType;
  label: string;
  amountVnd: number;
  notes?: string | null;
}): Promise<string> {
  const { data, error } = await rpc("payroll_adjustment_upsert", {
    p_id: input.id,
    p_payslip_id: input.payslipId,
    p_type: input.type,
    p_label: input.label,
    p_amount_vnd: input.amountVnd,
    p_notes: input.notes ?? null,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function deleteAdjustment(id: string) {
  const { error } = await rpc("payroll_adjustment_delete", { p_id: id });
  if (error) throw new Error(error.message);
}

export async function confirmPayslip(id: string, adminMessage?: string | null) {
  const { error } = await rpc("payroll_payslip_confirm", {
    p_id: id,
    p_admin_message: adminMessage ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function markPayslipPaid(id: string, paymentRef?: string | null) {
  const { error } = await rpc("payroll_payslip_mark_paid", {
    p_id: id,
    p_payment_ref: paymentRef ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function confirmBatch(id: string): Promise<number> {
  const { data, error } = await rpc("payroll_batch_confirm", { p_id: id });
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
}

export async function markBatchPaid(id: string, paymentRef?: string | null): Promise<number> {
  const { data, error } = await rpc("payroll_batch_mark_paid", {
    p_id: id,
    p_payment_ref: paymentRef ?? null,
  });
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
}
