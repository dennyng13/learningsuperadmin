import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@shared/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

const tableToolbarVariants = cva(
  "flex flex-wrap items-center gap-3 px-4 py-3 border-b-[2px] border-lp-ink",
  {
    variants: {
      tone: {
        white:  "bg-white",
        cream:  "bg-lp-cream",
        teal:   "bg-lp-teal text-white",
        coral:  "bg-lp-coral text-white",
        yellow: "bg-lp-yellow text-lp-ink",
        ink:    "bg-lp-ink text-white",
      },
    },
    defaultVariants: { tone: "white" },
  },
);

export interface TableToolbarProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof tableToolbarVariants> {
  title?: string;
  subtitle?: string;
  search?: ReactNode;
  actions?: ReactNode;
}

export function TableToolbar({
  title,
  subtitle,
  search,
  actions,
  tone,
  className,
  ...props
}: TableToolbarProps) {
  const hasHeading = title || subtitle;

  return (
    <div className={cn(tableToolbarVariants({ tone }), className)} {...props}>
      {hasHeading && (
        <div className="min-w-0 flex-shrink-0">
          {title && <h3 className="font-display text-lg font-extrabold leading-tight">{title}</h3>}
          {subtitle && <p className="text-xs opacity-75 mt-0.5">{subtitle}</p>}
        </div>
      )}
      {search && <div className="flex-1 min-w-[160px]">{search}</div>}
      {actions && <div className="flex items-center gap-2 ml-auto">{actions}</div>}
    </div>
  );
}
