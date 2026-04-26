import { Badge } from "@shared/components/ui/badge";
import {
  PAYROLL_PAYSLIP_STATUS_LABELS,
  type PayrollPayslipStatus,
} from "../types";

const TONE: Record<PayrollPayslipStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  confirmed: "bg-amber-50 text-amber-800 border-amber-200",
  teacher_acknowledged: "bg-sky-50 text-sky-800 border-sky-200",
  paid: "bg-emerald-50 text-emerald-800 border-emerald-200",
};

export default function PayrollPayslipStatusBadge({
  status,
}: {
  status: PayrollPayslipStatus;
}) {
  return (
    <Badge variant="outline" className={`text-xs ${TONE[status]}`}>
      {PAYROLL_PAYSLIP_STATUS_LABELS[status]}
    </Badge>
  );
}
