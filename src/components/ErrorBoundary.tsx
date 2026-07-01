"use client";

import { useLanguage } from "@/app/context/language-context";
import { ErrorBoundary as ReactErrorBoundary, type FallbackProps } from "react-error-boundary";
import { AlertTriangle, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const { language } = useLanguage();
  const t = (en: string, ar: string) => (language === "en" ? en : ar);
  const errorMessage = error instanceof Error ? error.message : String(error);

  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="bento-card max-w-md w-full p-8 text-center" style={{ border: "1px solid var(--card-border)" }}>
        <div role="alert">
          <AlertTriangle className="w-10 h-10 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>
            {t("Something went wrong", "حدث خطأ ما")}
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            {errorMessage || t("An unexpected error occurred.", "حدث خطأ غير متوقع.")}
          </p>
          <button
            onClick={resetErrorBoundary}
            className="btn-primary text-xs font-mono px-6 py-2.5 inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {t("Reload Page", "إعادة تحميل الصفحة")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ErrorBoundary({ children, fallback }: Props) {
  if (fallback) {
    return (
      <ReactErrorBoundary fallback={fallback} onReset={() => window.location.reload()}>
        {children}
      </ReactErrorBoundary>
    );
  }
  return (
    <ReactErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
      {children}
    </ReactErrorBoundary>
  );
}
