"use client";

import { useLanguage } from "@/app/context/language-context";

/**
 * Displays an animated claim flow demo showing wallet connection and passport generation.
 * 
 * Animations pause when hovering over the component.
 */
export default function HeroDemo() {
  const { language } = useLanguage();
  const t = (en: string, ar: string) => (language === "en" ? en : ar);

  return (
    <div className="w-full max-w-sm mx-auto group" aria-label={t("Claim flow demo", "عرض تدفق المطالبة")}>
      <style>{`
        @keyframes hero-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes hero-pulse-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
        }
        @keyframes hero-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes hero-score-fill {
          from { width: 0%; }
          to { width: 94%; }
        }

        .hero-step {
          opacity: 0;
          animation: hero-fade-in 0.5s ease-out forwards;
        }
        .hero-step-1 { animation-delay: 0s; }
        .hero-step-2 { animation-delay: 2.5s; }
        .hero-step-3 { animation-delay: 5s; }
        .hero-step-4 { animation-delay: 7.5s; }

        .hero-pulse { animation: hero-pulse-ring 2s ease-in-out infinite; animation-delay: 1s; }
        .hero-spin { animation: hero-spin 1s linear infinite; }
        .hero-score-bar {
          animation: hero-score-fill 1.5s ease-out forwards;
          animation-delay: 8.5s;
        }
        .hero-card {
          opacity: 0;
          animation: hero-fade-in 0.6s ease-out forwards;
          animation-delay: 5.5s;
        }
        .hero-trust {
          opacity: 0;
          animation: hero-fade-in 0.6s ease-out forwards;
          animation-delay: 8s;
        }

        .group:hover * {
          animation-play-state: paused !important;
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-step, .hero-pulse, .hero-spin, .hero-score-bar, .hero-card, .hero-trust {
            animation: none !important;
            opacity: 1 !important;
          }
        }
      `}</style>

      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-5 space-y-3 backdrop-blur-sm">
        {/* Step 1: Connect Wallet */}
        <div className="hero-step hero-step-1 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20">
            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-mono text-zinc-400">{t("Connect Wallet", "ربط المحفظة")}</p>
          </div>
          <div className="hero-pulse w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Step 2: Generating Passport */}
        <div className="hero-step hero-step-2 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-500/10 border border-blue-500/20">
            <svg className="w-3.5 h-3.5 text-blue-400 hero-spin" style={{ animationDuration: "2s" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <p className="text-[11px] font-mono text-zinc-400">{t("Generating Sovereign Passport...", "جاري إنشاء الجواز السيادي...")}</p>
        </div>

        {/* Passport Card */}
        <div className="hero-card rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 flex items-center justify-center">
                <span className="text-xs font-bold font-mono text-purple-400">A</span>
              </div>
              <div>
                <p className="text-[11px] font-mono font-semibold text-white">{t("Pioneer.Axiom", "رائد.Axiom")}</p>
                <p className="text-[9px] font-mono text-zinc-500">did:axiom:0x1234...a77x</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-wider font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              KYA ✓
            </span>
          </div>
          <div className="flex gap-4 text-[10px] font-mono">
            <div>
              <span className="text-zinc-500 block">XP</span>
              <span className="text-white font-semibold">1,250</span>
            </div>
            <div>
              <span className="text-zinc-500 block">{t("TIER", "الفئة")}</span>
              <span className="text-purple-400 font-semibold">SOVEREIGN</span>
            </div>
          </div>
        </div>

        {/* Step 3: Trust Score */}
        <div className="hero-trust space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-[11px] font-mono text-zinc-400">{t("Trust Score", "نقاط الثقة")}</span>
            </div>
            <span className="text-sm font-bold font-mono text-emerald-400">94<span className="text-zinc-500 font-normal text-[10px]">/100</span></span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div className="hero-score-bar h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
