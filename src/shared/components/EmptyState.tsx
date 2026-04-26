import type { LucideIcon } from "lucide-react";
import { cn } from "@shared/lib/utils";

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Standard empty state used across admin features. Replaces the ad-hoc
 * "Chưa có ..." text blocks scattered through the codebase.
 */
export default function EmptyState({ icon: Icon, title, description, action, className }: Props) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border/70 bg-card/40",
        "flex flex-col items-center justify-center gap-2 px-6 py-10 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="rounded-full bg-muted p-3 mb-1">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <div className="font-medium text-sm">{title}</div>
      {description && (
        <div className="text-xs text-muted-foreground max-w-sm">{description}</div>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
