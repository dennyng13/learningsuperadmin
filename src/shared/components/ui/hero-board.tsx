import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@shared/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

const heroBoardVariants = cva(
  "relative border-[2.5px] border-lp-ink rounded-pop-lg shadow-pop-lg p-6 md:p-8 overflow-hidden",
  {
    variants: {
      tone: {
        cream:  "bg-lp-cream text-lp-ink",
        teal:   "bg-lp-teal text-white",
        coral:  "bg-lp-coral text-white",
        yellow: "bg-lp-yellow text-lp-ink",
        white:  "bg-white text-lp-ink",
        ink:    "bg-lp-ink text-white",
      },
    },
    defaultVariants: { tone: "cream" },
  },
);

export interface HeroBoardProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title">,
    VariantProps<typeof heroBoardVariants> {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  illustration?: ReactNode;
}

export function HeroBoard({
  title,
  subtitle,
  action,
  illustration,
  tone,
  className,
  ...props
}: HeroBoardProps) {
  return (
    <div className={cn(heroBoardVariants({ tone }), className)} {...props}>
      <div className="flex items-stretch gap-6">
        <div className="flex-1 flex flex-col justify-between min-h-[140px]">
          <div className="space-y-2">
            <h1 className="font-display text-3xl md:text-4xl font-extrabold leading-tight tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm md:text-base opacity-80 font-body max-w-2xl">{subtitle}</p>
            )}
          </div>
          {action && <div className="mt-4 flex justify-start md:justify-end">{action}</div>}
        </div>
        {illustration && (
          <aside className="hidden md:flex items-center justify-center shrink-0 w-32 lg:w-40">
            {illustration}
          </aside>
        )}
      </div>
    </div>
  );
}
