"use client";

import { useWallet } from "@/app/context/wallet-context";

export function ErrorBanner() {
  const { error } = useWallet();

  if (!error) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center px-4 py-3">
      <div className="flex items-center gap-3 max-w-lg w-full px-4 py-3 rounded-xl border bg-[#1a0a0a]/90 backdrop-blur-md"
        style={{
          borderColor: "rgba(239, 68, 68, 0.25)",
        }}
      >
        <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span className="text-sm font-mono text-red-300 flex-1">{error}</span>
      </div>
    </div>
  );
}
