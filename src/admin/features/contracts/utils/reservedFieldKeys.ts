/**
 * Auto-fill placeholder keys exposed by the contract render engine.
 *
 * Mirrors the list returned by `public._reserved_contract_field_keys()` in
 * ieltspractice/supabase/migrations/20260428_stage_f1_2_template_custom_fields.sql.
 * Used by the template editor to:
 *  1. Power the "Chèn placeholder" picker.
 *  2. Mark which `{{...}}` tokens are auto-fill vs. custom field references.
 */
export interface ReservedPlaceholder {
  key: string;
  label: string;
  group: string;
}

export const RESERVED_PLACEHOLDERS: ReservedPlaceholder[] = [
  { key: "contract_number",            label: "Số hợp đồng",                  group: "Hợp đồng" },
  { key: "contract_date",              label: "Ngày lập hợp đồng",            group: "Hợp đồng" },
  { key: "effective_from",             label: "Hiệu lực từ ngày",             group: "Hợp đồng" },
  { key: "effective_to",               label: "Hiệu lực đến ngày",            group: "Hợp đồng" },
  { key: "services_description",       label: "Mô tả dịch vụ",                group: "Hợp đồng" },

  { key: "party_a_legal_name",         label: "Tên Bên A (đơn vị)",           group: "Bên A" },
  { key: "party_a_business_id",        label: "MSDN Bên A",                   group: "Bên A" },
  { key: "party_a_address",            label: "Địa chỉ Bên A",                group: "Bên A" },
  { key: "party_a_representative_name", label: "Đại diện Bên A — Họ tên",     group: "Bên A" },
  { key: "party_a_representative_title", label: "Đại diện Bên A — Chức vụ",   group: "Bên A" },
  { key: "party_a_signature_block",    label: "Khối chữ ký Bên A",            group: "Bên A" },

  { key: "teacher_full_name",          label: "Họ tên giáo viên",             group: "Bên B" },
  { key: "teacher_date_of_birth",      label: "Ngày sinh giáo viên",          group: "Bên B" },
  { key: "teacher_cccd_number",        label: "CCCD/CMND",                    group: "Bên B" },
  { key: "teacher_cccd_issue_date",    label: "CCCD — Ngày cấp",              group: "Bên B" },
  { key: "teacher_cccd_issue_place",   label: "CCCD — Nơi cấp",               group: "Bên B" },
  { key: "teacher_permanent_address",  label: "Hộ khẩu thường trú",           group: "Bên B" },
  { key: "teacher_current_address",    label: "Chỗ ở hiện tại",               group: "Bên B" },
  { key: "teacher_phone",              label: "Số điện thoại",                group: "Bên B" },
  { key: "teacher_email",              label: "Email",                        group: "Bên B" },
  { key: "teacher_signature_block",    label: "Khối chữ ký giáo viên",        group: "Bên B" },
];

export const RESERVED_PLACEHOLDER_KEYS = new Set(
  RESERVED_PLACEHOLDERS.map((p) => p.key),
);
