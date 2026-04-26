import { Badge } from "@shared/components/ui/badge";
import {
  PAYROLL_BATCH_STATUS_LABELS,
  type PayrollBatchStatus,
} from "../types";

const TONE: Record<PayrollBatchStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  confirmed: "bg-amber-50 text-amber-800 border-amber-200",
  paid: "bg-emerald-50 text-emerald-800 border-emerald-200",
};

export default function PayrollBatchStatusBadge({ status }: { status: PayrollBatchStatus }) {
  return (
    <Badge variant="outline" className={`text-xs ${TONE[status]}`}>
      {PAYROLL_BATCH_STATUS_LABELS[status]}
    </Badge>
  );
}
