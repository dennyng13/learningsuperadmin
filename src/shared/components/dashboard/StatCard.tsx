import { ReactNode } from "react";
import { TrendingUp } from "lucide-react";
import { cn } from "@shared/lib/utils";

export interface StatCardProps {
  label: string;
  value: number | string;
  delta?: string;
  deltaPositive?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  /** Decorative SVG rendered bottom-right */
  decor?: ReactNode;
  iconTone?: "teal" | "coral";
  onClick?: () => void;
  className?: string;
}

/**
 * KPI / stat card with optional decorative geometric illustration.
 * Used by DashboardHero and any other admin landing surface.
 */
export default function StatCard({
  label, value, delta, deltaPositive = true, icon: Icon, decor,
  iconTone = "teal", onClick, className,
}: StatCardProps) {
  const iconBg = iconTone === "coral"
    ? "bg-accent/12 text-accent"
    : "bg-primary/12 text-primary";

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
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
          <Icon className="h-5 w-5" />
        </div>
        {delta && (
          <span className={cn(
            "inline-flex items-center gap-0.5 text-[11px] font-bold rounded-full px-2 py-0.5",
            deltaPositive ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent",
          )}>
            <TrendingUp className={cn("h-3 w-3", !deltaPositive && "rotate-180")} />
            {delta}
          </span>
        )}
      </div>

      <div className="relative mt-4">
        <p className="text-[11px] uppercase tracking-[0.1em] font-semibold text-muted-foreground">{label}</p>
        <p className="font-display text-3xl md:text-4xl font-extrabold text-foreground mt-1 leading-none tracking-tight">
          {value}
        </p>
      </div>
    </Comp>
  );
}