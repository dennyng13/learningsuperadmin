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
  template_fields_snapshot: ContractTemplateFieldRow[] | null;
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
  default_addendum_template_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  field_count?: number;
  fields?: ContractTemplateFieldRow[];
}

export type ContractFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "currency"
  | "dropdown"
  | "checkbox";

export interface ContractTemplateFieldOption {
  value: string;
  label: string;
}

export interface ContractTemplateFieldRow {
  id: string;
  template_id: string;
  field_key: string;
  label: string;
  field_type: ContractFieldType;
  required: boolean;
  default_value: unknown;
  options: ContractTemplateFieldOption[] | null;
  help_text: string | null;
  field_group: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const CONTRACT_FIELD_TYPE_LABELS: Record<ContractFieldType, string> = {
  text: "Văn bản ngắn",
  textarea: "Văn bản dài",
  number: "Số",
  date: "Ngày",
  currency: "Tiền (VNĐ)",
  dropdown: "Lựa chọn",
  checkbox: "Có/Không",
};

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

// =============================================================================
// Phase 1.3 — Pay-rate addendum types
// =============================================================================
// Mirror SQL definitions from
//   ieltspractice/supabase/migrations/20260430_stage_f1_3_pay_rate_addendum.sql
// Until `npm run sync:types` regenerates types after migrations apply.

export type AddendumStatus =
  | "draft"
  | "awaiting_teacher"
  | "revision_requested"
  | "awaiting_admin"
  | "active"
  | "superseded"
  | "terminated";

export const ADDENDUM_STATUS_LABELS: Record<AddendumStatus, string> = {
  draft: "Đang soạn",
  awaiting_teacher: "Chờ giáo viên ký",
  revision_requested: "Đang sửa",
  awaiting_admin: "Chờ admin ký",
  active: "Đang hiệu lực",
  superseded: "Đã thay thế",
  terminated: "Đã chấm dứt",
};

export interface AddendumPayRateRow {
  id: string;
  addendum_id: string;
  program_id: string | null;
  rate_unit: PayRateUnit;
  rate_amount_vnd: number;
  min_threshold: number | null;
  max_threshold: number | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AddendumSignatureRow {
  id: string;
  addendum_id: string;
  party: ContractParty;
  signed_by: string | null;
  signature_image_url: string;
  signed_at: string;
  ip_address: string | null;
  user_agent: string | null;
  archived_at: string | null;
}

export interface AddendumAuditLogRow {
  id: number;
  addendum_id: string;
  actor_user_id: string | null;
  actor_role: string | null;
  action: string;
  from_status: AddendumStatus | null;
  to_status: AddendumStatus | null;
  notes: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface AddendumRow {
  id: string;
  contract_id: string;
  addendum_number: string;
  status: AddendumStatus;
  effective_from: string;
  effective_to: string | null;
  auto_archive_on_activate: boolean;
  superseded_by_id: string | null;
  notes: string | null;
  party_a_snapshot: PartyASnapshot;
  party_b_snapshot: PartyBSnapshot;
  party_a_signer_user_id: string | null;
  teacher_signed_at: string | null;
  admin_signed_at: string | null;
  pdf_storage_path: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface AddendumListItem {
  id: string;
  addendum_number: string;
  status: AddendumStatus;
  effective_from: string;
  effective_to: string | null;
  auto_archive_on_activate: boolean;
  notes: string | null;
  pay_rate_count: number;
  teacher_signed_at: string | null;
  admin_signed_at: string | null;
  pdf_storage_path: string | null;
  superseded_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AddendumWithDetails extends AddendumRow {
  template_id: string | null;
  template_fields_snapshot: AddendumTemplateFieldRow[] | null;
  body_md_snapshot: string;
  custom_fields: Record<string, unknown> | null;
  pay_rates: AddendumPayRateRow[];
  signatures: AddendumSignatureRow[];
  audit_log: AddendumAuditLogRow[];
  contract: {
    id: string;
    contract_number: string;
    effective_from: string | null;
    effective_to: string | null;
    teacher_full_name: string | null;
    teacher_id: string;
  };
}

// =============================================================================
// Phase 1.4 — Addendum templates + custom fields
// =============================================================================
// Mirrors SQL from
//   ieltspractice/supabase/migrations/20260501_stage_f1_4_addendum_templates.sql
// Reuses `ContractFieldType` and `ContractTemplateFieldOption` from above
// (the addendum field-type enum is the same `contract_field_type` as Phase 1.2).

export interface AddendumTemplateRow {
  id: string;
  name: string;
  description: string | null;
  body_md: string;
  default_auto_archive: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  field_count?: number;
  fields?: AddendumTemplateFieldRow[];
}

export interface AddendumTemplateFieldRow {
  id: string;
  template_id: string;
  field_key: string;
  label: string;
  field_type: ContractFieldType;
  required: boolean;
  default_value: unknown;
  options: ContractTemplateFieldOption[] | null;
  help_text: string | null;
  field_group: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
