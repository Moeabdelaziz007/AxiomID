"use client";

import { useLanguage } from "@/app/context/language-context";

export function StatusBar() {
  const { t, language } = useLanguage();
  const dir = language === "ar" ? "rtl" : "ltr";

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 px-4 py-2 pointer-events-none"
      dir={dir}
      role="banner"
      aria-label={t("aura_os")}
    >
      <div className="mx-auto max-w-5xl flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-cyan-400/20 text-cyan-400 text-[10px] font-mono font-bold">
            ◉
          </span>
          <span className="text-[11px] font-mono text-white/80">{t("aura_os")}</span>
          <span className="flex h-4 px-2 items-center rounded-full bg-emerald-400/20 text-emerald-400 text-[9px] font-mono font-medium">
            {t("live")}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-white/40" aria-label="Protocol">
            PAI v3.0
          </span>
          <span className="text-[10px] font-mono text-white/40" aria-label="Network">
            Pi Network
          </span>
        </div>
      </div>
    </header>
  );
}