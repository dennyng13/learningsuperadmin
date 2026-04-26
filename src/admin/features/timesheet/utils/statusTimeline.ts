import type { TimelineStep } from "@shared/components/StatusTimeline";
import type { TimesheetPeriodStatus } from "../types";

const FLOW: Array<{ key: TimesheetPeriodStatus; label: string }> = [
  { key: "open", label: "Đang mở" },
  { key: "submitted", label: "Đã gửi" },
  { key: "approved", label: "Đã duyệt" },
  { key: "locked", label: "Đã khoá" },
];

export function getTimesheetTimeline(status: TimesheetPeriodStatus): TimelineStep[] {
  if (status === "revision_requested") {
    return [
      { key: "open", label: "Đang mở", state: "done" },
      { key: "submitted", label: "Đã gửi", state: "done" },
      { key: "revision_requested", label: "Yêu cầu sửa", state: "active" },
      { key: "approved", label: "Đã duyệt", state: "pending" },
      { key: "locked", label: "Đã khoá", state: "pending" },
    ];
  }
  const idx = FLOW.findIndex((s) => s.key === status);
  if (idx === -1) return FLOW.map((s) => ({ ...s, state: "pending" as const }));
  return FLOW.map((s, i) => ({
    ...s,
    state: i < idx ? "done" : i === idx ? "active" : "pending",
  }));
}
