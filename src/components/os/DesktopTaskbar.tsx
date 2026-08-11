"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/app/context/language-context";

export function DesktopTaskbar() {
  const { t, language } = useLanguage();
  const [now, setNow] = useState("");
  const [cpu, setCpu] = useState<string | null>(null);

  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleDateString(language === "ar" ? "ar-SA" : "en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [language]);

  useEffect(() => {
    let alive = true;
    fetch("https://gspace.axiomid.app/api/telemetry", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (alive) setCpu(String(d?.globalWorkspace?.attention ?? 0) + "%");
      })
      .catch(() => {
        if (alive) setCpu("—");
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-3xl border-2 border-cyan-400/30 bg-[#0f0f1a]/95 px-4 py-2 shadow-[0_0_40px_rgba(0,255,255,0.3)] backdrop-blur-2xl"
      role="navigation"
      aria-label={t("aura_os")}
    >
      <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/20 to-cyan-400/10">
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-cyan-400/20 text-cyan-400" aria-hidden="true">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>
        <svg viewBox="0 0 24 24" className="absolute h-4 w-4 text-cyan-400" aria-hidden="true">
          <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
        </svg>
      </div>

      <div className="h-10 w-px bg-white/30" aria-hidden="true" />
      <span className="px-4 text-xs text-slate-400">{t("desktop_no_apps")}</span>
      <div className="h-10 w-px bg-white/30" aria-hidden="true" />

      <div className="flex items-center gap-2">
        <div className="flex h-10 items-center gap-2 rounded-xl bg-cyan-400/10 px-3 transition-colors hover:bg-cyan-400/20">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect width="16" height="16" x="4" y="4" rx="2" />
            <rect width="6" height="6" x="9" y="9" rx="1" />
            <path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2" />
          </svg>
          <span className="text-xs font-medium text-cyan-400">{t("desktop_cpu")} {cpu ?? "…"}</span>
        </div>
      </div>

      <div className="h-10 w-px bg-white/30" aria-hidden="true" />

      <button
        type="button"
        className="flex flex-col items-center justify-center rounded-xl bg-gradient-to-br from-violet-400/10 to-violet-400/5 px-4 py-1 transition-colors hover:from-violet-400/20 hover:to-violet-400/10"
      >
        <span className="text-sm font-bold text-violet-400">{now.split(",")[1]?.trim() ?? ""}</span>
        <span className="text-[10px] text-slate-500">{now.split(",")[0]}</span>
      </button>
    </div>
  );
}
