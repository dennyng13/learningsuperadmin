import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  ContractRow,
  ContractStatus,
  ContractTemplateRow,
  ContractWithDetails,
  PartyASnapshot,
  PartyBSnapshot,
  PayRateUnit,
} from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (name: string, args?: Record<string, unknown>) => supabase.rpc(name as any, args as any);

interface ContractListItem {
  id: string;
  contract_number: string;
  contract_type: string | null;
  status: ContractStatus;
  effective_from: string | null;
  effective_to: string | null;
  teacher_id: string;
  teacher_name: string | null;
  pdf_storage_path: string | null;
  expiry_reminder_sent_at: string | null;
  updated_at: string;
}

export function useContractList(filters?: {
  status?: ContractStatus | "all";
  teacherId?: string | null;
  expiringWithinDays?: number | null;
}) {
  const [data, setData] = useState<ContractListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await rpc("contract_list", {
      p_status: filters?.status && filters.status !== "all" ? filters.status : null,
      p_teacher_id: filters?.teacherId ?? null,
      p_expiring_within_days: filters?.expiringWithinDays ?? null,
    });
    if (error) {
      setError(error.message);
      setData([]);
    } else {
      setData((data as ContractListItem[]) ?? []);
    }
    setLoading(false);
  }, [filters?.status, filters?.teacherId, filters?.expiringWithinDays]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useContractDetail(contractId: string | undefined) {
  const [data, setData] = useState<ContractWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!contractId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await rpc("contract_get_with_details", { p_contract_id: contractId });
    if (error) {
      setError(error.message);
      setData(null);
    } else {
      setData(data as unknown as ContractWithDetails);
    }
    setLoading(false);
  }, [contractId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useContractTemplates() {
  const [data, setData] = useState<ContractTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from as any)("contract_templates")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        setData([]);
      } else {
        setData((data as ContractTemplateRow[]) ?? []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
}

export interface CreateContractInput {
  template_id: string;
  teacher_id: string;
  effective_from?: string | null;
  effective_to?: string | null;
  contract_type?: string | null;
  services_description?: string | null;
  contract_number?: string | null;
  party_a_signer_user_id?: string | null;
  supersedes_contract_id?: string | null;
  related_document_ids?: string[];
}

export async function createContract(input: CreateContractInput): Promise<string> {
  const { data, error } = await rpc("contract_create", {
    p_template_id: input.template_id,
    p_teacher_id: input.teacher_id,
    p_effective_from: input.effective_from ?? null,
    p_effective_to: input.effective_to ?? null,
    p_contract_type: input.contract_type ?? null,
    p_services_description: input.services_description ?? null,
    p_contract_number: input.contract_number ?? null,
    p_party_a_signer_user_id: input.party_a_signer_user_id ?? null,
    p_supersedes_contract_id: input.supersedes_contract_id ?? null,
    p_related_document_ids: input.related_document_ids ?? null,
  });
  if (error) throw error;
  return data as unknown as string;
}

export async function sendContractToTeacher(contractId: string, message?: string) {
  const { error } = await rpc("contract_send_to_teacher", {
    p_contract_id: contractId,
    p_message: message ?? null,
  });
  if (error) throw error;
}

export async function adminUpdatePartyB(
  contractId: string,
  partyB: PartyBSnapshot,
) {
  const { error } = await rpc("contract_teacher_update_party_b", {
    p_contract_id: contractId,
    p_party_b_snapshot: partyB as unknown as Record<string, unknown>,
    p_persist_to_profile: false,
  });
  if (error) throw error;
}

export async function adminUpdatePartyA(
  contractId: string,
  partyA: PartyASnapshot,
) {
  // We update via direct UPDATE since there's no dedicated RPC; RLS allows admin.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from as any)("contracts")
    .update({ party_a_snapshot: partyA })
    .eq("id", contractId);
  if (error) throw error;
}

export async function adminSignContract(
  contractId: string,
  signatureImageUrl: string,
) {
  const { error } = await rpc("contract_admin_sign", {
    p_contract_id: contractId,
    p_signature_image_url: signatureImageUrl,
    p_ip_address: null,
    p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
  });
  if (error) throw error;
}

export async function requestRevision(contractId: string, message: string) {
  const { error } = await rpc("contract_request_revision", {
    p_contract_id: contractId,
    p_message: message,
  });
  if (error) throw error;
}

export async function requestResign(contractId: string, message?: string) {
  const { error } = await rpc("contract_request_resign", {
    p_contract_id: contractId,
    p_message: message ?? null,
  });
  if (error) throw error;
}

export async function terminateContract(contractId: string, reason: string) {
  const { error } = await rpc("contract_terminate", {
    p_contract_id: contractId,
    p_reason: reason,
  });
  if (error) throw error;
}

export interface CreatePayRateInput {
  contract_id: string;
  program_id?: string | null;
  rate_unit: PayRateUnit;
  rate_amount_vnd: number;
  min_threshold?: number | null;
  max_threshold?: number | null;
  notes?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
}

export async function createPayRate(input: CreatePayRateInput): Promise<string> {
  const { data, error } = await rpc("contract_pay_rate_create", {
    p_contract_id: input.contract_id,
    p_program_id: input.program_id ?? null,
    p_rate_unit: input.rate_unit,
    p_rate_amount_vnd: input.rate_amount_vnd,
    p_min_threshold: input.min_threshold ?? null,
    p_max_threshold: input.max_threshold ?? null,
    p_notes: input.notes ?? null,
    p_effective_from: input.effective_from ?? null,
    p_effective_to: input.effective_to ?? null,
  });
  if (error) throw error;
  return data as unknown as string;
}

export async function archivePayRate(rateId: string) {
  const { error } = await rpc("contract_pay_rate_archive", { p_rate_id: rateId });
  if (error) throw error;
}

export async function setContractPdfPath(contractId: string, pdfPath: string) {
  const { error } = await rpc("contract_set_pdf_path", {
    p_contract_id: contractId,
    p_pdf_storage_path: pdfPath,
  });
  if (error) throw error;
}

export async function renderContractPdf(contractId: string): Promise<{ path: string; signed_url: string | null }> {
  const { data, error } = await supabase.functions.invoke("render-contract-pdf", {
    body: { contract_id: contractId },
  });
  if (error) throw error;
  return data as { path: string; signed_url: string | null };
}

export async function uploadSignatureImage(
  base64Png: string,
  subject: "self" | "party_a" = "self",
): Promise<{ path: string; signed_url: string | null }> {
  const { data, error } = await supabase.functions.invoke("upload-signature-image", {
    body: { image_base64: base64Png, subject },
  });
  if (error) throw error;
  return data as { path: string; signed_url: string | null };
}

export async function getStorageSignedUrl(path: string, expiresInSeconds = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage.from("contracts").createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}

export interface PartyAOrgSettings extends PartyASnapshot {
  signers?: Array<{
    user_id: string;
    name: string;
    title: string;
    is_default?: boolean;
  }>;
}

export async function getPartyASettings(): Promise<PartyAOrgSettings | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from as any)("app_settings")
    .select("value")
    .eq("key", "party_a")
    .maybeSingle();
  if (error || !data) return null;
  return (data as { value: PartyAOrgSettings }).value;
}

export async function updatePartyASettings(value: PartyAOrgSettings) {
  const { error } = await rpc("app_settings_party_a_update", {
    p_value: value as unknown as Record<string, unknown>,
  });
  if (error) throw error;
}

// Re-export ContractListItem for component usage
export type { ContractListItem };

// Lightweight teacher list helper for the create form
export interface TeacherOption {
  id: string;
  full_name: string;
  email: string | null;
  linked_user_id: string | null;
}

export function useTeacherOptions() {
  const [data, setData] = useState<TeacherOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from as any)("teachers")
        .select("id, full_name, email, linked_user_id")
        .neq("status", "archived")
        .order("full_name", { ascending: true });
      if (cancelled) return;
      if (error) {
        setData([]);
      } else {
        setData((data as TeacherOption[]) ?? []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
}

export interface ProgramOption {
  id: string;
  key: string;
  name: string;
}

export function useProgramOptions() {
  const [data, setData] = useState<ProgramOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from as any)("programs")
        .select("id, key, name")
        .order("name", { ascending: true });
      if (cancelled) return;
      if (!error) {
        setData((data as ProgramOption[]) ?? []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data };
}

export type { ContractRow };
