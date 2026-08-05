"use client";

import dynamic from "next/dynamic";

// Skeleton for below-fold sections
function SectionSkeleton() {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-16">
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-white/[0.04] rounded-lg mx-auto" />
        <div className="h-4 w-64 bg-white/[0.03] rounded-lg mx-auto" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-white/[0.02] rounded-xl border border-white/[0.04]" />
          ))}
        </div>
      </div>
    </div>
  );
}

// Lazy-loaded below-fold components (framer-motion ~35KB gzip each)
const InteractiveShowcase = dynamic(
  () => import("@/components/landing/InteractiveShowcase"),
  { loading: () => <SectionSkeleton /> }
);

const InteractiveCommandDemo = dynamic(
  () => import("@/components/landing/InteractiveCommandDemo"),
  { loading: () => <SectionSkeleton /> }
);

export function LazyLandingSections() {
  return (
    <>
      {/* Interactive Showcase Section */}
      <div className="w-full max-w-6xl px-4 sm:px-6 mt-16 sm:mt-24 z-10">
        <InteractiveShowcase />
      </div>

      {/* Interactive Command Demo */}
      <div className="w-full max-w-6xl px-4 sm:px-6 mt-16 sm:mt-24 z-10">
        <InteractiveCommandDemo />
      </div>
    </>
  );
}