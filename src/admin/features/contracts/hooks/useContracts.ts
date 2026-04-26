import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  ContractFieldType,
  ContractRow,
  ContractStatus,
  ContractTemplateFieldOption,
  ContractTemplateFieldRow,
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
      // The RPC returns the contract row's columns merged with auxiliary
      // collections at the top level. Normalise to ContractWithDetails so
      // pages can rely on the typed shape.
      const flat = (data ?? {}) as Record<string, unknown> & {
        template?: unknown; teacher?: unknown;
        pay_rates?: unknown; pay_rates_archived?: unknown;
        signatures?: unknown; documents?: unknown; audit_log?: unknown;
        party_a_settings?: unknown;
      };
      const {
        template, teacher, pay_rates, pay_rates_archived,
        signatures, documents, audit_log, party_a_settings,
        ...contractRow
      } = flat;
      const wrapped: ContractWithDetails = {
        contract: contractRow as unknown as ContractRow,
        template: (template ?? null) as ContractWithDetails["template"],
        teacher: (teacher ?? null) as ContractWithDetails["teacher"],
        pay_rates: {
          active: (pay_rates as ContractWithDetails["pay_rates"]["active"]) ?? [],
          archived: (pay_rates_archived as ContractWithDetails["pay_rates"]["archived"]) ?? [],
        },
        signatures: (signatures as ContractWithDetails["signatures"]) ?? [],
        documents: (documents as ContractWithDetails["documents"]) ?? [],
        audit_log: (audit_log as ContractWithDetails["audit_log"]) ?? [],
        party_a_settings: (party_a_settings ?? null) as ContractWithDetails["party_a_settings"],
      };
      setData(wrapped);
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
  custom_fields?: Record<string, unknown> | null;
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
    p_custom_fields: input.custom_fields ?? null,
  });
  if (error) throw error;
  return data as unknown as string;
}

export async function updateContractCustomFields(
  contractId: string,
  customFields: Record<string, unknown>,
) {
  const { error } = await rpc("contract_update_custom_fields", {
    p_contract_id: contractId,
    p_custom_fields: customFields,
  });
  if (error) throw error;
}

// ---------- Template editor hooks (Phase 1.2) ---------------------------

export function useContractTemplatesList(includeArchived = false) {
  const [data, setData] = useState<ContractTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await rpc("contract_templates_list", {
      p_include_archived: includeArchived,
    });
    if (error) {
      setError(error.message);
      setData([]);
    } else {
      setData((data as ContractTemplateRow[]) ?? []);
    }
    setLoading(false);
  }, [includeArchived]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useContractTemplateWithFields(templateId: string | undefined) {
  const [data, setData] = useState<ContractTemplateRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!templateId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await rpc("contract_template_get_with_fields", {
      p_template_id: templateId,
    });
    if (error) {
      setError(error.message);
      setData(null);
    } else {
      setData(data as unknown as ContractTemplateRow);
    }
    setLoading(false);
  }, [templateId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export interface TemplateCreateInput {
  name: string;
  description?: string | null;
  body_md?: string | null;
}

export async function createTemplate(input: TemplateCreateInput): Promise<string> {
  const { data, error } = await rpc("contract_template_create", {
    p_name: input.name,
    p_description: input.description ?? null,
    p_body_md: input.body_md ?? "",
  });
  if (error) throw error;
  return data as unknown as string;
}

export interface TemplateUpdateInput {
  name?: string | null;
  description?: string | null;
  body_md?: string | null;
  is_active?: boolean | null;
}

export async function updateTemplate(templateId: string, input: TemplateUpdateInput) {
  const { error } = await rpc("contract_template_update", {
    p_template_id: templateId,
    p_name: input.name ?? null,
    p_description: input.description ?? null,
    p_body_md: input.body_md ?? null,
    p_is_active: input.is_active ?? null,
  });
  if (error) throw error;
}

export async function archiveTemplate(templateId: string) {
  const { error } = await rpc("contract_template_archive", {
    p_template_id: templateId,
  });
  if (error) throw error;
}

export interface TemplateFieldUpsertInput {
  template_id: string;
  field_key: string;
  label: string;
  field_type: ContractFieldType;
  required?: boolean;
  default_value?: unknown;
  options?: ContractTemplateFieldOption[] | null;
  help_text?: string | null;
  field_group?: string | null;
  sort_order?: number;
  id?: string | null;
}

export async function upsertTemplateField(input: TemplateFieldUpsertInput): Promise<string> {
  const { data, error } = await rpc("contract_template_field_upsert", {
    p_template_id: input.template_id,
    p_field_key: input.field_key,
    p_label: input.label,
    p_field_type: input.field_type,
    p_required: input.required ?? false,
    p_default_value: input.default_value === undefined ? null : input.default_value,
    p_options: input.options ?? null,
    p_help_text: input.help_text ?? null,
    p_field_group: input.field_group ?? null,
    p_sort_order: input.sort_order ?? 0,
    p_id: input.id ?? null,
  });
  if (error) throw error;
  return data as unknown as string;
}

export async function deleteTemplateField(fieldId: string) {
  const { error } = await rpc("contract_template_field_delete", {
    p_field_id: fieldId,
  });
  if (error) throw error;
}

export async function reorderTemplateFields(templateId: string, orderedIds: string[]) {
  const { error } = await rpc("contract_template_field_reorder", {
    p_template_id: templateId,
    p_ordered_ids: orderedIds,
  });
  if (error) throw error;
}

export type { ContractTemplateFieldRow };

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
