import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@shared/lib/utils";
import type { HTMLAttributes } from "react";

const tableWrapVariants = cva(
  "border-[2.5px] border-lp-ink rounded-pop-lg overflow-hidden",
  {
    variants: {
      tone: {
        white:  "bg-white text-lp-ink",
        cream:  "bg-lp-cream text-lp-ink",
        teal:   "bg-lp-teal text-white",
        coral:  "bg-lp-coral text-white",
        yellow: "bg-lp-yellow text-lp-ink",
        ink:    "bg-lp-ink text-white",
      },
      shadow: {
        none: "",
        sm:   "shadow-pop-sm",
        md:   "shadow-pop",
        lg:   "shadow-pop-lg",
      },
    },
    defaultVariants: { tone: "white", shadow: "sm" },
  },
);

export interface TableWrapProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof tableWrapVariants> {}

export function TableWrap({ tone, shadow, className, ...props }: TableWrapProps) {
  return <div className={cn(tableWrapVariants({ tone, shadow }), className)} {...props} />;
}
