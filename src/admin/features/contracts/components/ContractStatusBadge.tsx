import { Badge } from "@shared/components/ui/badge";
import { CONTRACT_STATUS_LABELS, type ContractStatus } from "../types";
import { cn } from "@shared/lib/utils";

const STATUS_STYLES: Record<ContractStatus, string> = {
  draft: "bg-slate-100 text-slate-700 hover:bg-slate-100",
  awaiting_teacher: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  awaiting_admin: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  revision_requested: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  active: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  renewing: "bg-indigo-100 text-indigo-800 hover:bg-indigo-100",
  expired: "bg-zinc-200 text-zinc-700 hover:bg-zinc-200",
  terminated: "bg-rose-100 text-rose-800 hover:bg-rose-100",
};

interface Props {
  status: ContractStatus;
  className?: string;
}

export default function ContractStatusBadge({ status, className }: Props) {
  return (
    <Badge variant="secondary" className={cn(STATUS_STYLES[status], "border-0 font-medium", className)}>
      {CONTRACT_STATUS_LABELS[status]}
    </Badge>
  );
}
