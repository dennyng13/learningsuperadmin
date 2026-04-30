import { cn } from "@shared/lib/utils";
import { PackageOpen, type LucideIcon } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

export interface EmptyMascotProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
}

export function EmptyMascot({
  title,
  description,
  action,
  icon: Icon = PackageOpen,
  className,
  ...props
}: EmptyMascotProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center gap-3 min-h-[200px] p-6",
        "border-[2.5px] border-dashed border-lp-ink/40 rounded-pop-lg bg-white/50",
        className,
      )}
      {...props}
    >
      <Icon className="size-14 text-lp-ink animate-wiggle" strokeWidth={1.75} />
      <div className="space-y-1">
        <h3 className="font-display text-lg font-bold text-lp-ink">{title}</h3>
        {description && <p className="text-sm text-lp-body max-w-sm">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
