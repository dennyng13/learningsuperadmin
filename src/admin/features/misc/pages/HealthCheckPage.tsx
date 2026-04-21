import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, AlertCircle, Copy } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { toast } from "sonner";

interface HealthState {
  reactHydrated: boolean;
  routerOk: boolean;
  domReady: boolean;
  online: boolean;
}

export default function HealthCheckPage() {
  const [state, setState] = useState<HealthState>({
    reactHydrated: false,
    routerOk: false,
    domReady: false,
    online: navigator.onLine,
  });
  const [mountedAt] = useState(() => new Date().toISOString());

  useEffect(() => {
    setState({
      reactHydrated: true,
      routerOk: typeof window !== "undefined" && window.location.pathname.includes("health-check"),
      domReady: document.readyState === "complete" || document.readyState === "interactive",
      online: navigator.onLine,
    });
  }, []);

  const buildHash = typeof __BUILD_HASH__ !== "undefined" ? __BUILD_HASH__ : "unknown";
  const buildTime = typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : "unknown";
  const buildMode = typeof __BUILD_MODE__ !== "undefined" ? __BUILD_MODE__ : "unknown";

  const allOk = state.reactHydrated && state.routerOk && state.domReady && state.online;

  const report = JSON.stringify(
    {
      status: allOk ? "ok" : "degraded",
      build: { hash: buildHash, time: buildTime, mode: buildMode },
      runtime: {
        ...state,
        userAgent: navigator.userAgent,
        url: window.location.href,
        mountedAt,
      },
    },
    null,
    2,
  );

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(report);
      toast.success("Đã sao chép báo cáo health-check");
    } catch {
      toast.error("Không sao chép được, hãy chọn và copy thủ công");
    }
  };

  return (
    <div className="min-h-screen bg-background px-6 py-12 flex items-start justify-center">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              allOk ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
            }`}
          >
            {allOk ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Health check
            </p>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {allOk ? "Ứng dụng đang chạy bình thường" : "Phát hiện vấn đề"}
            </h1>
          </div>
        </div>

        <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Build info</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="space-y-1">
              <dt className="text-xs text-muted-foreground">Hash</dt>
              <dd className="font-mono text-xs font-semibold text-foreground break-all">{buildHash}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs text-muted-foreground">Build time</dt>
              <dd className="font-mono text-xs text-foreground break-all">{buildTime}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs text-muted-foreground">Mode</dt>
              <dd className="font-mono text-xs text-foreground">{buildMode}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Runtime checks</h2>
          <ul className="space-y-2 text-sm">
            <CheckRow label="React root hydrated" ok={state.reactHydrated} />
            <CheckRow label="React Router active" ok={state.routerOk} />
            <CheckRow label="DOM ready" ok={state.domReady} />
            <CheckRow label="Network online" ok={state.online} />
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-muted/30 p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">Diagnostic report</h2>
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={copyReport}>
              <Copy className="h-3.5 w-3.5" />
              Sao chép
            </Button>
          </div>
          <pre className="overflow-auto rounded-xl bg-background border border-border p-3 text-[11px] leading-relaxed text-foreground/80 max-h-72">
{report}
          </pre>
        </section>

        <div className="flex justify-center">
          <Button asChild variant="ghost">
            <Link to="/">← Quay lại trang chủ</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function CheckRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
      <span className="text-sm text-foreground">{label}</span>
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
          ok ? "text-emerald-600" : "text-destructive"
        }`}
      >
        {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
        {ok ? "OK" : "FAIL"}
      </span>
    </li>
  );
}