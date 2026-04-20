import { cn } from "@shared/lib/utils";
import { ArrowRight } from "lucide-react";

interface FunnelStage {
  label: string;
  count: number;
}

interface Props {
  stages: FunnelStage[];
  className?: string;
}

export default function ProspectFunnel({ stages, className }: Props) {
  if (stages.length === 0) return null;

  const maxCount = Math.max(...stages.map(s => s.count), 1);

  return (
    <div className={cn("flex items-stretch gap-0 overflow-x-auto", className)}>
      {stages.map((stage, i) => {
        const widthPct = 60 + 40 * ((maxCount - i * (maxCount / stages.length)) / maxCount);
        const prevCount = i > 0 ? stages[i - 1].count : null;
        const conversionPct = prevCount && prevCount > 0 ? Math.round((stage.count / prevCount) * 100) : null;

        return (
          <div key={stage.label} className="flex items-center">
            {i > 0 && (
              <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0 -mx-1 z-10" />
            )}
            <div
              className={cn(
                "rounded-xl border px-4 py-3 text-center transition-colors shrink-0",
                i === 0
                  ? "bg-primary/10 border-primary/20"
                  : i === stages.length - 1
                  ? "bg-primary/40 border-primary/30 text-primary-foreground"
                  : "bg-primary/20 border-primary/20",
              )}
              style={{ minWidth: `${Math.max(widthPct, 80)}px` }}
            >
              <p className="text-2xl font-bold tabular-nums">{stage.count}</p>
              <p className="text-[11px] font-medium mt-0.5 whitespace-nowrap">{stage.label}</p>
              {conversionPct != null && (
                <p className="text-[10px] text-muted-foreground mt-1">{conversionPct}%</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
