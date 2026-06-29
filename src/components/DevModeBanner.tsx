"use client";

import { determineSandboxMode } from "@/lib/pi-sdk";

export function DevModeBanner() {
  const isSandbox = determineSandboxMode();
  if (!isSandbox) return null;

  return (
    <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 text-center font-mono text-xs">
      ⚠️ DEV MODE — Not connected to Pi Network. Real KYC and payments disabled.
    </div>
  );
}