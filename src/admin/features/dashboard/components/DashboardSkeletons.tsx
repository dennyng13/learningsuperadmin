import { Skeleton } from "@shared/components/ui/skeleton";

/* ─────────────────────────────────────────────────────────────────
 * Skeletons cho từng vùng của Admin Dashboard.
 * Mục tiêu: giữ đúng "shape" của UI thật (kích thước, grid, spacing)
 * để khi data về không bị nhấp nháy / layout shift.
 * ───────────────────────────────────────────────────────────────── */

/** Hero: 4 KPI cards + Calendar (2col) + Performance chart (3col) + Recent list. */
export function DashboardHeroSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl bg-card p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)] min-h-[148px] flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-4 w-12 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        ))}
      </div>

      {/* Calendar + Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-card p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-3 rounded-2xl bg-card p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)] space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-44" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="flex items-end gap-6 h-[220px] pt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex-1 flex items-end gap-1.5">
                <Skeleton
                  className="flex-1 rounded-t-lg"
                  style={{ height: `${40 + (i * 13) % 50}%` }}
                />
                <Skeleton
                  className="flex-1 rounded-t-lg"
                  style={{ height: `${30 + (i * 17) % 60}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Lịch hôm nay: 2 cards (today schedule + exercises summary). */
export function TodayScheduleSkeleton() {
  return (
    <section className="space-y-3">
      <Skeleton className="h-3 w-32" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-fr">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl bg-card p-4 shadow-[0_4px_20px_rgba(15,23,42,0.04)] flex flex-col"
          >
            <div className="flex items-start gap-3 flex-1">
              <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-52" />
                <div className="flex gap-1.5 pt-1">
                  <Skeleton className="h-4 w-14 rounded-full" />
                  <Skeleton className="h-4 w-20 rounded-full" />
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border/50 flex justify-end">
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Generic chart-style block skeleton (header + chart area). */
export function ChartBlockSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="w-full rounded-md" style={{ height }} />
    </div>
  );
}

/** Skeleton cho khu vực Analytics chính (trend chart + filter bar). */
export function AnalyticsSectionSkeleton() {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Skeleton className="h-3 w-44" />
        <Skeleton className="h-9 w-64 rounded-full" />
      </div>
      <ChartBlockSkeleton height={160} />
      <ChartBlockSkeleton height={260} />
    </section>
  );
}