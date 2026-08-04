import Link from "next/link";
import { Shield } from "lucide-react";
import HeroCards from "./HeroCards";

interface HeroSectionProps {
  t: (key: string) => string;
}

const TRUST_CHIPS = [
  { label: "W3C DID", color: "bg-electric-blue" },
  { label: "Pi Wallet", color: "bg-emerald-400" },
  { label: "Human Authorization", color: "bg-axiom-purple" },
  { label: "Zero Permissions", color: "bg-zinc-400" },
] as const;

export default function HeroSection({ t }: HeroSectionProps) {
  return (
    <div className="w-full max-w-6xl px-4 sm:px-6 pt-24 sm:pt-32 pb-16 z-10">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
        {/* Left: Copy & CTA */}
        <div className="md:col-span-5 space-y-6 sm:space-y-8 animate-fade-in text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-glass border border-glass-hover mx-auto md:mx-0 shadow-[0_0_15px_rgba(255,255,255,0.05)] backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono tracking-widest text-emerald-400 font-semibold uppercase">
              {t("landing_pi_badge")}
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.1]">
              <span className="block animate-slide-up" style={{ animationDelay: "0.1s" }}>
                {t("hero_create_your")}
              </span>
              <span
                className="block text-transparent bg-clip-text bg-gradient-to-r from-electric-blue via-emerald-400 to-axiom-purple animate-slide-up"
                style={{ animationDelay: "0.2s" }}
              >
                {t("hero_ai_identity")}
              </span>
            </h1>
            <p
              className="text-sm sm:text-base text-zinc-200 max-w-xl mx-auto md:mx-0 animate-slide-up leading-relaxed mt-4"
              style={{ animationDelay: "0.3s" }}
            >
              {t("hero_desc")}
            </p>
          </div>

          <div
            className="flex flex-col sm:flex-row items-center gap-4 pt-4 animate-slide-up justify-center md:justify-start"
            style={{ animationDelay: "0.4s" }}
          >
            <a
              href="/claim"
              className="btn-primary py-4 px-8 text-sm sm:text-base group relative overflow-hidden w-full sm:w-auto font-mono tracking-wider shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {t("hero_cta_create")}
                <svg
                  className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </a>
            <Link
              href="https://docs.axiomid.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs sm:text-sm font-mono text-subtle hover:text-surface transition-colors flex items-center gap-2 px-4 py-3 border border-glass hover:border-glass-hover rounded-xl focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:outline-none"
            >
              <Shield className="w-4 h-4 opacity-70" />
              {t("hero_cta_explore")}
            </Link>
          </div>

          {/* Pi Network referral — free Pi tokens for new users */}
          <div
            className="flex items-center gap-2 pt-3 animate-slide-up"
            style={{ animationDelay: "0.45s" }}
          >
            <a
              href="https://minepi.com/amrikyy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-mono text-emerald-400/70 hover:text-emerald-400 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-400/10 hover:border-emerald-400/30 bg-emerald-400/[0.03]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {t("start_mining_pi_free")}
              <svg
                className="w-3 h-3 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <a
              href="https://coinmarketcap.com/currencies/pi"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-mono text-zinc-500 hover:text-zinc-400 transition-colors flex items-center gap-1 px-2 py-1.5"
            >
              📈 {t("pi_market_data")}
            </a>
          </div>

          {/* Trust chips */}
          <div
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-2 animate-slide-up text-[10px] font-mono text-zinc-500 uppercase tracking-[0.14em]"
            style={{ animationDelay: "0.5s" }}
          >
            {TRUST_CHIPS.map((chip, i) => (
              <div key={chip.label} className="flex items-center gap-3">
                {i > 0 && <span className="hidden sm:inline w-1 h-1 rounded-full bg-zinc-700" aria-hidden="true" />}
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${chip.color}`} />
                  <span>{chip.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Full-width product stage under the copy */}
        <div className="mt-12 sm:mt-16 w-full relative animate-[fade-in-up_0.6s_ease-out_0.35s_both]">
          <div
            className="absolute -inset-x-8 -inset-y-6 rounded-[2rem] pointer-events-none opacity-60"
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 50% 40%, rgba(59,130,246,0.08), transparent 70%)",
            }}
            aria-hidden="true"
          />
          <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.015] p-3 sm:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            {/* Mac-style window chrome */}
            <div className="flex items-center gap-2 px-2 pb-3 mb-1 border-b border-white/[0.04]">
              <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
              <span className="ms-3 text-[10px] font-mono text-zinc-600 tracking-wider uppercase">
                axiomid · passport stage
              </span>
            </div>
            <HeroCards />
          </div>
        </div>
      </div>
    </div>
  );
}