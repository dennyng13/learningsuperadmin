import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@shared/lib/utils";
import type { HTMLAttributes } from "react";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border-[1.5px] border-lp-ink font-body text-[11px] font-semibold whitespace-nowrap",
  {
    variants: {
      status: {
        active:   "bg-lp-teal text-white",
        archived: "bg-white text-lp-body",
        pending:  "bg-lp-violet text-white",
        warning:  "bg-lp-yellow text-lp-ink",
        error:    "bg-lp-coral text-white",
        success:  "bg-[var(--lp-mint)] text-white",
        info:     "bg-lp-sky text-lp-ink",
      },
      live: {
        true:  "before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-current before:animate-pulse-dot",
        false: "",
      },
    },
    defaultVariants: { status: "active", live: false },
  },
);

export interface StatusBadgeProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children">,
    VariantProps<typeof statusBadgeVariants> {
  label: string;
}

export function StatusBadge({ status, live, label, className, ...props }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ status, live }), className)} {...props}>
      {label}
    </span>
  );
}
