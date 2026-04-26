import { Badge } from "@shared/components/ui/badge";
import {
  TIMESHEET_PERIOD_STATUS_LABELS,
  type TimesheetPeriodStatus,
} from "../types";

const TONE: Record<TimesheetPeriodStatus, string> = {
  open: "bg-slate-100 text-slate-700 border-slate-200",
  submitted: "bg-amber-50 text-amber-800 border-amber-200",
  revision_requested: "bg-rose-50 text-rose-800 border-rose-200",
  approved: "bg-emerald-50 text-emerald-800 border-emerald-200",
  locked: "bg-slate-200 text-slate-800 border-slate-300",
};

export default function TimesheetPeriodStatusBadge({
  status,
}: {
  status: TimesheetPeriodStatus;
}) {
  return (
    <Badge variant="outline" className={`text-xs ${TONE[status]}`}>
      {TIMESHEET_PERIOD_STATUS_LABELS[status]}
    </Badge>
  );
}
