"use client";

import { SkeletonLine } from "@/components/ui/skeleton";

export function DiagnosticsSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6" role="status" aria-live="polite" aria-label="Loading diagnostics">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 animate-pulse-glow" aria-hidden="true">
          <SkeletonLine width="8rem" height="1.5rem" />
        </div>
        <div className="flex gap-2">
          <SkeletonLine width="5rem" height="2rem" className="rounded-lg" />
          <SkeletonLine width="5rem" height="2rem" className="rounded-lg" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 p-4 rounded-lg border border-glass">
            <div className="flex items-center gap-2">
              <SkeletonLine width="3rem" height="1rem" />
              <SkeletonLine width="5rem" height="0.75rem" />
              <SkeletonLine width="4rem" height="1rem" className="rounded" />
            </div>
            <SkeletonLine width="80%" height="0.875rem" />
            <SkeletonLine width="40%" height="0.75rem" />
          </div>
        ))}
      </div>
    </div>
  );
}
