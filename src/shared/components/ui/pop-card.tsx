import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { Card } from "./card";
import { cn } from "@shared/lib/utils";

const popCardVariants = cva(
  "border-[2.5px] border-lp-ink rounded-pop-lg bg-white transition-all duration-200",
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
      shadow: {
        none: "",
        sm:   "shadow-pop-sm",
        md:   "shadow-pop",
        lg:   "shadow-pop-lg",
      },
      hover: {
        none: "",
        lift: "hover:-translate-x-1 hover:-translate-y-1 hover:shadow-pop-lg",
      },
    },
    defaultVariants: { tone: "white", shadow: "md", hover: "none" },
  },
);

type CardProps = React.ComponentPropsWithoutRef<typeof Card>;

export interface PopCardProps extends CardProps, VariantProps<typeof popCardVariants> {}

export function PopCard({ tone, shadow, hover, className, ...props }: PopCardProps) {
  return <Card className={cn(popCardVariants({ tone, shadow, hover }), className)} {...props} />;
}
