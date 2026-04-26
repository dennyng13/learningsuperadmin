import { Suspense, type ReactNode } from "react";
import { cn } from "@shared/lib/utils";

interface LazyWidgetProps {
  /** Reserved minimum height so layout doesn't jump while loading. */
  minHeight?: number;
  /** Optional label shown faintly inside the skeleton (debug/UX hint). */
  label?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Skeleton placeholder for lazily-loaded dashboard widgets.
 * Reserves vertical space so the section order stays stable while chunks load.
 */
export function WidgetSkeleton({ minHeight = 180, label, className }: { minHeight?: number; label?: string; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-card shadow-[0_4px_20px_rgba(15,23,42,0.04)] p-5 animate-pulse",
        className,
      )}
      style={{ minHeight }}
      aria-busy="true"
      aria-label={label ? `Đang tải ${label}` : "Đang tải widget"}
    >
      <div className="h-3 w-24 bg-muted rounded mb-3" />
      <div className="h-5 w-48 bg-muted rounded mb-5" />
      <div className="space-y-2">
        <div className="h-3 w-full bg-muted/70 rounded" />
        <div className="h-3 w-5/6 bg-muted/70 rounded" />
        <div className="h-3 w-4/6 bg-muted/70 rounded" />
      </div>
    </div>
  );
}

/**
 * Wraps a lazily-loaded child in Suspense + skeleton.
 * Use with React.lazy() so heavy widgets are code-split out of the main bundle.
 */
export default function LazyWidget({ minHeight, label, className, children }: LazyWidgetProps) {
  return (
    <Suspense fallback={<WidgetSkeleton minHeight={minHeight} label={label} className={className} />}>
      {children}
    </Suspense>
  );
}