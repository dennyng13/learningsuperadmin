import { lazy, Suspense, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Clock3, GraduationCap, Receipt, Sparkles, TrendingUp, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { TabSkeleton } from "@shared/components/ui/tab-skeleton";
import TeacherTabErrorBoundary from "@admin/features/users/components/TeacherTabErrorBoundary";
import { cn } from "@shared/lib/utils";

function logImportError(name: string, err: unknown): never {
  // eslint-disable-next-line no-console
  console.error(`[TeachersRoute] failed to load chunk "${name}"`, {
    name,
    error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
    url: typeof window !== "undefined" ? window.location.href : "",
    ts: new Date().toISOString(),
  });
  throw err;
}

const TeachersTab = lazy(() =>
  import("@admin/features/users/components/TeachersTab").catch((e) => logImportError("TeachersTab", e)),
);
const TeacherIncomeTab = lazy(() =>
  import("@admin/features/users/components/TeacherIncomeTab").catch((e) => logImportError("TeacherIncomeTab", e)),
);
const AvailabilityDraftsTab = lazy(async () => {
  try {
    const mod = await import("@admin/features/schedule/pages/AdminSchedulePage");
    return { default: mod.AvailabilityDraftsTab };
  } catch (e) {
    logImportError("AvailabilityDraftsTab", e);
    throw e;
  }
});
const TeacherPerformanceContent = lazy(async () => {
  try {
    const mod = await import("@admin/features/performance/pages/TeacherPerformancePage");
    return { default: mod.TeacherPerformanceContent };
  } catch (e) {
    logImportError("TeacherPerformanceContent", e);
    throw e;
  }
});

export default function TeacherManagementPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const mountedAt = useRef<number>(Date.now());

  useEffect(() => {
    const mountTime = mountedAt.current;
    // eslint-disable-next-line no-console
    console.info("[TeachersRoute] mounted", {
      pathname: location.pathname,
      ts: new Date(mountTime).toISOString(),
    });

    const onError = (ev: ErrorEvent) => {
      // eslint-disable-next-line no-console
      console.error("[TeachersRoute] window.error", {
        message: ev.message,
        filename: ev.filename,
        lineno: ev.lineno,
        colno: ev.colno,
        error: ev.error ? { name: ev.error.name, message: ev.error.message, stack: ev.error.stack } : null,
      });
    };
    const onRejection = (ev: PromiseRejectionEvent) => {
      // eslint-disable-next-line no-console
      console.error("[TeachersRoute] unhandledrejection", {
        reason: ev.reason instanceof Error
          ? { name: ev.reason.name, message: ev.reason.message, stack: ev.reason.stack }
          : ev.reason,
      });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    // Detect "blank tab" — if no DOM children appear under the page after 5s, log it
    const blankCheck = window.setTimeout(() => {
      const root = document.querySelector('[data-teachers-page-root="true"]');
      const childCount = root?.querySelectorAll(":scope > *").length ?? 0;
      if (childCount < 2) {
        // eslint-disable-next-line no-console
        console.warn("[TeachersRoute] page appears blank after 5s", {
          childCount,
          pathname: window.location.pathname,
        });
      }
    }, 5000);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      window.clearTimeout(blankCheck);
      // eslint-disable-next-line no-console
      console.info("[TeachersRoute] unmounted", {
        durationMs: Date.now() - mountTime,
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeTab = useMemo(() => {
    if (location.pathname.startsWith("/teachers/availability")) return "availability";
    if (location.pathname.startsWith("/teachers/performance")) return "performance";
    if (location.pathname.startsWith("/teachers/income")) return "income";
    return "directory";
  }, [location.pathname]);

  const handleTabChange = (value: string) => {
    const routeMap: Record<string, string> = {
      directory: "/teachers",
      availability: "/teachers/availability",
      performance: "/teachers/performance",
      income: "/teachers/income",
    };
    navigate(routeMap[value] || "/teachers");
  };

  const renderTabContent = (content: React.ReactNode) => (
    <Suspense fallback={<div className="min-h-[240px] animate-pulse rounded-xl border border-border/40 bg-muted/20" />}>
      {content}
    </Suspense>
  );

  return (
    <div data-teachers-page-root="true" className="p-4 md:p-6 max-w-6xl mx-auto space-y-4 md:space-y-6">
      {/* ─── Hero header ─── */}
      <header className="relative overflow-hidden rounded-2xl border bg-card">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-violet-500/5 to-transparent pointer-events-none" aria-hidden />
        <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-primary/15 blur-3xl pointer-events-none" aria-hidden />
        <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" aria-hidden />
        <div className="relative p-4 md:p-6 flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-violet-500 text-primary-foreground flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary/80 mb-0.5 inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Nhân sự giảng dạy
              </p>
              <h1 className="font-display text-xl md:text-2xl font-extrabold leading-tight">
                Quản lý giáo viên
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-1 max-w-2xl">
                Một module duy nhất gom hồ sơ, lịch rảnh, hiệu suất và tính lương — đồng bộ với{" "}
                <strong>Quản lý khoá học</strong> để cấp đúng level/khoá cho từng giáo viên.
              </p>
            </div>
          </div>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="bg-muted/50 p-1.5 rounded-2xl h-auto gap-1 w-max md:w-auto border border-border/60 shadow-sm">
            <TabsTrigger
              value="directory"
              className="gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-blue-500 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 data-[state=active]:scale-[1.02]"
            >
              <Users className="h-3.5 w-3.5 md:h-4 md:w-4" />Danh sách
            </TabsTrigger>
            <TabsTrigger
              value="availability"
              className="gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all data-[state=active]:bg-gradient-to-br data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/30 data-[state=active]:scale-[1.02]"
            >
              <Clock3 className="h-3.5 w-3.5 md:h-4 md:w-4" />Lịch rảnh
            </TabsTrigger>
            <TabsTrigger
              value="performance"
              className="gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all data-[state=active]:bg-gradient-to-br data-[state=active]:from-violet-500 data-[state=active]:to-fuchsia-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-violet-500/30 data-[state=active]:scale-[1.02]"
            >
              <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4" />Hiệu suất
            </TabsTrigger>
            <TabsTrigger
              value="income"
              className="gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all data-[state=active]:bg-gradient-to-br data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/30 data-[state=active]:scale-[1.02]"
            >
              <Receipt className="h-3.5 w-3.5 md:h-4 md:w-4" />Tính lương
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="directory" className="mt-0">
          <TeacherTabErrorBoundary tabName="directory">{renderTabContent(<TeachersTab />)}</TeacherTabErrorBoundary>
        </TabsContent>
        <TabsContent value="availability" className="mt-0">
          <TeacherTabErrorBoundary tabName="availability">{renderTabContent(<AvailabilityDraftsTab />)}</TeacherTabErrorBoundary>
        </TabsContent>
        <TabsContent value="performance" className="mt-0">
          <TeacherTabErrorBoundary tabName="performance">{renderTabContent(<TeacherPerformanceContent />)}</TeacherTabErrorBoundary>
        </TabsContent>
        <TabsContent value="income" className="mt-0">
          <TeacherTabErrorBoundary tabName="income">{renderTabContent(<TeacherIncomeTab />)}</TeacherTabErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}