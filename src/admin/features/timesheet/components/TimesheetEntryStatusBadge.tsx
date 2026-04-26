import { Badge } from "@shared/components/ui/badge";
import {
  TIMESHEET_ENTRY_STATUS_LABELS,
  type TimesheetEntryStatus,
} from "../types";

const TONE: Record<TimesheetEntryStatus, string> = {
  planned: "bg-slate-100 text-slate-700 border-slate-200",
  taught: "bg-emerald-50 text-emerald-800 border-emerald-200",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
  teacher_absent: "bg-rose-50 text-rose-800 border-rose-200",
  substituted: "bg-amber-50 text-amber-800 border-amber-200",
};

export default function TimesheetEntryStatusBadge({
  status,
}: {
  status: TimesheetEntryStatus;
}) {
  return (
    <Badge variant="outline" className={`text-xs ${TONE[status]}`}>
      {TIMESHEET_ENTRY_STATUS_LABELS[status]}
    </Badge>
  );
}
