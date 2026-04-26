import type { TimelineStep } from "@shared/components/StatusTimeline";
import type { PayrollPayslipStatus } from "../types";

const FLOW: Array<{ key: PayrollPayslipStatus; label: string }> = [
  { key: "draft", label: "Bản nháp" },
  { key: "confirmed", label: "Đã chốt" },
  { key: "teacher_acknowledged", label: "GV xác nhận" },
  { key: "paid", label: "Đã thanh toán" },
];

export function getPayslipTimeline(status: PayrollPayslipStatus): TimelineStep[] {
  const idx = FLOW.findIndex((s) => s.key === status);
  if (idx === -1) return FLOW.map((s) => ({ ...s, state: "pending" as const }));
  return FLOW.map((s, i) => ({
    ...s,
    state: i < idx ? "done" : i === idx ? "active" : "pending",
  }));
}
