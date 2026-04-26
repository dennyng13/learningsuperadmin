import { cn } from "@shared/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@shared/components/ui/tooltip";
import {
  Pencil, UserPlus, Repeat, CheckCircle2, PlayCircle,
  Trophy, PauseCircle, XCircle, type LucideIcon,
} from "lucide-react";

/* ─────────── Types ─────────── */

export type ClassLifecycleStatus =
  | "planning"
  | "recruiting"
  | "recruiting_replacement"
  | "ready"
  | "in_progress"
  | "completed"
  | "postponed"
  | "cancelled";

interface StatusMeta {
  label: string;
  icon: LucideIcon;
  /** Tailwind class fragments cho badge full (bg + text + border). */
  classes: string;
  /** Variant compact (chỉ chip nhỏ, không icon hoàn chỉnh). */
  dotClass: string;
}

export const CLASS_STATUS_META: Record<ClassLifecycleStatus, StatusMeta> = {
  planning: {
    label: "Lên kế hoạch",
    icon: Pencil,
    classes: "bg-muted/60 text-muted-foreground border-border",
    dotClass: "bg-muted-foreground/60",
  },
  recruiting: {
    label: "Đang tuyển",
    icon: UserPlus,
    classes: "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-300",
    dotClass: "bg-blue-500",
  },
  recruiting_replacement: {
    label: "Tuyển thay thế",
    icon: Repeat,
    classes: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300",
    dotClass: "bg-amber-500",
  },
  ready: {
    label: "Sẵn sàng",
    icon: CheckCircle2,
    classes: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
    dotClass: "bg-emerald-500",
  },
  in_progress: {
    label: "Đang học",
    icon: PlayCircle,
    classes: "bg-primary/10 text-primary border-primary/30",
    dotClass: "bg-primary",
  },
  completed: {
    label: "Hoàn thành",
    icon: Trophy,
    classes: "bg-violet-500/10 text-violet-700 border-violet-500/30 dark:text-violet-300",
    dotClass: "bg-violet-500",
  },
  postponed: {
    label: "Tạm hoãn",
    icon: PauseCircle,
    classes: "bg-orange-500/10 text-orange-700 border-orange-500/30 dark:text-orange-300",
    dotClass: "bg-orange-500",
  },
  cancelled: {
    label: "Đã huỷ",
    icon: XCircle,
    classes: "bg-destructive/10 text-destructive border-destructive/30",
    dotClass: "bg-destructive",
  },
};

/** Thứ tự hiển thị mặc định trong dropdown / counter row. */
export const CLASS_STATUS_OPTIONS: ClassLifecycleStatus[] = [
  "planning",
  "recruiting",
  "recruiting_replacement",
  "ready",
  "in_progress",
  "completed",
  "postponed",
  "cancelled",
];

/* ─────────── Badge ─────────── */

interface Props {
  status: ClassLifecycleStatus | string | null | undefined;
  size?: "sm" | "md";
  /** True → chỉ hiện dot + label rất gọn (cho counter chip). */
  compact?: boolean;
  /** Reason hiển thị qua tooltip — chủ yếu cho cancelled/postponed. */
  reason?: string | null;
  className?: string;
}

/**
 * Badge trạng thái lifecycle của lớp học. An toàn cho status bất kỳ — fallback
 * về meta "planning" khi nhận giá trị không thuộc enum (vd. data legacy chưa
 * migrate). Tooltip hiện reason nếu có (cancelled / postponed).
 */
export default function ClassStatusBadge({ status, size = "md", compact, reason, className }: Props) {
  const safeStatus = (status && status in CLASS_STATUS_META
    ? (status as ClassLifecycleStatus)
    : "planning");
  const meta = CLASS_STATUS_META[safeStatus];
  const Icon = meta.icon;

  const sizeCls = size === "sm" ? "text-[10px] px-1.5 py-0.5 gap-1" : "text-xs px-2 py-1 gap-1.5";
  const iconCls = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  const badge = compact ? (
    <span
      className={cn(
        "inline-flex items-center rounded-full border bg-background/60 backdrop-blur px-2 py-0.5 text-[10px] font-medium gap-1.5",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dotClass)} aria-hidden />
      <span>{meta.label}</span>
    </span>
  ) : (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        sizeCls,
        meta.classes,
        className,
      )}
    >
      <Icon className={iconCls} strokeWidth={2} />
      <span>{meta.label}</span>
    </span>
  );

  if (!reason) return badge;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{badge}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {reason}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
