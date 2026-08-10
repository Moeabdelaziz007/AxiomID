"use client";

import { useEffect, useState } from "react";
import { Wallet, Zap, Database, FileKey, LayoutGrid, ExternalLink, Sparkles } from "lucide-react";
import { useLanguage } from "@/app/context/language-context";

const LAUNCHERS = [
  { label: "Earn", href: "https://earn.axiomid.app", icon: Wallet },
  { label: "Skills", href: "https://skills.axiomid.app", icon: Zap },
  { label: "Memory", href: "https://memory.axiomid.app", icon: Database },
  { label: "Identity", href: "https://openid.axiomid.app", icon: FileKey },
  { label: "Control Center", href: "/dashboard", icon: LayoutGrid },
  { label: "GitHub", href: "https://github.com/pai-list", icon: ExternalLink },
];

export function AuraDock() {
  const { t, language } = useLanguage();
  const [now, setNow] = useState("");

  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString(language === "ar" ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [language]);

  return (
    <div
      className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_-10px_rgba(0,240,255,0.15)] max-w-[calc(100vw-1rem)] overflow-x-auto md:overflow-x-visible scroll-smooth touch-pan-x"
      role="navigation"
      aria-label={t("aura_os")}
    >
      {LAUNCHERS.map(({ label, href, icon: Icon }, i) => (
        <a
          key={label}
          href={href}
          target={href.startsWith("http") ? "_blank" : undefined}
          rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
          className="group relative flex flex-col items-center gap-1 p-1.5 md:p-2 rounded-xl transition-all hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black flex-shrink-0"
          style={{ transitionDelay: `${i * 30}ms` }}
        >
          <span className="relative flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
            <Icon className="h-4 w-4 md:h-5 md:w-5 text-cyan-400" />
            {href.startsWith("http") && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3 md:h-4 md:w-4 items-center justify-center rounded-full bg-white/10 text-[6px] md:text-[8px] text-white/60" aria-hidden="true">
                ↗
              </span>
            )}
          </span>
          <span className="text-[9px] md:text-[10px] font-mono text-white/70 whitespace-nowrap">{t(label.toLowerCase().replace(" ", "_"))}</span>
        </a>
      ))}
      <div className="ml-1 md:ml-2 flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg bg-white/5 text-[10px] md:text-[11px] font-mono text-white/50 flex-shrink-0" aria-label="System time">
        {now}
      </div>
    </div>
  );
}