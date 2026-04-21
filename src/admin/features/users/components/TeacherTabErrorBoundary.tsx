import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@shared/components/ui/button";

interface Props {
  tabName: string;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export default class TeacherTabErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const payload = {
      route: "/teachers",
      tab: this.props.tabName,
      name: error.name,
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
      url: typeof window !== "undefined" ? window.location.href : "",
      ts: new Date().toISOString(),
    };
    // eslint-disable-next-line no-console
    console.error(`[TeacherTab:${this.props.tabName}] runtime error`, payload);
    this.setState({ errorInfo: info });
  }

  handleRetry = () => {
    // eslint-disable-next-line no-console
    console.info(`[TeacherTab:${this.props.tabName}] retry pressed`);
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Tab "{this.props.tabName}" gặp lỗi khi tải
            </p>
            <p className="text-xs text-muted-foreground">
              Chi tiết đã được log ra console (mở DevTools → Console để xem stack trace).
            </p>
          </div>
        </div>

        {this.state.error && (
          <pre className="max-h-32 overflow-auto rounded-lg bg-background border border-border px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
            {this.state.error.name}: {this.state.error.message}
          </pre>
        )}

        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={this.handleRetry}>
          <RefreshCw className="h-3.5 w-3.5" />
          Thử tải lại tab
        </Button>
      </div>
    );
  }
}