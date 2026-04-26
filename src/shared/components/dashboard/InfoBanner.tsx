import { ChevronRight, type LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@shared/lib/utils";

interface InfoBannerProps {
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  /** Optional badge/extra slot on the right (before chevron) */
  trailing?: ReactNode;
  iconTone?: "teal" | "coral" | "muted";
  onClick?: () => void;
  className?: string;
}

const TONE = {
  teal: "bg-primary/12 text-primary",
  coral: "bg-accent/12 text-accent",
  muted: "bg-muted text-muted-foreground",
} as const;

/**
 * Compact horizontal banner (icon + title + desc + chevron).
 * Used for "today's schedule", quick-jump KPI rows, etc.
 */
export default function InfoBanner({
  icon: Icon, title, description, trailing, iconTone = "teal", onClick, className,
}: InfoBannerProps) {
  const Comp: any = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 rounded-2xl bg-card p-4 text-left shadow-[0_4px_20px_rgba(15,23,42,0.04)]",
        onClick && "hover:shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition-all",
        className,
      )}
    >
      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", TONE[iconTone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-display font-bold text-sm flex items-center gap-2 truncate">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
        )}
      </div>
      {trailing}
      {onClick && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
    </Comp>
  );
}