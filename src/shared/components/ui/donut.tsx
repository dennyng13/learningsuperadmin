import { cn } from "@shared/lib/utils";
import type { HTMLAttributes } from "react";

type Tone = "teal" | "coral" | "yellow" | "violet" | "sky" | "mint";

const toneStroke: Record<Tone, string> = {
  teal:   "stroke-lp-teal",
  coral:  "stroke-lp-coral",
  yellow: "stroke-lp-yellow",
  violet: "stroke-lp-violet",
  sky:    "stroke-lp-sky",
  mint:   "stroke-[var(--lp-mint)]",
};

export interface DonutProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  tone?: Tone;
  size?: number;
  label?: string;
  thickness?: number;
}

export function Donut({
  value,
  max = 100,
  tone = "teal",
  size = 80,
  label,
  thickness = 14,
  className,
  ...props
}: DonutProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const display = label ?? `${Math.round(pct)}%`;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${display}${label ? "" : " complete"}`}
      {...props}
    >
      <svg viewBox="0 0 100 100" className="-rotate-90 w-full h-full">
        {/* track */}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          className="stroke-lp-ink/10"
          strokeWidth={thickness}
          pathLength={100}
        />
        {/* progress */}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          className={toneStroke[tone]}
          strokeWidth={thickness}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${pct} ${100 - pct}`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display font-extrabold text-lp-ink text-sm">
        {display}
      </span>
    </div>
  );
}
