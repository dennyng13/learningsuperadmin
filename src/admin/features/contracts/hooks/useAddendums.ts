import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  AddendumListItem,
  AddendumStatus,
  AddendumWithDetails,
  PayRateUnit,
} from "../types";

// Until `npm run sync:types` regenerates database types, the addendum RPCs
// don't exist on the auto-generated `Database` enum. Cast through `any` so
// the call sites stay typed against our local mirror types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (name: string, args?: Record<string, unknown>) => supabase.rpc(name as any, args as any);

// =============================================================================
// List + detail hooks
// =============================================================================

export function useAddendumList(
  contractId: string | undefined,
  filters?: { status?: AddendumStatus | "all" | null; activeOnly?: boolean },
) {
  const [data, setData] = useState<AddendumListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!contractId) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await rpc("addendum_list", {
      p_contract_id: contractId,
      p_status: filters?.status && filters.status !== "all" ? filters.status : null,
      p_active_only: filters?.activeOnly ?? false,
    });
    if (error) {
      setError(error.message);
      setData([]);
    } else {
      setData((data as AddendumListItem[]) ?? []);
    }
    setLoading(false);
  }, [contractId, filters?.status, filters?.activeOnly]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useAddendumDetail(addendumId: string | undefined) {
  const [data, setData] = useState<AddendumWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!addendumId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await rpc("addendum_get", { p_addendum_id: addendumId });
    if (error) {
      setError(error.message);
      setData(null);
    } else {
      setData(data as unknown as AddendumWithDetails);
    }
    setLoading(false);
  }, [addendumId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

// =============================================================================
// Mutations
// =============================================================================

export interface AddendumPayRateInput {
  rate_unit: PayRateUnit;
  rate_amount_vnd: number;
  program_id?: string | null;
  min_threshold?: number | null;
  max_threshold?: number | null;
  notes?: string | null;
  sort_order?: number;
}

export interface CreateAddendumInput {
  contract_id: string;
  effective_from: string;
  effective_to?: string | null;
  auto_archive_on_activate?: boolean | null;
  notes?: string | null;
  party_a_signer_user_id?: string | null;
  addendum_number?: string | null;
  pay_rates?: AddendumPayRateInput[];
  template_id?: string | null;
  custom_fields?: Record<string, unknown> | null;
}

export async function createAddendum(input: CreateAddendumInput): Promise<string> {
  const { data, error } = await rpc("addendum_create", {
    p_contract_id: input.contract_id,
    p_effective_from: input.effective_from,
    p_effective_to: input.effective_to ?? null,
    p_auto_archive_on_activate: input.auto_archive_on_activate ?? null,
    p_notes: input.notes ?? null,
    p_party_a_signer_user_id: input.party_a_signer_user_id ?? null,
    p_addendum_number: input.addendum_number ?? null,
    p_pay_rates: input.pay_rates ?? [],
    p_template_id: input.template_id ?? null,
    p_custom_fields: input.custom_fields ?? {},
  });
  if (error) throw error;
  return data as unknown as string;
}

export async function updateAddendumCustomFields(
  addendumId: string,
  customFields: Record<string, unknown>,
) {
  const { error } = await rpc("addendum_update_custom_fields", {
    p_addendum_id: addendumId,
    p_custom_fields: customFields,
  });
  if (error) throw error;
}

export interface UpdateAddendumMetaInput {
  effective_from?: string | null;
  effective_to?: string | null;
  notes?: string | null;
  auto_archive_on_activate?: boolean | null;
  party_a_signer_user_id?: string | null;
}

export async function updateAddendumMeta(
  addendumId: string,
  input: UpdateAddendumMetaInput,
) {
  const { error } = await rpc("addendum_update_meta", {
    p_addendum_id: addendumId,
    p_effective_from: input.effective_from ?? null,
    p_effective_to: input.effective_to ?? null,
    p_notes: input.notes ?? null,
    p_auto_archive_on_activate: input.auto_archive_on_activate ?? null,
    p_party_a_signer_user_id: input.party_a_signer_user_id ?? null,
  });
  if (error) throw error;
}

export interface UpsertAddendumPayRateInput {
  addendum_id: string;
  rate_unit: PayRateUnit;
  rate_amount_vnd: number;
  program_id?: string | null;
  min_threshold?: number | null;
  max_threshold?: number | null;
  notes?: string | null;
  sort_order?: number;
  id?: string | null;
}

export async function upsertAddendumPayRate(
  input: UpsertAddendumPayRateInput,
): Promise<string> {
  const { data, error } = await rpc("addendum_pay_rate_upsert", {
    p_addendum_id: input.addendum_id,
    p_rate_unit: input.rate_unit,
    p_rate_amount_vnd: input.rate_amount_vnd,
    p_program_id: input.program_id ?? null,
    p_min_threshold: input.min_threshold ?? null,
    p_max_threshold: input.max_threshold ?? null,
    p_notes: input.notes ?? null,
    p_sort_order: input.sort_order ?? 0,
    p_id: input.id ?? null,
  });
  if (error) throw error;
  return data as unknown as string;
}

export async function deleteAddendumPayRate(id: string) {
  const { error } = await rpc("addendum_pay_rate_delete", { p_id: id });
  if (error) throw error;
}

// =============================================================================
// State machine actions
// =============================================================================

export async function sendAddendumToTeacher(addendumId: string, message?: string) {
  const { error } = await rpc("addendum_send_to_teacher", {
    p_addendum_id: addendumId,
    p_message: message ?? null,
  });
  if (error) throw error;
}

export async function requestAddendumRevision(addendumId: string, message: string) {
  const { error } = await rpc("addendum_request_revision", {
    p_addendum_id: addendumId,
    p_message: message,
  });
  if (error) throw error;
}

export async function adminSignAddendum(
  addendumId: string,
  signatureImageUrl: string,
) {
  const { error } = await rpc("addendum_admin_sign", {
    p_addendum_id: addendumId,
    p_signature_image_url: signatureImageUrl,
    p_ip_address: null,
    p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
  });
  if (error) throw error;
}

export async function terminateAddendum(addendumId: string, reason: string) {
  const { error } = await rpc("addendum_terminate", {
    p_addendum_id: addendumId,
    p_reason: reason,
  });
  if (error) throw error;
}

// =============================================================================
// PDF render
// =============================================================================

export async function renderAddendumPdf(
  addendumId: string,
): Promise<{ path: string; signed_url: string | null }> {
  const { data, error } = await supabase.functions.invoke("render-addendum-pdf", {
    body: { addendum_id: addendumId },
  });
  if (error) throw error;
  return data as { path: string; signed_url: string | null };
}
