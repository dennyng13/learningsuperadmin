import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@shared/lib/utils";
import type { ButtonHTMLAttributes } from "react";

const tabPillVariants = cva(
  "inline-flex items-center gap-2 border-[2px] border-lp-ink rounded-full font-display font-bold transition-all duration-150 " +
    "hover:-translate-y-0.5 hover:shadow-pop-xs " +
    "active:translate-y-0 active:shadow-none",
  {
    variants: {
      tone: {
        teal:   "",
        coral:  "",
        yellow: "",
      },
      size: {
        sm: "px-3 py-1 text-xs",
        md: "px-4 py-1.5 text-sm",
      },
      active: {
        true:  "shadow-pop-xs",
        false: "bg-white text-lp-ink shadow-none",
      },
    },
    compoundVariants: [
      { active: true, tone: "teal",   class: "bg-lp-teal text-white" },
      { active: true, tone: "coral",  class: "bg-lp-coral text-white" },
      { active: true, tone: "yellow", class: "bg-lp-yellow text-lp-ink" },
    ],
    defaultVariants: { tone: "teal", size: "md", active: false },
  },
);

const countBadgeVariants = cva(
  "inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold border-[1.5px] border-lp-ink",
  {
    variants: {
      active: {
        true:  "bg-white text-lp-ink",
        false: "bg-lp-ink text-white",
      },
    },
    defaultVariants: { active: false },
  },
);

export interface TabPillProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">,
    VariantProps<typeof tabPillVariants> {
  count?: number;
}

export function TabPill({ tone, size, active, count, className, children, ...props }: TabPillProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active ?? false}
      className={cn(tabPillVariants({ tone, size, active }), className)}
      {...props}
    >
      {children}
      {typeof count === "number" && (
        <span className={countBadgeVariants({ active })}>{count}</span>
      )}
    </button>
  );
}
