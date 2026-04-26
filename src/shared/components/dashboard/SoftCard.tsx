import { ReactNode } from "react";
import { cn } from "@shared/lib/utils";

interface SoftCardProps {
  /** Eyebrow uppercase label */
  eyebrow?: string;
  /** Card title */
  title?: string;
  /** Right-aligned slot (legend, action, link) */
  action?: ReactNode;
  /** Lucide icon (rendered inside eyebrow) */
  icon?: React.ComponentType<{ className?: string }>;
  /** Optional padding override */
  padding?: "sm" | "md" | "lg";
  className?: string;
  children: ReactNode;
}

const PAD = { sm: "p-4", md: "p-5", lg: "p-6" } as const;

/**
 * Shared "Soft UI" card wrapper used across the admin dashboard.
 * Provides consistent radius, shadow, header and padding.
 */
export default function SoftCard({
  eyebrow, title, action, icon: Icon, padding = "md", className, children,
}: SoftCardProps) {
  const hasHeader = eyebrow || title || action;
  return (
    <div
      className={cn(
        "rounded-2xl bg-card shadow-[0_4px_20px_rgba(15,23,42,0.04)]",
        PAD[padding],
        className,
      )}
    >
      {hasHeader && (
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[11px] uppercase tracking-[0.1em] font-semibold text-muted-foreground flex items-center gap-1.5">
                {Icon && <Icon className="h-3 w-3" />}
                {eyebrow}
              </p>
            )}
            {title && (
              <h3 className="font-display text-base font-extrabold text-foreground mt-0.5 truncate">
                {title}
              </h3>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}