import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@shared/components/ui/button";

interface WidgetRetryStateProps {
  title: string;
  message?: string;
  onRetry: () => void;
  compact?: boolean;
}

export default function WidgetRetryState({
  title,
  message = "Dữ liệu tạm thời chưa tải được.",
  onRetry,
  compact = false,
}: WidgetRetryStateProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="min-w-0 space-y-2">
          <div>
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{message}</p>
          </div>
          <Button type="button" variant="outline" size={compact ? "sm" : "default"} onClick={onRetry} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Thử lại
          </Button>
        </div>
      </div>
    </div>
  );
}