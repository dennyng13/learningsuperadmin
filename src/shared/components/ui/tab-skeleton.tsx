import { useState, useEffect, ReactNode } from "react";
import { Skeleton } from "@shared/components/ui/skeleton";

interface TabSkeletonProps {
  children: ReactNode;
  /** Number of skeleton rows to show */
  rows?: number;
  /** Duration in ms before showing real content */
  delay?: number;
}

export function TabSkeleton({ children, rows = 4, delay = 300 }: TabSkeletonProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    const t = setTimeout(() => setReady(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  if (!ready) {
    return (
      <div className="space-y-4 animate-in fade-in-0 duration-150">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-48 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 flex-1 rounded" />
            <Skeleton className="h-5 w-24 rounded" />
            <Skeleton className="h-5 w-20 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
      {children}
    </div>
  );
}
