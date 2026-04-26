import { RefreshCw } from "lucide-react";
import { cn } from "@shared/lib/utils";

interface WidgetRefreshButtonProps {
  onClick: () => void;
  /** True when a refetch is in flight — icon spins, button is disabled. */
  refreshing?: boolean;
  className?: string;
  title?: string;
}

/**
 * Tiny ghost icon button used in widget headers to trigger a re-fetch
 * without reloading the whole dashboard. Stays out of the way (icon-only,
 * 14px) but provides clear visual feedback while loading.
 */
export default function WidgetRefreshButton({
  onClick,
  refreshing = false,
  className,
  title = "Tải lại",
}: WidgetRefreshButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={refreshing}
      title={title}
      aria-label={title}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-full",
        "text-muted-foreground hover:text-foreground hover:bg-muted/60",
        "transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        className,
      )}
    >
      <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
    </button>
  );
}