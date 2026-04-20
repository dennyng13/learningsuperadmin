import { HoverCard, HoverCardContent, HoverCardTrigger } from "@shared/components/ui/hover-card";
import { cn } from "@shared/lib/utils";

interface ScoreWithDescriptorProps {
  label: string;
  shortLabel: string;
  score: number | null;
  criteriaKey: string;
  descriptors: Record<string, string>;
  className?: string;
  /** Layout style */
  variant?: "card" | "inline";
}

export default function ScoreWithDescriptor({
  label,
  shortLabel,
  score,
  criteriaKey,
  descriptors,
  className,
  variant = "card",
}: ScoreWithDescriptorProps) {
  const desc = score != null ? descriptors[`${criteriaKey}:${score}`] : null;
  const lines = desc?.split("\n").filter(l => l.trim()) || [];

  const content = variant === "card" ? (
    <div className={cn("bg-muted/50 rounded-xl px-3 py-2 text-center min-w-[60px] cursor-default", className)}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{shortLabel}</p>
      <p className="font-display text-lg font-extrabold">{score != null ? score : "—"}</p>
    </div>
  ) : (
    <span className={cn("cursor-default", className)}>
      {shortLabel}: <strong>{score ?? "—"}</strong>
    </span>
  );

  if (!desc || score == null) return content;

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div className={cn(
          variant === "card"
            ? "bg-muted/50 rounded-xl px-3 py-2 text-center min-w-[60px] cursor-help transition-colors hover:bg-primary/10 hover:ring-1 hover:ring-primary/20"
            : "cursor-help inline-flex hover:text-primary transition-colors",
          className
        )}>
          {variant === "card" ? (
            <>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{shortLabel}</p>
              <p className="font-display text-lg font-extrabold">{score}</p>
            </>
          ) : (
            <span>{shortLabel}: <strong>{score}</strong></span>
          )}
        </div>
      </HoverCardTrigger>
      <HoverCardContent side="top" align="center" className="w-72 p-3 space-y-1.5">
        <p className="text-xs font-bold text-primary">{label} — Band {score}</p>
        {lines.length > 1 ? (
          <ul className="space-y-1">
            {lines.map((line, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-foreground/80 leading-relaxed">
                <span className="text-primary mt-0.5 shrink-0">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-foreground/80 leading-relaxed">{desc}</p>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
