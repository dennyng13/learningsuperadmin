import { cva, type VariantProps } from "class-variance-authority";
import { Button, type ButtonProps } from "./button";
import { cn } from "@shared/lib/utils";

const popButtonVariants = cva(
  "border-[2.5px] border-lp-ink shadow-pop-sm transition-all duration-150 " +
    "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pop " +
    "active:translate-x-0.5 active:translate-y-0.5 active:shadow-pop-xs " +
    "rounded-pop font-display font-bold",
  {
    variants: {
      tone: {
        coral:  "bg-lp-coral text-white",
        teal:   "bg-lp-teal text-white",
        yellow: "bg-lp-yellow text-lp-ink",
        white:  "bg-white text-lp-ink",
        ink:    "bg-lp-ink text-white",
      },
      size: {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base",
      },
    },
    defaultVariants: { tone: "coral", size: "md" },
  },
);

export interface PopButtonProps
  extends Omit<ButtonProps, "variant" | "size">,
    VariantProps<typeof popButtonVariants> {}

export function PopButton({ tone, size, className, ...props }: PopButtonProps) {
  return <Button className={cn(popButtonVariants({ tone, size }), className)} {...props} />;
}
