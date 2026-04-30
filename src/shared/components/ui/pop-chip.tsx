import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@shared/lib/utils";
import type { HTMLAttributes } from "react";

const popChipVariants = cva(
  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border-[2px] border-lp-ink font-body text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      tone: {
        teal:   "bg-lp-teal text-white",
        coral:  "bg-lp-coral text-white",
        yellow: "bg-lp-yellow text-lp-ink",
        violet: "bg-lp-violet text-white",
        sky:    "bg-lp-sky text-lp-ink",
        cream:  "bg-lp-cream text-lp-ink",
      },
      live: {
        true:  "before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-current before:animate-pulse-dot",
        false: "",
      },
    },
    defaultVariants: { tone: "teal", live: false },
  },
);

export interface PopChipProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof popChipVariants> {}

export function PopChip({ tone, live, className, children, ...props }: PopChipProps) {
  return (
    <span className={cn(popChipVariants({ tone, live }), className)} {...props}>
      {children}
    </span>
  );
}
