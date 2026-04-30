import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@shared/lib/utils";
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import type { HTMLAttributes } from "react";

const kpiCardVariants = cva(
  "border-[2.5px] border-lp-ink rounded-pop-lg shadow-pop p-5 flex flex-col gap-1 transition-all duration-200",
  {
    variants: {
      tone: {
        white:        "bg-white text-lp-ink",
        cream:        "bg-lp-cream text-lp-ink",
        teal:         "bg-lp-teal text-white",
        "teal-deep":  "bg-lp-teal-deep text-white",
        coral:        "bg-lp-coral text-white",
        "coral-deep": "bg-lp-coral-deep text-white",
        yellow:       "bg-lp-yellow text-lp-ink",
        violet:       "bg-lp-violet text-white",
        sky:          "bg-lp-sky text-lp-ink",
        pink:         "bg-lp-pink text-lp-ink",
        rose:         "bg-lp-rose text-white",
        mint:         "bg-lp-mint text-white",
        ink:          "bg-lp-ink text-white",
      },
    },
    defaultVariants: { tone: "white" },
  },
);

type Trend = "up" | "down" | "flat";

export interface KPICardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof kpiCardVariants> {
  label: string;
  value: string | number;
  delta?: number;
  trend?: Trend;
  icon?: LucideIcon;
}

function deriveTrend(delta: number | undefined, explicit: Trend | undefined): Trend | null {
  if (explicit) return explicit;
  if (typeof delta !== "number") return null;
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "flat";
}

const trendIcon: Record<Trend, typeof ArrowUpRight> = {
  up:   ArrowUpRight,
  down: ArrowDownRight,
  flat: Minus,
};

const trendClass: Record<Trend, string> = {
  up:   "text-emerald-600",
  down: "text-rose-600",
  flat: "text-lp-body",
};

export function KPICard({
  label,
  value,
  delta,
  trend,
  tone,
  icon: LeadIcon,
  className,
  ...props
}: KPICardProps) {
  const t = deriveTrend(delta, trend);
  const TrendIcon = t ? trendIcon[t] : null;
  const isOnDarkTone =
    tone === "teal" ||
    tone === "teal-deep" ||
    tone === "coral" ||
    tone === "coral-deep" ||
    tone === "violet" ||
    tone === "mint" ||
    tone === "rose" ||
    tone === "ink";

  return (
    <div className={cn(kpiCardVariants({ tone }), "relative", className)} {...props}>
      {LeadIcon && (
        <LeadIcon
          aria-hidden="true"
          className={cn(
            "absolute top-4 right-4 size-5",
            isOnDarkTone ? "text-white/85" : "text-lp-ink/70",
          )}
          strokeWidth={2.25}
        />
      )}
      <span className={cn("text-xs font-semibold uppercase tracking-wider opacity-70 font-body", LeadIcon && "pr-7")}>
        {label}
      </span>
      <span className="font-display text-3xl font-extrabold leading-tight">{value}</span>
      {t && TrendIcon && (
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs font-semibold",
            isOnDarkTone ? "text-white/90" : trendClass[t],
          )}
        >
          <TrendIcon className="size-3.5" />
          {typeof delta === "number" ? `${delta > 0 ? "+" : ""}${delta}%` : null}
        </span>
      )}
    </div>
  );
}
