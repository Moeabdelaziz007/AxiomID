"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/app/context/language-context";
import { logger } from "@/lib/logger";

/**
 * Displays an error page for passport loading failures with localized text and recovery options.
 */
export default function PassportError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLanguage();

  useEffect(() => {
    logger.error("[PASSPORT-ERROR]", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-grid flex flex-col items-center">
      <div className="scanline" />
      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl w-full">
        <div className="text-center max-w-md mx-auto">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6 border border-red-500/20">
            <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L14.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-surface mb-4">{t('something_went_wrong')}</h2>
          <p className="text-subtle mb-8">{error.message || t('passport_load_error')}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={reset} className="btn-primary text-xs">
              {t('try_again')}
            </button>
            <Link href="/" className="btn-secondary text-xs">
              {t('create_your_passport')}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
