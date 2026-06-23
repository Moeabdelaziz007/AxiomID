"use client";

import { useWallet } from "./context/wallet-context";
import { ErrorBanner } from "@/components/ErrorBanner";
import Link from "next/link";
import { useLanguage } from "./context/language-context";
import Footer from "@/components/Footer";
import { Zap, AlertTriangle, Shield, Fingerprint } from "lucide-react";
import Script from "next/script";
import LanguageToggle from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import HeroDemo from "@/components/HeroDemo";
import StatsBar from "@/components/StatsBar";
import TrustTiers from "@/components/TrustTiers";

/**
 * AxiomID landing page — Islands Architecture.
 * Hero + features + tiers = instant render (no skeleton gate).
 * Stats fade in via CSS transition. Demo is pure CSS animation.
 */
export default function Home() {
  const { user, connectWallet, isConnecting, isPiBrowser, logout } = useWallet();
  const { t, language } = useLanguage();

  return (
    <>
    <Script
      id="axiomid-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "AxiomID",
          url: "https://axiomid.app",
          description: "W3C DID-based identity layer for humans delegating authority to AI agents on Pi Network and Stellar. Cryptographic proof that an AI agent is working with human authorization.",
          applicationCategory: "Identity Application",
          operatingSystem: "Web",
          offers: { "@type": "Offer", price: "0", priceCurrency: "XLM" },
          provider: { "@type": "Organization", name: "AxiomID", url: "https://axiomid.app" },
          featureList: [
            "W3C DID Document Generation",
            "Ed25519 Key Pair Management",
            "Verifiable Credential Issuance",
            "Agent Identity Verification",
            "Pi Network Integration",
            "Stellar Blockchain Anchoring",
            "AI Agent Delegation",
            "Zero-Knowledge Proof Privacy",
          ],
          inLanguage: ["en", "ar"],
          isAccessibleForFree: true,
        }),
      }}
    />
    <main className="min-h-screen bg-grid flex flex-col items-center relative overflow-hidden">
      <div className="scanline" />
      <ErrorBanner />

      {/* Header */}
      <header className="sticky top-0 w-full z-50 bg-[#0c0d14]/95 backdrop-blur-lg border-b border-white/[0.04] shadow-[0_1px_0_0_rgba(255,255,255,0.02)_inset]">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-3 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-white/[0.08] bg-black/40 relative group overflow-hidden transition-all duration-300 hover:border-electric-blue/40">
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 via-electric-blue/5 to-axiom-purple/5 opacity-50 group-hover:opacity-100 transition-opacity" />
              <svg className="w-5 h-5 z-10 filter drop-shadow-[0_0_8px_rgba(0,212,255,0.4)]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="42" stroke="url(#logoGrad)" strokeWidth="3" strokeDasharray="4 16 28 6" className="animate-spin" style={{ animationDuration: "24s" }} />
                <path d="M50 24 L74 74 L62 74 L50 48 L38 74 L26 74 Z" fill="#ffffff" />
                <path d="M40 64 H60 L58 68 H42 Z" fill="#39FF14" />
                <defs>
                  <linearGradient id="logoGrad" x1="0" y1="0" x2="100" y2="100">
                    <stop offset="0%" stopColor="#39FF14" />
                    <stop offset="50%" stopColor="#00d4ff" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="font-mono text-lg sm:text-xl tracking-tighter text-surface">AXIOM<span className="text-electric-blue">ID</span></span>
            <div className="w-px h-6 bg-white/10 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/10">
              <svg viewBox="0 0 100 100" className="w-4 h-4" fill="currentColor">
                <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.3" />
                <text x="50" y="68" textAnchor="middle" fontSize="60" fontWeight="bold" fill="currentColor" fontFamily="serif">π</text>
              </svg>
              <span className="text-[9px] font-mono tracking-wider" style={{ color: "var(--text-secondary)" }}>PI NETWORK</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageToggle />
            <ThemeToggle />
            {isPiBrowser && !user && (
              <span className="hidden sm:inline text-[10px] font-mono px-2 py-1 rounded border" style={{ background: "rgba(59, 130, 246, 0.1)", borderColor: "rgba(59, 130, 246, 0.2)", color: "#3b82f6" }}>
                Pi Browser
              </span>
            )}
            {user ? (
              <div className="flex items-center gap-2">
                <Link href="/dashboard" prefetch={false} className="btn-primary text-xs px-3 sm:px-4 py-1.5">
                  {t("nav_dashboard")}
                </Link>
                <button onClick={() => logout()} className="btn-ghost text-xs px-3 py-1.5 hidden sm:flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  {t("logout")}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/dashboard" prefetch={false} className="btn-ghost text-xs px-3 sm:px-4 py-1.5">
                  {t("nav_dashboard")}
                </Link>
                <button onClick={connectWallet} disabled={isConnecting} aria-busy={isConnecting} aria-label={isConnecting ? t("connecting") : t("connect")} className="btn-primary text-xs px-3 sm:px-4 py-1.5">
                  {isConnecting ? t("connecting") : t("connect")}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative w-full max-w-6xl px-4 sm:px-6 mt-8 md:mt-16 z-10 min-h-[80vh] flex items-center hero-mesh-bg">
        {/* Floating particles — CSS-only */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="particle" style={{ left: "15%", top: "20%", animationDelay: "0s", animationDuration: "7s", background: "rgba(34,197,94,0.12)" }} />
          <div className="particle" style={{ left: "75%", top: "30%", animationDelay: "1.5s", animationDuration: "8s", background: "rgba(59,130,246,0.12)" }} />
          <div className="particle" style={{ left: "45%", top: "70%", animationDelay: "3s", animationDuration: "6s", background: "rgba(99,102,241,0.12)" }} />
          <div className="particle" style={{ left: "85%", top: "60%", animationDelay: "2s", animationDuration: "9s", background: "rgba(34,197,94,0.12)" }} />
          <div className="particle" style={{ left: "30%", top: "85%", animationDelay: "4s", animationDuration: "7s", background: "rgba(59,130,246,0.12)" }} />
          <div className="particle" style={{ left: "60%", top: "15%", animationDelay: "0.5s", animationDuration: "8s", background: "rgba(99,102,241,0.12)" }} />
        </div>
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: "radial-gradient(#424754 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

        <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center py-12 relative z-10">
          {/* Left: Headline + CTAs */}
          <div className="md:col-span-7 flex flex-col items-center md:items-start text-center md:text-left space-y-5">
            <div className="flex flex-wrap gap-2 justify-center md:justify-start items-center animate-[fadeInUp_0.4s_ease-out_0.1s_both]">
              <span className="px-3 py-1 rounded-full text-[10px] font-mono bg-neon-green/10 text-neon-green border border-neon-green/20 uppercase tracking-widest">
                {t("hero_badge")}
              </span>
              <span className="stitch-badge">
                <svg viewBox="0 0 100 100" className="w-4 h-4 animate-spin" style={{ animationDuration: "6s" }} fill="currentColor">
                  <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.3" />
                  <text x="50" y="68" textAnchor="middle" fontSize="60" fontWeight="bold" fill="currentColor" fontFamily="serif">π</text>
                </svg>
                {language === "en" ? "Live on Pi Network Testnet" : "مباشر على شبكة Pi التجريبية"}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] text-white animate-[fadeInUp_0.6s_ease-out_0.2s_both]">
              {language === "en" ? (
                <>Your Identity.<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-electric-blue to-axiom-purple">Your Rules.</span></>
              ) : (
                <>هويتك.<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-electric-blue to-axiom-purple">قوانينك.</span></>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl font-medium tracking-tight text-zinc-300 max-w-xl animate-[fadeInUp_0.5s_ease-out_0.3s_both]">
              {language === "en"
                ? "No permission needed. One DID. Infinite agents. Cryptographic proof of human intent."
                : "بدون تصريح. هوية واحدة. عملاء لا نهائية. إثبات تشفيري لنية البشر."}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto pt-2 animate-[fadeInUp_0.5s_ease-out_0.4s_both]">
              {!user ? (
                isPiBrowser ? (
                  <button onClick={connectWallet} disabled={isConnecting} aria-busy={isConnecting} className="flex items-center justify-center gap-2 text-sm font-semibold px-8 py-4 min-h-[52px] rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all">
                    {isConnecting ? <><span className="animate-spin">⟳</span> {t("connecting")}</> : <>{language === "en" ? "Claim Your Passport" : "احصل على جوازك"}<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></>}
                  </button>
                ) : (
                  <Link href="/claim" prefetch={false} className="flex items-center justify-center gap-2 text-sm font-semibold px-8 py-4 min-h-[52px] rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all">
                    {language === "en" ? "Claim Your Passport" : "احصل على جوازك"}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </Link>
                )
              ) : (
                <Link href="/dashboard" prefetch={false} className="flex items-center justify-center gap-2 text-sm font-semibold px-8 py-4 min-h-[52px] rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all">
                  {language === "en" ? "Open Dashboard" : "افتح لوحة التحكم"}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </Link>
              )}
              <Link href="/docs" className="flex items-center justify-center text-sm font-medium px-8 py-4 min-h-[52px] w-full rounded-xl border border-white/10 text-zinc-300 hover:bg-white/5 hover:border-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                {language === "en" ? "Read Docs" : "الوثائق التقنية"}
              </Link>
            </div>

            <div className="flex flex-wrap gap-4 items-center justify-center md:justify-start pt-6 text-[11px] font-mono text-zinc-500 animate-[fadeInUp_0.6s_ease-out_0.5s_both]">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="tracking-wider">100% On-chain</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-zinc-700" />
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-electric-blue" />
                <span className="tracking-wider">W3C DID</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-zinc-700" />
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-axiom-purple" />
                <span className="tracking-wider">Zero Permissions</span>
              </div>
            </div>
          </div>

          {/* Right: Animated Demo */}
          <div className="md:col-span-5 flex items-center justify-center">
            <div className="w-full max-w-sm relative animate-[fadeInUp_0.6s_ease-out_0.3s_both]">
              <div className="absolute -inset-8 bg-gradient-to-tr from-emerald-500/15 via-electric-blue/15 to-axiom-purple/15 rounded-[48px] blur-3xl opacity-50 animate-pulse pointer-events-none" style={{ animationDuration: "6s" }} />
              <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-500/5 via-electric-blue/5 to-axiom-purple/5 rounded-[32px] blur-xl opacity-40 pointer-events-none" />
              <HeroDemo />
            </div>
          </div>
        </div>
      </div>

      {/* Stats — fades in via CSS transition */}
      <div className="w-full max-w-6xl px-4 sm:px-6 mt-12 sm:mt-16 mb-4 z-10">
        <StatsBar />
      </div>

      {/* Features Section */}
      <div className="w-full max-w-6xl px-4 sm:px-6 mt-16 sm:mt-24 z-10">
        <SectionHeader
          label={language === "en" ? "How It Works" : "كيف يعمل النظام؟"}
          title={language === "en" ? "Three Steps to Agent Identity" : "ثلاث خطوات لبناء هوية العميل"}
          labelColor="text-electric-blue"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          <div className="hidden md:block absolute top-24 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent z-0" />
          {[
            {
              step: "01",
              title: language === "en" ? "Connect" : "الاتصال",
              desc: language === "en" ? "Link your Pi wallet or any Stellar address. Your identity starts here." : "اربط محفظتك للبدء فوراً في تأسيس هويتك الرقمية.",
              icon: <Fingerprint className="w-6 h-6 text-electric-blue" />,
              badge: "W3C DID Standard",
            },
            {
              step: "02",
              title: language === "en" ? "Verify" : "التحقق",
              desc: language === "en" ? "Complete KYA + KYC. Build trust through social actions and on-chain activity." : "أكمل خطوات التوثيق (KYA) واربح طوابع الهوية الرقمية.",
              icon: <Shield className="w-6 h-6 text-axiom-purple" />,
              badge: "ZKP Privacy Ready",
            },
            {
              step: "03",
              title: language === "en" ? "Deploy" : "التشغيل",
              desc: language === "en" ? "Your Agent Passport is ready. Use it across the Pi ecosystem with Pi token payments only." : "جواز سفر العميل الخاص بك جاهز للاستخدام في نظام Pi البيئي مع مدفوعات Pi فقط.",
              icon: <Zap className="w-6 h-6 text-emerald-400" />,
              badge: "Pi Network Compatible",
            },
          ].map((item) => (
            <div key={item.step} className="stitch-feature-card flex flex-col gap-4 cursor-default group relative z-10">
              <div className="absolute top-4 right-4 text-3xl font-mono font-bold text-white/5 group-hover:text-electric-blue/5 transition-colors">{item.step}</div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 group-hover:border-electric-blue/20 transition-all duration-300">
                {item.icon}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-electric-blue transition-colors duration-300">{item.title}</h3>
              </div>
              <p className="text-sm leading-relaxed text-zinc-400">{item.desc}</p>
              <div className="mt-auto pt-4 border-t border-white/5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-electric-blue animate-pulse" />
                <span className="text-[11px] font-mono text-zinc-500">{item.badge}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Why AxiomID? */}
      <div className="w-full max-w-6xl px-4 sm:px-6 mt-16 sm:mt-24 z-10">
        <SectionHeader
          label={language === "en" ? "The Sovereign Advantage" : "الميزة السيادية"}
          title={language === "en" ? "Why Choose AxiomID?" : "لماذا تختار AxiomID؟"}
          labelColor="text-zinc-500"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl border border-red-500/10 glass-card flex flex-col justify-between min-h-[300px]">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
                <h3 className="text-base font-bold text-red-400 font-mono tracking-tight">{language === "en" ? "Traditional Identity (Web2)" : "الهوية التقليدية (Web2)"}</h3>
              </div>
              <ul className="space-y-3 text-xs font-mono text-zinc-500">
                {[
                  language === "en" ? "Siloed data: Your profiles are owned by third-party platforms." : "بيانات معزولة: ملفاتك الشخصية مملوكة لمنصات خارجية.",
                  language === "en" ? "High friction: Repeated manual KYC checks for every app." : "خطوات معقدة: فحوصات KYC متكررة لكل تطبيق.",
                  language === "en" ? "Vulnerable: Easy spoofing of digital identities and usernames." : "سهل الاختراق: انتحال سهل للهويات الرقمية وأسماء المستخدمين.",
                  language === "en" ? "No AI integration: Machine agents cannot prove their authority." : "لا تكامل مع الذكاء الاصطناعي: لا يمكن للعملاء الآليين إثبات هويتهم.",
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-red-500/50">✗</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-red-500/5 pt-4 mt-6 text-[10px] text-zinc-600 font-mono">
              {language === "en" ? "Result: Fragile security, high friction, no agent trust." : "النتيجة: أمان هش، خطوات معقدة، غياب للثقة."}
            </div>
          </div>

          <div className="p-6 rounded-3xl border border-emerald-500/20 glass-card flex flex-col justify-between min-h-[300px] shadow-lg shadow-emerald-500/[0.01]">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-bold text-emerald-400 font-mono tracking-tight">{language === "en" ? "AxiomID Sovereign Passport" : "جواز السفر السيادي AxiomID"}</h3>
              </div>
              <ul className="space-y-3 text-xs font-mono text-zinc-300">
                {[
                  language === "en" ? "Decentralized: You own your credentials via W3C DIDs." : "لامركزي: أنت تمتلك بياناتك عبر W3C DIDs.",
                  language === "en" ? "Verify once, prove everywhere: Single dashboard for all stamps." : "تحقق مرة، أثبت في كل مكان: لوحة تحكم واحدة لجميع طوابعك.",
                  language === "en" ? "Cryptographic security: Trust Score verified on-chain." : "حماية تشفيرية: نقاط الثقة موثقة ومعتمدة رياضياً.",
                  language === "en" ? "Agent-native: Built for AI agents to represent you securely." : "مصمم للذكاء الاصطناعي: يمثلك عميلك الآلي بأمان.",
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-emerald-400">✓</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-emerald-500/10 pt-4 mt-6 text-[10px] text-zinc-400 font-mono">
              {language === "en" ? "Result: Frictionless auth, resilient trust, delegation-ready." : "النتيجة: مصادقة خالية من الاحتكاك، ثقة مرنة، تفويض آمن."}
            </div>
          </div>
        </div>
      </div>

      {/* Trust Tiers — Interactive */}
      <div className="w-full max-w-6xl px-4 sm:px-6 mt-16 sm:mt-24 z-10">
        <SectionHeader
          label={t("tier")}
          title={language === "en" ? "Level Up Your Identity" : "ارفع مستوى هويتك الرقمية"}
          labelColor="text-electric-blue"
        />
        <TrustTiers />
      </div>

      <Footer />
    </main>
    </>
  );
}

function SectionHeader({ label, title, labelColor }: { label: string; title: string; labelColor: string }) {
  return (
    <div className="text-center mb-10 sm:mb-12">
      <span className={`text-[10px] font-mono ${labelColor} tracking-widest uppercase`}>{label}</span>
      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-surface mt-2">{title}</h2>
    </div>
  );
}
