"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/app/context/language-context";
import { motion } from "framer-motion";
import { Wallet, Zap, Database, Plug, Sparkles, FileKey, Grid3x3, X, ExternalLink } from "lucide-react";

interface Capability {
  key: string;
  route: string;
  icon: typeof Wallet;
  status: "live" | "pending";
}

const IFRAME_SANDBOX =
  "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox";

export function WorkspaceGrid() {
  const { language } = useLanguage();
  const t = (en: string, ar: string) => (language === "en" ? en : ar);
  const [active, setActive] = useState<Capability | null>(null);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  const capabilities: Capability[] = [
    { key: "earn", route: "https://earn.axiomid.app", icon: Wallet, status: "live" },
    { key: "skills", route: "https://skills.axiomid.app", icon: Zap, status: "live" },
    { key: "memory", route: "https://memory.axiomid.app", icon: Database, status: "pending" },
    { key: "mcp", route: "https://mcp.axiomid.app", icon: Plug, status: "pending" },
    { key: "agdp", route: "https://agdp.axiomid.app", icon: Sparkles, status: "pending" },
    { key: "identity", route: "https://openid.axiomid.app", icon: FileKey, status: "live" },
  ];

  return (
    <section id="workspace" className="w-full max-w-6xl px-4 sm:px-6 mt-16 sm:mt-24 z-10" aria-label={t("Workspace — Capabilities", "مساحة العمل — القدرات")}>
      <div className="flex items-center gap-2 mb-2">
        <Grid3x3 className="w-4 h-4 text-electric-blue" />
        <span className="text-[11px] font-mono text-electric-blue uppercase tracking-[0.25em]">
          {t("workspace — capabilities", "مساحة العمل — القدرات")}
        </span>
      </div>
      <p className="text-sm text-subtle font-sans mb-4">
        {t(
          "Every subdomain is a capability of this OS — a command, not a product. All are served from one hostname-routed deployment.",
          "كل نطاق فرعي هو قدرة من قدرات هذا النظام — أمر وليس منتجًا. كلها تُقدَّم من نشر واحد موجّه حسب المضيف."
        )}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {capabilities.map((cap, i) => {
          const Icon = cap.icon;
          return (
            <motion.div
              key={cap.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            >
              <button
                type="button"
                onClick={() => setActive(cap)}
                className={`w-full text-left flex items-start justify-between rounded-xl bg-glass border border-glass p-4 transition-all hover:bg-glass-hover hover:border-glass-hover ${
                  cap.status === "pending" ? "opacity-60" : ""
                } focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none`}
              >
                <div>
                  <Icon className="w-4 h-4 text-electric-blue mb-2" />
                  <div className="font-mono text-sm font-semibold text-white">{cap.key}</div>
                  <div className="text-[10px] font-mono text-subtle mt-0.5 break-all">{cap.route.replace("https://", "")}</div>
                </div>
                <span
                  className={`shrink-0 flex items-center gap-1 text-[9px] font-mono ${
                    cap.status === "live" ? "text-neon-green" : "text-faint"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      cap.status === "live" ? "bg-neon-green animate-pulse" : "bg-faint"
                    }`}
                  />
                  {cap.status === "live" ? t("LIVE", "مباشر") : t("PENDING", "قيد الانتظار")}
                </span>
              </button>
            </motion.div>
          );
        })}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label={active.key}
          onClick={() => setActive(null)}
        >
          <div
            className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl shadow-[0_0_60px_-15px_rgba(0,240,255,0.2)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <active.icon className="h-4 w-4 shrink-0 text-cyan-400" />
                <span className="font-mono text-xs font-semibold text-white truncate">{active.key}</span>
                <span className="text-[10px] font-mono text-white/40 truncate">{active.route.replace("https://", "")}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={active.route}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                  aria-label={t("Open in new tab", "افتح في تبويب جديد")}
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                  aria-label={t("Close window", "إغلاق النافذة")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <iframe
              src={active.route}
              title={active.key}
              sandbox={IFRAME_SANDBOX}
              className="h-full w-full flex-1 bg-black/30"
            />
          </div>
        </div>
      )}
    </section>
  );
}
