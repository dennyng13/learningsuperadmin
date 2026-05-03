/**
 * ClassHealthSnapshot — 5 KPI cards với delta indicators
 * Match mockup pages-class-detail.jsx "Class Health Snapshot"
 *
 * Stats:
 * - Band TB lớp (+delta so với W1)
 * - Điểm danh (+delta tuần này)
 * - Hoàn thành BT (+delta pack #5)
 * - Vào target (+delta tuần qua)
 * - Retention (students remaining)
 */
import { Trophy, Check, Edit3, Flag, Users, ArrowUp, ArrowDown, Minus, type LucideIcon } from "lucide-react";
import { Card } from "@shared/components/ui/card";
import { cn } from "@shared/lib/utils";

export interface HealthMetric {
  label: string;
  value: string;
  delta: string;
  deltaLabel: string;
  tone: "teal" | "yellow" | "coral" | "violet" | "pink";
  icon: LucideIcon;
  trend: "up" | "down" | "flat";
}

interface ClassHealthSnapshotProps {
  metrics?: HealthMetric[];
  loading?: boolean;
}

const TONE_STYLES: Record<HealthMetric["tone"], { bg: string; border: string; iconBg: string; iconColor: string; deltaBg: string; deltaColor: string }> = {
  teal: {
    bg: "bg-gradient-to-br from-teal-50 to-teal-100/50",
    border: "border-teal-200",
    iconBg: "bg-teal-500",
    iconColor: "text-white",
    deltaBg: "bg-teal-500/15",
    deltaColor: "text-teal-700",
  },
  yellow: {
    bg: "bg-gradient-to-br from-amber-50 to-amber-100/50",
    border: "border-amber-200",
    iconBg: "bg-amber-500",
    iconColor: "text-white",
    deltaBg: "bg-amber-500/15",
    deltaColor: "text-amber-700",
  },
  coral: {
    bg: "bg-gradient-to-br from-rose-50 to-rose-100/50",
    border: "border-rose-200",
    iconBg: "bg-rose-500",
    iconColor: "text-white",
    deltaBg: "bg-rose-500/15",
    deltaColor: "text-rose-700",
  },
  violet: {
    bg: "bg-gradient-to-br from-violet-50 to-violet-100/50",
    border: "border-violet-200",
    iconBg: "bg-violet-500",
    iconColor: "text-white",
    deltaBg: "bg-violet-500/15",
    deltaColor: "text-violet-700",
  },
  pink: {
    bg: "bg-gradient-to-br from-pink-50 to-pink-100/50",
    border: "border-pink-200",
    iconBg: "bg-pink-500",
    iconColor: "text-white",
    deltaBg: "bg-pink-500/15",
    deltaColor: "text-pink-700",
  },
};

const TREND_ICONS = {
  up: ArrowUp,
  down: ArrowDown,
  flat: Minus,
};

const TREND_COLORS = {
  up: "text-emerald-600",
  down: "text-rose-600",
  flat: "text-slate-500",
};

const DEFAULT_METRICS: HealthMetric[] = [
  { label: "Band TB lớp", value: "6.2", delta: "+0.5", deltaLabel: "so với W1", tone: "teal", icon: Trophy, trend: "up" },
  { label: "Điểm danh", value: "88%", delta: "+3%", deltaLabel: "tuần này", tone: "yellow", icon: Check, trend: "up" },
  { label: "Hoàn thành BT", value: "82%", delta: "+5%", deltaLabel: "pack #5", tone: "coral", icon: Edit3, trend: "up" },
  { label: "Vào target", value: "12/18", delta: "+2", deltaLabel: "tuần qua", tone: "violet", icon: Flag, trend: "up" },
  { label: "Retention", value: "94%", delta: "18/19", deltaLabel: "còn lại", tone: "pink", icon: Users, trend: "flat" },
];

export function ClassHealthSnapshot({ metrics = DEFAULT_METRICS, loading = false }: ClassHealthSnapshotProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-4 h-28 animate-pulse bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {metrics.map((m) => {
        const styles = TONE_STYLES[m.tone];
        const TrendIcon = TREND_ICONS[m.trend];
        return (
          <Card
            key={m.label}
            className={cn(
              "relative overflow-hidden border-[2px] p-4 transition-all hover:shadow-md hover:-translate-y-0.5",
              styles.bg,
              styles.border
            )}
          >
            {/* Icon top-left */}
            <div
              className={cn(
                "absolute top-3 left-3 h-8 w-8 rounded-lg flex items-center justify-center shadow-sm",
                styles.iconBg,
                styles.iconColor
              )}
            >
              <m.icon className="h-4 w-4" strokeWidth={2.5} />
            </div>

            {/* Value - large number */}
            <div className="mt-10">
              <p className="font-display text-2xl font-extrabold text-lp-ink tabular-nums tracking-tight">
                {m.value}
              </p>
            </div>

            {/* Label */}
            <p className="text-[10px] font-semibold uppercase tracking-wider text-lp-body mt-1">
              {m.label}
            </p>

            {/* Delta pill */}
            <div className="mt-2 flex items-center gap-1">
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold",
                  styles.deltaBg,
                  styles.deltaColor
                )}
              >
                <TrendIcon className={cn("h-3 w-3", TREND_COLORS[m.trend])} />
                {m.delta}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">
                · {m.deltaLabel}
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
