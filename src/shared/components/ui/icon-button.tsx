import { cva, type VariantProps } from "class-variance-authority";
import { Button, type ButtonProps } from "./button";
import { cn } from "@shared/lib/utils";

const iconButtonVariants = cva(
  "relative inline-flex items-center justify-center border-[2.5px] border-lp-ink shadow-pop-sm transition-all duration-150 " +
    "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pop " +
    "active:translate-x-0.5 active:translate-y-0.5 active:shadow-pop-xs " +
    "rounded-pop",
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
        sm: "h-8 w-8 [&_svg]:size-4",
        md: "h-10 w-10 [&_svg]:size-5",
      },
    },
    defaultVariants: { tone: "white", size: "md" },
  },
);

export interface IconButtonProps
  extends Omit<ButtonProps, "variant" | "size">,
    VariantProps<typeof iconButtonVariants> {
  hasDot?: boolean;
  "aria-label": string;
}

export function IconButton({ tone, size, hasDot, className, children, ...props }: IconButtonProps) {
  return (
    <Button className={cn(iconButtonVariants({ tone, size }), className)} {...props}>
      {children}
      {hasDot && (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-lp-coral border-2 border-lp-ink animate-pulse-dot"
        />
      )}
    </Button>
  );
}
