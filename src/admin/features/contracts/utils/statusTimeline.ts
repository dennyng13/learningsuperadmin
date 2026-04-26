import type { TimelineStep } from "@shared/components/StatusTimeline";
import type { ContractStatus } from "../types";
import type { AddendumStatus } from "../types";

const CONTRACT_FLOW: Array<{ key: ContractStatus; label: string }> = [
  { key: "draft", label: "Soạn" },
  { key: "awaiting_teacher", label: "Chờ GV ký" },
  { key: "awaiting_admin", label: "Chờ admin ký" },
  { key: "active", label: "Hiệu lực" },
  { key: "expired", label: "Hết hạn" },
];

export function getContractTimeline(status: ContractStatus): TimelineStep[] {
  if (status === "terminated") {
    return CONTRACT_FLOW.map((s) => ({ ...s, state: "skipped" as const })).concat([
      { key: "terminated", label: "Đã chấm dứt", state: "active" } as TimelineStep,
    ]);
  }
  if (status === "revision_requested") {
    return [
      { key: "draft", label: "Soạn", state: "done" },
      { key: "awaiting_teacher", label: "Chờ GV ký", state: "done" },
      { key: "revision_requested", label: "Yêu cầu sửa", state: "active" },
      { key: "awaiting_admin", label: "Chờ admin ký", state: "pending" },
      { key: "active", label: "Hiệu lực", state: "pending" },
    ];
  }
  if (status === "renewing") {
    return CONTRACT_FLOW.map((s) =>
      s.key === "active"
        ? { ...s, state: "done" as const }
        : s.key === "expired"
          ? { ...s, state: "pending" as const }
          : { ...s, state: "done" as const },
    ).concat([{ key: "renewing", label: "Đang gia hạn", state: "active" } as TimelineStep]);
  }
  const idx = CONTRACT_FLOW.findIndex((s) => s.key === status);
  if (idx === -1) {
    return CONTRACT_FLOW.map((s) => ({ ...s, state: "pending" as const }));
  }
  return CONTRACT_FLOW.map((s, i) => ({
    ...s,
    state: i < idx ? "done" : i === idx ? "active" : "pending",
  }));
}

const ADDENDUM_FLOW: Array<{ key: AddendumStatus; label: string }> = [
  { key: "draft", label: "Soạn" },
  { key: "awaiting_teacher", label: "Chờ GV ký" },
  { key: "awaiting_admin", label: "Chờ admin ký" },
  { key: "active", label: "Hiệu lực" },
];

export function getAddendumTimeline(status: AddendumStatus): TimelineStep[] {
  if (status === "superseded") {
    return ADDENDUM_FLOW.map((s) =>
      s.key === "active" ? { ...s, state: "done" as const } : { ...s, state: "done" as const },
    ).concat([{ key: "superseded", label: "Đã thay thế", state: "active" } as TimelineStep]);
  }
  if (status === "terminated") {
    return ADDENDUM_FLOW.map((s) => ({ ...s, state: "skipped" as const })).concat([
      { key: "terminated", label: "Đã chấm dứt", state: "active" } as TimelineStep,
    ]);
  }
  if (status === "revision_requested") {
    return [
      { key: "draft", label: "Soạn", state: "done" },
      { key: "awaiting_teacher", label: "Chờ GV ký", state: "done" },
      { key: "revision_requested", label: "Yêu cầu sửa", state: "active" },
      { key: "awaiting_admin", label: "Chờ admin ký", state: "pending" },
      { key: "active", label: "Hiệu lực", state: "pending" },
    ];
  }
  const idx = ADDENDUM_FLOW.findIndex((s) => s.key === status);
  if (idx === -1) {
    return ADDENDUM_FLOW.map((s) => ({ ...s, state: "pending" as const }));
  }
  return ADDENDUM_FLOW.map((s, i) => ({
    ...s,
    state: i < idx ? "done" : i === idx ? "active" : "pending",
  }));
}
