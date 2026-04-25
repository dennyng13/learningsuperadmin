// Local types for Stage F1 HR Contracts feature.
// Until `npm run sync:types` regenerates `integrations/supabase/types.ts`
// against the post-migration schema, these mirror the SQL definitions
// in `ieltspractice/supabase/migrations/20260427_stage_f1_hr_contracts.sql`.

export type ContractStatus =
  | "draft"
  | "awaiting_teacher"
  | "awaiting_admin"
  | "revision_requested"
  | "active"
  | "renewing"
  | "expired"
  | "terminated";

export type ContractParty = "teacher" | "admin";

export type PayRateUnit = "session" | "hour" | "day" | "month";

export interface PartyASnapshot {
  legal_name?: string | null;
  business_id?: string | null;
  address?: string | null;
  representative_name?: string | null;
  representative_title?: string | null;
  signer_user_id?: string | null;
  signature_image_url?: string | null;
  phone?: string | null;
  email?: string | null;
  bank_account_number?: string | null;
  bank_name?: string | null;
}

export interface PartyBSnapshot {
  full_name?: string | null;
  date_of_birth?: string | null;
  cccd_number?: string | null;
  cccd_issue_date?: string | null;
  cccd_issue_place?: string | null;
  permanent_address?: string | null;
  current_address?: string | null;
  phone?: string | null;
  email?: string | null;
  tax_code?: string | null;
  bank_account_number?: string | null;
  bank_name?: string | null;
  bank_branch?: string | null;
  signature_image_url?: string | null;
  teacher_id?: string | null;
}

export interface ContractRow {
  id: string;
  template_id: string | null;
  teacher_id: string;
  contract_number: string;
  contract_type: string | null;
  services_description: string | null;
  effective_from: string | null;
  effective_to: string | null;
  status: ContractStatus;
  party_a_signer_user_id: string | null;
  party_a_snapshot: PartyASnapshot;
  party_b_snapshot: PartyBSnapshot;
  custom_fields: Record<string, unknown> | null;
  pdf_storage_path: string | null;
  workdrive_file_id: string | null;
  workdrive_url: string | null;
  supersedes_contract_id: string | null;
  superseded_by_contract_id: string | null;
  expiry_reminder_sent_at: string | null;
  terminated_at: string | null;
  termination_reason: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ContractTemplateRow {
  id: string;
  name: string;
  description: string | null;
  body_md: string;
  default_fields: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ContractPayRateRow {
  id: string;
  contract_id: string;
  program_id: string | null;
  rate_unit: PayRateUnit;
  rate_amount_vnd: number;
  min_threshold: number | null;
  max_threshold: number | null;
  notes: string | null;
  effective_from: string | null;
  effective_to: string | null;
  archived_at: string | null;
  created_at: string;
  created_by: string | null;
}

export interface ContractSignatureRow {
  id: string;
  contract_id: string;
  party: ContractParty;
  signer_user_id: string | null;
  signer_name: string | null;
  signature_image_url: string;
  ip_address: string | null;
  user_agent: string | null;
  signed_at: string;
  archived_at: string | null;
}

export interface ContractDocumentRow {
  id: string;
  contract_id: string;
  related_url: string | null;
  related_contract_id: string | null;
  label: string | null;
  created_at: string;
  created_by: string | null;
}

export interface ContractAuditLogRow {
  id: string;
  contract_id: string;
  actor_user_id: string | null;
  actor_role: string | null;
  event_type: string;
  from_status: ContractStatus | null;
  to_status: ContractStatus | null;
  diff: Record<string, unknown> | null;
  message: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface ContractWithDetails {
  contract: ContractRow;
  template: ContractTemplateRow | null;
  teacher: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    linked_user_id: string | null;
  } | null;
  pay_rates: { active: ContractPayRateRow[]; archived: ContractPayRateRow[] };
  signatures: ContractSignatureRow[];
  documents: ContractDocumentRow[];
  audit_log: ContractAuditLogRow[];
  party_a_settings: PartyASnapshot | null;
}

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  draft: "Đang soạn",
  awaiting_teacher: "Chờ giáo viên ký",
  awaiting_admin: "Chờ admin ký",
  revision_requested: "Đang sửa",
  active: "Đang hoạt động",
  renewing: "Đang gia hạn",
  expired: "Hết hạn",
  terminated: "Đã chấm dứt",
};

export const PAY_RATE_UNIT_LABELS: Record<PayRateUnit, string> = {
  session: "buổi",
  hour: "giờ",
  day: "ngày",
  month: "tháng",
};
