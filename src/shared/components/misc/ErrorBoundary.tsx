import React from "react";
import mascotDizzy from "@/assets/mascot-dizzy.png";

function getErrorCode(error: Error | null) {
  if (!error) return "APP-UNKNOWN";

  const source = `${error.name}:${error.message}`;
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }

  if (/chunk|import/i.test(source)) return `APP-CHUNK-${hash.toString(16).slice(0, 6).toUpperCase()}`;
  if (/auth|session|jwt|token/i.test(source)) return `APP-AUTH-${hash.toString(16).slice(0, 6).toUpperCase()}`;
  return `APP-RUNTIME-${hash.toString(16).slice(0, 6).toUpperCase()}`;
}

function getFriendlyMessage(error: Error | null) {
  if (!error) {
    return "Ứng dụng vừa gặp sự cố tạm thời. Bạn có thể thử tải lại để tiếp tục.";
  }

  const source = `${error.name} ${error.message}`.toLowerCase();

  if (source.includes("loading chunk") || source.includes("failed to fetch dynamically imported module")) {
    return "Một phần của ứng dụng tải chưa trọn vẹn. Thử tải lại trang để đồng bộ phiên bản mới nhất.";
  }

  if (source.includes("auth") || source.includes("session") || source.includes("jwt") || source.includes("token")) {
    return "Phiên đăng nhập có thể đã hết hạn hoặc bị gián đoạn. Hãy thử tải lại để kết nối lại.";
  }

  return "Có lỗi không mong muốn xảy ra trong lúc tải giao diện. Hãy thử lại, nếu vẫn lặp lại thì dùng mã lỗi bên dưới để báo team xử lý nhanh hơn.";
}

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
      const errorCode = getErrorCode(this.state.error);
      const friendlyMessage = getFriendlyMessage(this.state.error);

      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-6 py-10">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-lg space-y-5">
            <img src={mascotDizzy} alt="Max" className="w-24 h-24 mx-auto object-contain animate-bounce-slow" />
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Runtime fallback
              </p>
              <h1 className="font-display text-2xl font-bold text-foreground">
                Ứng dụng tạm thời gặp sự cố
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {friendlyMessage}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-left space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Mã lỗi
              </p>
              <p className="font-mono text-sm font-semibold text-foreground break-all">
                {errorCode}
              </p>
            </div>

            {this.state.error && (
              <pre className="max-h-24 overflow-auto rounded-xl bg-muted px-3 py-2 text-left text-[10px] text-muted-foreground/70">
                {this.state.error.message}
              </pre>
            )}

            <div className="flex justify-center">
              <button
                onClick={this.handleReload}
                className="inline-flex min-w-40 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Thử lại
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
