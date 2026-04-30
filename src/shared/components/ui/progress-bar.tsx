import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@shared/lib/utils";
import type { HTMLAttributes } from "react";

const trackVariants = cva(
  "relative w-full overflow-hidden border-[2px] border-lp-ink rounded-full bg-white",
  {
    variants: {
      size: {
        sm: "h-2",
        md: "h-3",
        lg: "h-5",
      },
    },
    defaultVariants: { size: "md" },
  },
);

const fillVariants = cva("h-full rounded-full transition-all ease-bounce duration-500", {
  variants: {
    tone: {
      teal:   "bg-lp-teal",
      coral:  "bg-lp-coral",
      yellow: "bg-lp-yellow",
      violet: "bg-lp-violet",
      sky:    "bg-lp-sky",
    },
  },
  defaultVariants: { tone: "teal" },
});

export interface ProgressBarProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children">,
    VariantProps<typeof trackVariants>,
    VariantProps<typeof fillVariants> {
  value: number;
  max?: number;
  label?: string;
  showPercent?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  tone,
  size,
  label,
  showPercent,
  className,
  ...props
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div className={cn("flex flex-col gap-1.5", className)} {...props}>
      {(label || showPercent) && (
        <div className="flex items-baseline justify-between text-xs font-semibold text-lp-ink">
          {label && <span>{label}</span>}
          {showPercent && <span className="font-display tabular-nums">{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        className={trackVariants({ size })}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className={fillVariants({ tone })} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
