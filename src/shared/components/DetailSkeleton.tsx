import { Skeleton } from "@shared/components/ui/skeleton";

/**
 * Generic loading skeleton for detail pages with a 2-column layout
 * (main content + sidebar). Avoids the previous Loader2 spinner so
 * the page shape feels stable while data is fetching.
 */
export default function DetailSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-32 w-full" />
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
