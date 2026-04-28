import { lazy, Suspense, useEffect, useMemo, useRef, forwardRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock3, GraduationCap, Receipt, Sparkles, TrendingUp, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { Button } from "@shared/components/ui/button";
import { TabSkeleton } from "@shared/components/ui/tab-skeleton";
import TeacherTabErrorBoundary from "@admin/features/users/components/TeacherTabErrorBoundary";
import { PageHeader } from "@shared/components/layouts/PageHeader";
import { cn } from "@shared/lib/utils";
import { useBrandShapes } from "@shared/hooks/useBrandShapes";
import type { ShapePalette } from "@admin/features/brand-assets/types";

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

  const activeTab = useMemo<TabKey | null>(() => {
    if (location.pathname.startsWith("/teachers/availability")) return "availability";
    if (location.pathname.startsWith("/teachers/performance")) return "performance";
    if (location.pathname.startsWith("/teachers/income")) return "income";
    if (location.pathname.startsWith("/teachers/directory")) return "directory";
    // /teachers (root) → hub menu
    return null;
  }, [location.pathname]);

  const handleTabChange = (value: string) => {
    const routeMap: Record<string, string> = {
      directory: "/teachers/directory",
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

  // ─── Hub menu (no tab selected) ─────────────────────────────────────────
  if (activeTab === null) {
    return (
      <div data-teachers-page-root="true" className="p-4 md:p-6 max-w-6xl mx-auto animate-page-in">
        <PageHeader
          icon={GraduationCap}
          title="Quản lý giáo viên"
          subtitle="Một module duy nhất gom hồ sơ, lịch rảnh, hiệu suất và tính lương — đồng bộ với Quản lý khoá học."
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2 mt-2">
          {(() => {
            const used: string[] = [];
            return TEACHER_HUB_SECTIONS.map((s) => (
              <HubCard
                key={s.id}
                section={s}
                excludeUrls={used}
                onPicked={(u) => { if (u) used.push(u); }}
                onNavigate={() => handleTabChange(s.id)}
              />
            ));
          })()}
        </div>
      </div>
    );
  }

  return (
    <div data-teachers-page-root="true" className="p-4 md:p-6 max-w-6xl mx-auto space-y-4 md:space-y-6">
      {/* Back to hub */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2" onClick={() => navigate("/teachers")}>
          <ArrowLeft className="h-4 w-4" /> Menu giáo viên
        </Button>
        <div className="text-right">
          <h1 className="font-display text-lg md:text-xl font-extrabold leading-tight inline-flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            {TAB_LABEL[activeTab]}
          </h1>
        </div>
      </div>

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

/* ═══════════════════════════════════════════
   HUB MENU — card grid với brand shape giống Quản lý học liệu
   ═══════════════════════════════════════════ */

type TabKey = "directory" | "availability" | "performance" | "income";

const TAB_LABEL: Record<TabKey, string> = {
  directory: "Danh sách giáo viên",
  availability: "Lịch rảnh",
  performance: "Hiệu suất",
  income: "Tính lương",
};

interface HubSection {
  id: TabKey;
  title: string;
  blurb: string;
  icon: LucideIcon;
  palette: ShapePalette;
  preferredShape?: string;
  preferredShapeFallbacks?: string[];
}

const TEACHER_HUB_SECTIONS: HubSection[] = [
  {
    id: "directory",
    title: "Danh sách giáo viên",
    blurb: "Hồ sơ, liên hệ và phân quyền chương trình/cấp độ giảng dạy.",
    icon: Users,
    palette: "teal",
    preferredShape: "blob",
    preferredShapeFallbacks: ["pebble", "oval", "circle", "bean"],
  },
  {
    id: "availability",
    title: "Lịch rảnh",
    blurb: "Khung giờ giáo viên có thể nhận lớp và bản nháp đăng ký.",
    icon: Clock3,
    palette: "indigo",
    preferredShape: "wave",
    preferredShapeFallbacks: ["curve", "ribbon", "arc", "cloud", "drop"],
  },
  {
    id: "performance",
    title: "Hiệu suất",
    blurb: "KPI giảng dạy, tỉ lệ đúng giờ và scorecard từng giáo viên.",
    icon: TrendingUp,
    palette: "coral",
    preferredShape: "star",
    preferredShapeFallbacks: ["burst", "spark", "sun", "petal"],
  },
  {
    id: "income",
    title: "Tính lương",
    blurb: "Bảng công, phụ cấp và payslip xuất cuối kỳ cho giáo viên.",
    icon: Receipt,
    palette: "amber",
    preferredShape: "leaf",
    preferredShapeFallbacks: ["petal", "drop", "moon", "blob"],
  },
];

const HubCard = forwardRef<
  HTMLButtonElement,
  {
    section: HubSection;
    excludeUrls?: string[];
    onPicked?: (url: string | null) => void;
    onNavigate: () => void;
  }
>(function HubCard({ section, excludeUrls = [], onPicked, onNavigate }, ref) {
  const Icon = section.icon;
  const { urls, isLoading } = useBrandShapes(section.palette);

  const ICON_TONE: Record<ShapePalette, string> = {
    teal: "text-primary",
    amber: "text-amber-600",
    indigo: "text-indigo-600",
    coral: "text-rose-600",
    slate: "text-slate-600",
  };

  const shapeUrl = pickStableShape(
    urls,
    section.id,
    section.preferredShape,
    section.preferredShapeFallbacks,
    excludeUrls,
  );
  onPicked?.(shapeUrl);

  if (typeof window !== "undefined" && !isLoading && !shapeUrl) {
    // eslint-disable-next-line no-console
    console.warn(
      `[TeachersHub] Không có brand shape nào cho palette "${section.palette}" (card "${section.id}").`,
    );
  }

  return (
    <button
      ref={ref}
      onClick={onNavigate}
      className={cn(
        "group relative flex flex-col h-32 sm:h-36 md:h-40 overflow-hidden rounded-2xl text-left bg-card text-card-foreground",
        "border border-border/60 shadow-[0_8px_24px_-12px_hsl(var(--foreground)/0.18),0_2px_6px_-2px_hsl(var(--foreground)/0.08)]",
        "transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-[0_20px_40px_-16px_hsl(var(--primary)/0.35),0_8px_16px_-8px_hsl(var(--foreground)/0.18)] hover:border-primary/40",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
      )}
    >
      <BrandShapeFigure url={shapeUrl} palette={section.palette} />

      <div
        className={cn(
          "absolute z-20 flex items-center justify-center rounded-xl",
          "top-2.5 right-2.5 h-8 w-8",
          "sm:top-3 sm:right-3 sm:h-9 sm:w-9",
          "md:top-3.5 md:right-3.5 md:h-10 md:w-10",
          "bg-background/85 backdrop-blur-sm border border-border/60 shadow-sm",
        )}
      >
        <Icon
          className={cn(
            "text-current",
            "h-[1.05rem] w-[1.05rem] sm:h-5 sm:w-5 md:h-[1.375rem] md:w-[1.375rem]",
            ICON_TONE[section.palette],
          )}
          strokeWidth={1.85}
        />
      </div>

      <div className="relative z-10 p-4 sm:p-5 pr-12 sm:pr-14 md:pr-16">
        <h3 className="font-display text-base sm:text-lg font-extrabold tracking-tight leading-tight text-foreground">
          {section.title}
        </h3>
        <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5 sm:mt-1 leading-snug line-clamp-2">
          {section.blurb}
        </p>
      </div>

      <div className="flex-1" />

      <div className="relative z-10 flex items-center gap-2 p-4 sm:p-5 pr-[48%] sm:pr-[50%] md:pr-[52%]">
        <ArrowRight
          className="h-5 w-5 shrink-0 text-foreground/80 transition-transform duration-300 group-hover:translate-x-1"
          strokeWidth={1.75}
        />
      </div>
    </button>
  );
});

const SOFT_SHAPE_KEYWORDS = ["blob", "wave", "curve", "drop", "circle", "oval", "leaf", "petal", "cloud", "moon", "pebble", "bean"];
const HARSH_SHAPE_KEYWORDS = ["stair", "chevron", "arrow", "zigzag", "grid", "cross", "plus", "triangle", "square", "rect"];

function pickStableShape(
  urls: string[],
  seed: string,
  preferred?: string,
  fallbacks?: string[],
  excludeUrls: string[] = [],
): string | null {
  if (urls.length === 0) return null;
  const available = urls.filter((u) => !excludeUrls.includes(u));
  const baseUrls = available.length > 0 ? available : urls;
  const keywords = [preferred, ...(fallbacks ?? [])].filter(Boolean) as string[];
  for (const kw of keywords) {
    const match = baseUrls.find((u) => u.toLowerCase().includes(kw.toLowerCase()));
    if (match) return match;
  }
  const soft = baseUrls.filter((u) => SOFT_SHAPE_KEYWORDS.some((k) => u.toLowerCase().includes(k)));
  const safe = (soft.length > 0 ? soft : baseUrls).filter(
    (u) => !HARSH_SHAPE_KEYWORDS.some((k) => u.toLowerCase().includes(k)),
  );
  const pool = safe.length > 0 ? safe : baseUrls;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return pool[h % pool.length];
}

function BrandShapeFigure({ url, palette }: { url: string | null; palette: ShapePalette }) {
  const FALLBACK_TONE: Record<ShapePalette, string> = {
    teal: "from-primary/40 to-primary/10",
    amber: "from-amber-500/40 to-amber-500/10",
    indigo: "from-indigo-500/40 to-indigo-500/10",
    coral: "from-rose-500/40 to-rose-500/10",
    slate: "from-slate-500/40 to-slate-500/10",
  };
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none select-none absolute z-0 overflow-hidden",
        "-bottom-4 -right-4 sm:-bottom-5 sm:-right-5 md:-bottom-6 md:-right-6",
        "h-[68%] w-[62%] sm:h-[70%] sm:w-[66%] md:h-[72%] md:w-[70%]",
        "opacity-95 transition-transform duration-500 ease-out group-hover:scale-[1.06]",
        "origin-bottom-right",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-tl-[999px] bg-gradient-to-tl",
          "shadow-[inset_0_1px_0_hsl(var(--background)/0.45)]",
          FALLBACK_TONE[palette],
        )}
      />
      {url && (
        <img
          src={url}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          draggable={false}
          className={cn(
            "pointer-events-none select-none absolute inset-0 h-full w-full",
            "object-contain object-right-bottom",
            "opacity-100 saturate-125",
            "drop-shadow-[0_10px_18px_hsl(var(--foreground)/0.16)]",
          )}
        />
      )}
    </div>
  );
}