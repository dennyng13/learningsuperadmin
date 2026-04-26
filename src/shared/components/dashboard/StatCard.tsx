import { ReactNode } from "react";
import { TrendingUp } from "lucide-react";
import { cn } from "@shared/lib/utils";
import { ICON_TONE_CLASS, type DashboardCardBaseProps } from "./types";

export interface StatCardProps extends Omit<DashboardCardBaseProps, "title" | "icon"> {
  /** Uppercase eyebrow label (replaces the previous `label` prop). */
  eyebrow: string;
  /** Big numeric/text value displayed as the headline. */
  value: number | string;
  /** Optional small delta chip (e.g. "+12%"). */
  delta?: string;
  deltaPositive?: boolean;
  /** Required leading icon. */
  icon: NonNullable<DashboardCardBaseProps["icon"]>;
  /** Decorative SVG rendered bottom-right. */
  decor?: ReactNode;
}

/**
 * KPI / stat card with optional decorative geometric illustration.
 * Used by DashboardHero and any other admin landing surface.
 */
export default function StatCard({
  eyebrow, value, delta, deltaPositive = true, icon: Icon, decor,
  iconTone = "teal", action, onClick, className,
}: StatCardProps) {
  const Comp: any = onClick ? "button" : "div";

  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-card text-left p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)] min-h-[148px]",
        onClick && "hover:shadow-[0_10px_30px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 transition-all duration-300",
        className,
      )}
    >
      {decor && (
        <div className="pointer-events-none absolute -bottom-2 -right-2 w-28 h-28 opacity-90">
          {decor}
        </div>
      )}

      <div className="relative flex items-start justify-between">
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", ICON_TONE_CLASS[iconTone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex items-center gap-2">
          {delta && (
            <span className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-bold rounded-full px-2 py-0.5",
              deltaPositive ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent",
            )}>
              <TrendingUp className={cn("h-3 w-3", !deltaPositive && "rotate-180")} />
              {delta}
            </span>
          )}
          {action}
        </div>
      </div>

      <div className="relative mt-4">
        <p className="text-[11px] uppercase tracking-[0.1em] font-semibold text-muted-foreground">{eyebrow}</p>
        <p className="font-display text-3xl md:text-4xl font-extrabold text-foreground mt-1 leading-none tracking-tight">
          {value}
        </p>
      </div>
    </Comp>
  );
}