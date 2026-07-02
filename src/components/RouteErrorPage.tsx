"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { useLanguage } from "@/app/context/language-context";

interface RouteErrorPageProps {
  title: string;
  fallbackMessage: string;
  error: Error & { digest?: string };
  reset: () => void;
}

export function RouteErrorPage({ title, fallbackMessage, error, reset }: RouteErrorPageProps) {
  const { language } = useLanguage();
  const t = (en: string, ar: string) => (language === "en" ? en : ar);

  useEffect(() => {
    console.error(`${title}:`, error);
    Sentry.captureException(error, { extra: { title } });
  }, [title, error]);

  return (
    <div className="min-h-screen bg-grid flex items-center justify-center p-4">
      <div className="bento-card max-w-md w-full p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-surface font-mono mb-2">{title}</h2>
        <p className="text-sm text-subtle mb-6">
          {process.env.NODE_ENV === "development" ? error.message : fallbackMessage}
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="btn-primary text-xs px-4 py-2">
            {t("RETRY", "إعادة المحاولة")}
          </button>
          <Link href="/dashboard" className="btn-ghost text-xs px-4 py-2">
            {t("BACK TO DASHBOARD", "العودة للوحة التحكم")}
          </Link>
        </div>
      </div>
    </div>
  );
}
