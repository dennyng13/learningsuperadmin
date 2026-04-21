import { lazy, Suspense, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Clock3, GraduationCap, Receipt, TrendingUp, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { TabSkeleton } from "@shared/components/ui/tab-skeleton";
import TeacherTabErrorBoundary from "@admin/features/users/components/TeacherTabErrorBoundary";

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
      <div>
        <h1 className="font-display text-xl md:text-2xl font-extrabold flex items-center gap-2">
          <GraduationCap className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          Quản lý giáo viên
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gom hồ sơ, lịch rảnh, hiệu suất và tính lương vào một module giáo viên thống nhất
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="bg-muted/60 p-1 rounded-xl h-auto gap-1 w-max md:w-auto">
            <TabsTrigger value="directory" className="gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold">
              <Users className="h-3.5 w-3.5 md:h-4 md:w-4" />Danh sách
            </TabsTrigger>
            <TabsTrigger value="availability" className="gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold">
              <Clock3 className="h-3.5 w-3.5 md:h-4 md:w-4" />Lịch rảnh
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold">
              <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4" />Hiệu suất
            </TabsTrigger>
            <TabsTrigger value="income" className="gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold">
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