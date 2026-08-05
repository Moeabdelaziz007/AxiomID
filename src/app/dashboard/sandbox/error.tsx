"use client";

import { useEffect } from "react";

interface SandboxErrorProps {
  error: Error & { digest?: string };
  reset?: () => void;
}

/**
 * Error boundary for the /dashboard/sandbox route.
 * Renders a recoverable error state with a Try Again action.
 */
export default function SandboxError({ error, reset }: SandboxErrorProps) {
  useEffect(() => {
    console.error("[sandbox] route error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-grid p-8 flex items-center justify-center">
      <div className="bento-card p-8 max-w-md w-full text-center space-y-4">
        <div className="text-4xl">⚠️</div>
        <h1 className="text-xl font-bold text-surface">Something went wrong</h1>
        <p className="text-sm text-subtle">
          The sandbox hit an unexpected error. Your agents and data are safe —
          try again or return to the dashboard.
        </p>
        {error.digest && (
          <p className="text-[10px] font-mono text-faint break-all">
            digest: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-3 pt-2">
          {reset && (
            <button
              onClick={reset}
              className="btn-primary text-xs px-4 py-2"
              aria-label="Try again"
            >
              TRY AGAIN
            </button>
          )}
          <a href="/dashboard" className="btn-ghost text-xs px-4 py-2">
            BACK TO DASHBOARD
          </a>
        </div>
      </div>
    </div>
  );
}
