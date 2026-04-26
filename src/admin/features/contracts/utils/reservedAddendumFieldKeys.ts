/**
 * Auto-fill placeholder keys exposed by the addendum render engine.
 *
 * Mirrors the list returned by `public._reserved_addendum_field_keys()` in
 * ieltspractice/supabase/migrations/20260501_stage_f1_4_addendum_templates.sql
 * and consumed by `supabase/functions/render-addendum-pdf/index.ts`.
 */
import type { ReservedPlaceholder } from "./reservedFieldKeys";

export const RESERVED_ADDENDUM_PLACEHOLDERS: ReservedPlaceholder[] = [
  { key: "addendum_number",            label: "Số phụ lục",                    group: "Phụ lục" },
  { key: "addendum_date",              label: "Ngày lập phụ lục",              group: "Phụ lục" },
  { key: "effective_from",             label: "Hiệu lực từ ngày",              group: "Phụ lục" },
  { key: "effective_to",               label: "Hiệu lực đến ngày",             group: "Phụ lục" },
  { key: "contract_number",            label: "Số hợp đồng gốc",               group: "Phụ lục" },

  { key: "party_a_legal_name",         label: "Tên Bên A (đơn vị)",            group: "Bên A" },
  { key: "party_a_business_id",        label: "MSDN Bên A",                    group: "Bên A" },
  { key: "party_a_address",            label: "Địa chỉ Bên A",                 group: "Bên A" },
  { key: "party_a_representative_name", label: "Đại diện Bên A — Họ tên",      group: "Bên A" },
  { key: "party_a_representative_title", label: "Đại diện Bên A — Chức vụ",    group: "Bên A" },
  { key: "party_a_signature_block",    label: "Khối chữ ký Bên A",             group: "Bên A" },

  { key: "teacher_full_name",          label: "Họ tên giáo viên",              group: "Bên B" },
  { key: "teacher_date_of_birth",      label: "Ngày sinh giáo viên",           group: "Bên B" },
  { key: "teacher_cccd_number",        label: "CCCD/CMND",                     group: "Bên B" },
  { key: "teacher_cccd_issue_date",    label: "CCCD — Ngày cấp",               group: "Bên B" },
  { key: "teacher_cccd_issue_place",   label: "CCCD — Nơi cấp",                group: "Bên B" },
  { key: "teacher_permanent_address",  label: "Hộ khẩu thường trú",            group: "Bên B" },
  { key: "teacher_current_address",    label: "Chỗ ở hiện tại",                group: "Bên B" },
  { key: "teacher_phone",              label: "Số điện thoại",                 group: "Bên B" },
  { key: "teacher_email",              label: "Email",                         group: "Bên B" },
  { key: "teacher_signature_block",    label: "Khối chữ ký giáo viên",         group: "Bên B" },
];

export const RESERVED_ADDENDUM_PLACEHOLDER_KEYS = new Set(
  RESERVED_ADDENDUM_PLACEHOLDERS.map((p) => p.key),
);
