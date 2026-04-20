import React from "react";
import mascotDizzy from "@/assets/mascot-dizzy.png";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="text-center max-w-sm space-y-4">
            {/* Mascot confused illustration */}
            <img src={mascotDizzy} alt="Max" className="w-28 h-28 mx-auto object-contain animate-bounce-slow" />
            <h1 className="font-display text-xl font-bold text-foreground">
              Đã xảy ra lỗi
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Có gì đó không ổn. Hãy thử tải lại trang nhé!
            </p>
            {this.state.error && (
              <pre className="text-[10px] text-muted-foreground/60 bg-muted rounded-lg p-2 max-h-20 overflow-auto text-left">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
