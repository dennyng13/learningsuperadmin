import { Check } from "lucide-react";
import { cn } from "@shared/lib/utils";

export interface TimelineStep {
  key: string;
  label: string;
  /** "done" — already passed; "active" — current step; "pending" — future; "skipped" — branch not taken */
  state: "done" | "active" | "pending" | "skipped";
  hint?: string;
}

interface Props {
  steps: TimelineStep[];
  /** Compact horizontal mode for sidebar use. */
  vertical?: boolean;
  className?: string;
}

/**
 * Generic status timeline used by contracts, addendums, and timesheet
 * detail pages. Designed to be lightweight and embeddable in sticky
 * sidebars or top-of-page banners.
 */
export default function StatusTimeline({ steps, vertical = false, className }: Props) {
  if (vertical) {
    return (
      <ol className={cn("space-y-2", className)}>
        {steps.map((s, i) => (
          <li key={s.key} className="flex items-start gap-2">
            <Dot state={s.state} index={i + 1} />
            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  "text-xs font-medium",
                  s.state === "active" && "text-primary",
                  s.state === "done" && "text-foreground",
                  s.state === "pending" && "text-muted-foreground",
                  s.state === "skipped" && "text-muted-foreground line-through",
                )}
              >
                {s.label}
              </div>
              {s.hint && <div className="text-[11px] text-muted-foreground">{s.hint}</div>}
            </div>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ol className={cn("flex items-center gap-1 overflow-x-auto", className)}>
      {steps.map((s, i) => (
        <li key={s.key} className="flex items-center gap-1 min-w-fit">
          <Dot state={s.state} index={i + 1} />
          <span
            className={cn(
              "text-[11px] whitespace-nowrap",
              s.state === "active" && "text-primary font-semibold",
              s.state === "done" && "text-foreground",
              s.state === "pending" && "text-muted-foreground",
              s.state === "skipped" && "text-muted-foreground line-through",
            )}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && <span className="w-3 h-px bg-border" aria-hidden />}
        </li>
      ))}
    </ol>
  );
}

function Dot({ state, index }: { state: TimelineStep["state"]; index: number }) {
  if (state === "done") {
    return (
      <span className="shrink-0 inline-flex h-4 w-4 rounded-full bg-emerald-500 text-white items-center justify-center">
        <Check className="h-2.5 w-2.5" />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="shrink-0 inline-flex h-4 w-4 rounded-full bg-primary text-primary-foreground items-center justify-center text-[9px] font-bold ring-2 ring-primary/20">
        {index}
      </span>
    );
  }
  if (state === "skipped") {
    return (
      <span className="shrink-0 inline-flex h-4 w-4 rounded-full bg-muted text-muted-foreground items-center justify-center text-[9px]">
        ×
      </span>
    );
  }
  return (
    <span className="shrink-0 inline-flex h-4 w-4 rounded-full bg-muted text-muted-foreground items-center justify-center text-[9px]">
      {index}
    </span>
  );
}
