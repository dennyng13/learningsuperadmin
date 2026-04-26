// Local mirror types for Stage 3 Payroll. Until `npm run sync:types` regens
// Database types, the new tables/enums/RPCs aren't in `Database['public']`.
// Mirrors SQL definitions in
// ieltspractice/supabase/migrations/20260502_stage_3_payroll.sql

export type PayrollBatchStatus = "draft" | "confirmed" | "paid";
export type PayrollPayslipStatus =
  | "draft"
  | "confirmed"
  | "teacher_acknowledged"
  | "paid";
export type PayrollAdjustmentType =
  | "bonus"
  | "penalty"
  | "advance"
  | "tax_pit"
  | "other";

export type PayRateUnit = "session" | "hour" | "day" | "month";

export interface PayrollBatch {
  id: string;
  month_start: string; // YYYY-MM-01
  status: PayrollBatchStatus;
  admin_notes: string | null;
  created_at: string;
  created_by: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  paid_at: string | null;
  paid_by: string | null;
  updated_at: string;
}

export interface PayrollPayslip {
  id: string;
  batch_id: string | null;
  teacher_id: string;
  period_id: string;
  month_start: string;
  status: PayrollPayslipStatus;
  gross_amount_vnd: number;
  adjustments_total_vnd: number;
  net_amount_vnd: number;
  admin_message: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  acknowledged_at: string | null;
  paid_at: string | null;
  paid_by: string | null;
  payment_ref: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollPayslipLine {
  id: string;
  payslip_id: string;
  entry_id: string | null;
  class_name_snapshot: string | null;
  entry_date: string;
  duration_minutes: number;
  rate_amount_vnd: number;
  rate_unit: PayRateUnit | null;
  line_amount_vnd: number;
  created_at: string;
}

export interface PayrollAdjustment {
  id: string;
  payslip_id: string;
  type: PayrollAdjustmentType;
  label: string;
  amount_vnd: number;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export interface PayrollPayslipDetail {
  payslip: PayrollPayslip;
  teacher: { id: string; full_name: string; email: string };
  lines: PayrollPayslipLine[];
  adjustments: PayrollAdjustment[];
}

export interface PayrollPayslipListItem {
  payslip: PayrollPayslip;
  teacher_full_name: string;
  teacher_email: string;
}

export interface PayrollBatchListItem {
  batch: PayrollBatch;
  payslip_count: number;
  total_net_vnd: number;
}

export interface PayrollBatchDetail {
  batch: PayrollBatch;
  payslips: PayrollPayslipListItem[];
}

export const PAYROLL_BATCH_STATUS_LABELS: Record<PayrollBatchStatus, string> = {
  draft: "Bản nháp",
  confirmed: "Đã chốt",
  paid: "Đã thanh toán",
};

export const PAYROLL_PAYSLIP_STATUS_LABELS: Record<PayrollPayslipStatus, string> = {
  draft: "Bản nháp",
  confirmed: "Đã chốt",
  teacher_acknowledged: "GV đã xác nhận",
  paid: "Đã thanh toán",
};

export const PAYROLL_ADJUSTMENT_TYPE_LABELS: Record<PayrollAdjustmentType, string> = {
  bonus: "Thưởng",
  penalty: "Phạt",
  advance: "Tạm ứng",
  tax_pit: "Thuế TNCN",
  other: "Khác",
};
