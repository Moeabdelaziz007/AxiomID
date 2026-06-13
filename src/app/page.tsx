"use client";

import { Tier } from "@/lib/tiers";
import { useState, useEffect } from "react";
import { useWallet } from "./context/wallet-context";
import { ErrorBanner } from "@/components/ErrorBanner";
import Link from "next/link";
import { useLanguage } from "./context/language-context";
import LanguageToggle from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * Render a floating "Agent Passport" card for a user with an interactive 3D tilt effect.
 *
 * The card displays an avatar, a username (prefers `piUsername`, falls back to `walletAddress`, or shows "Connect Wallet"), a shortened wallet address or placeholder, KYA/KYC badges that reflect presence of a user, and a tier/version label. Registers a window mousemove listener to compute the card's tilt and removes the listener on unmount.
 *
 * @param user - Optional user object. If provided, may include `piUsername`, `walletAddress`, and `tier`; values are used for display and badge/tier states. When `user` is null, placeholders and pending badge styles are shown.
 * @returns A JSX element rendering the interactive passport card.
 */
function PassportHero({ user }: { user: { piUsername?: string | null; walletAddress?: string; tier?: Tier | null } | null }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 15;
      const y = (e.clientY / window.innerHeight - 0.5) * 15;
      setTilt({ x, y });
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  const hasUser = !!user;
  const username = user?.piUsername || (user?.walletAddress ? (user.walletAddress.startsWith("pi:") ? user.walletAddress.slice(3) : user.walletAddress) : "Connect Wallet");
  const displayAddress = user?.walletAddress ? (user.walletAddress.length > 20 ? `${user.walletAddress.slice(0, 8)}...${user.walletAddress.slice(-6)}` : user.walletAddress) : "did:axiom:...";
  const avatarText = user?.piUsername ? user.piUsername[0].toUpperCase() : (user?.walletAddress ? "👤" : "?");

  return (
    <div
      className="relative w-full max-w-md mx-auto h-64 cursor-pointer"
      style={{
        perspective: "1000px",
      }}
    >
      <div
        className="absolute inset-0 passport-card p-6 flex flex-col justify-between"
        style={{
          transform: `rotateY(${tilt.x * 0.3}deg) rotateX(${-tilt.y * 0.3}deg)`,
          transition: "transform 0.1s ease-out",
        }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-neon-green/20 flex items-center justify-center border border-neon-green/50">
              <span className="text-neon-green font-bold text-[8px]">A</span>
            </div>
            <span className="font-mono text-[10px] tracking-wider text-white">AXIOMID</span>
          </div>
          <span className="font-mono text-[8px] text-gray-500 tracking-widest">AGENT PASSPORT</span>
        </div>

        {/* Middle: Avatar + Info */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-neon-green/20 to-electric-blue/20 border border-neon-green/30 flex items-center justify-center text-2xl font-bold font-mono text-neon-green">
            {avatarText}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-white font-mono">{username}</h3>
            <p className="text-[9px] text-gray-500 font-mono mt-1">{displayAddress}</p>
            <div className="mt-2 flex gap-1.5">
              {["KYA", "KYC"].map((label) => (
                <span key={label} className={`badge ${hasUser ? "badge-verified" : "badge-pending"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${hasUser ? "bg-neon-green" : "bg-yellow-500 animate-pulse"}`} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between border-t border-white/5 pt-3">
          <span className="text-[8px] text-gray-600 font-mono">AxiomID Verified • Pi Compatible</span>
          <span className="text-[8px] text-gray-600 font-mono">{user?.tier ? user.tier.toUpperCase() : "1.0.0"}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Render the application's public landing Home page with localized content and live network statistics.
 *
 * Uses wallet and language hooks to drive header and CTA state (connect, dashboard, logout, language/theme toggles).
 * On mount it fetches "/api/status" to populate the Live Stats bar (users, agents, xp, payments).
 * Displays a sandbox banner when NEXT_PUBLIC_PI_SANDBOX === "true" and renders the hero, floating passport, features, tiers, and footer.
 *
 * @returns The React element representing the Home page.
 */
export default function Home() {
  const { user, connectWallet, isConnecting, isPiBrowser, logout } = useWallet();
  const { t, language } = useLanguage();
  const [networkStats, setNetworkStats] = useState<{ users: number; agents: number; xp: number; payments: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/status").then(async (res) => {
      if (!res.ok || cancelled) return;
      const data = await res.json();
      const s = data.stats || {};
      if (!cancelled) {
        setNetworkStats({
          users: s.registeredUsers ?? 0,
          agents: s.totalAgents ?? 0,
          xp: s.totalXpEarned ?? 0,
          payments: s.totalPayments ?? 0,
        });
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="min-h-screen bg-grid flex flex-col items-center relative">
      <div className="scanline" />
      <ErrorBanner />

      {/* Sandbox Banner */}
      {process.env.NEXT_PUBLIC_PI_SANDBOX === "true" && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-[10px] font-mono tracking-wider">
          SANDBOX MODE
        </div>
      )}

      {/* Header */}
      <header className="w-full max-w-6xl flex justify-between items-center px-6 py-6 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-neon-green/20 flex items-center justify-center border border-neon-green/50">
            <span className="text-neon-green font-bold">A</span>
          </div>
          <span className="font-mono text-xl tracking-tighter">AXIOM<span className="text-gray-600">ID</span></span>
        </div>

        <div className="flex items-center gap-3">
          <LanguageToggle />
          <ThemeToggle />
          {isPiBrowser && !user && (
            <span className="text-[10px] font-mono text-electric-blue px-2 py-1 rounded-full border border-electric-blue/30 bg-electric-blue/5">
              Pi Browser
            </span>
          )}
          {user ? (
            <div className="flex items-center gap-2">
              <Link href="/dashboard" className="btn-primary text-xs px-4 py-2">
                {t("nav_dashboard")}
              </Link>
              <button
                onClick={() => logout()}
                className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {t("logout")}
              </button>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="btn-primary text-xs px-4 py-2"
            >
              {isConnecting ? t("connecting") : t("connect")}
            </button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <div className="w-full max-w-6xl px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center mt-8 md:mt-16 z-10">
        {/* Left: Text */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neon-green/10 text-neon-green border border-neon-green/20">
              v1.0.0
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-electric-blue/10 text-electric-blue border border-electric-blue/20">
              PI COMPATIBLE
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1]">
            {language === "en" ? (
              <>
                Agent Identity
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-electric-blue">
                  for the AI Era.
                </span>
              </>
            ) : (
              <>
                هوية العملاء
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-electric-blue">
                  لعصر الذكاء الاصطناعي.
                </span>
              </>
            )}
          </h1>

          <p className="text-gray-400 max-w-md leading-relaxed text-sm md:text-base">
            {t("hero_desc")}
          </p>

          {!user ? (
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="btn-primary flex items-center gap-3 w-fit"
              >
                {isConnecting ? (
                  <>
                    <span className="animate-spin">⟳</span> {t("connecting")}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    {t("connect_wallet")}
                  </>
                )}
              </button>
              <Link href="/dashboard" className="btn-ghost w-fit text-center">
                {t("view_demo")}
              </Link>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <Link href="/dashboard" className="btn-primary flex items-center justify-center gap-2 w-fit">
                {t("enter_dashboard")}
              </Link>
              <button
                onClick={logout}
                className="btn-ghost w-fit text-center"
              >
                {t("logout")}
              </button>
            </div>
          )}

          {/* Trust indicators */}
          <div className="flex flex-wrap gap-4 mt-4 text-[10px] font-mono text-gray-500">
            <div className="flex items-center gap-1.5">
              <svg className="w-3 h-3 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{language === "en" ? "W3C DID Compliant" : "متوافق مع W3C DID"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-3 h-3 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{language === "en" ? "Stellar On-Chain" : "على الشبكة Stellar"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-3 h-3 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{language === "en" ? "Pi Network Compatible" : "متوافق مع شبكة Pi"}</span>
            </div>
          </div>
        </div>

        {/* Right: Floating Passport */}
        <div className="relative animate-float">
          <PassportHero user={user} />
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-neon-green/5 to-electric-blue/5 blur-3xl rounded-full scale-150 pointer-events-none animate-pulse-slow" />
        </div>
      </div>

      {/* Live Stats Bar */}
      <div className="w-full max-w-6xl px-6 mt-12 z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bento-card border border-white/5 bg-white/[0.01]">
          {[
            { label: t("stat_users"), value: networkStats?.users.toLocaleString() ?? "—", icon: "🆔", color: "text-neon-green" },
            { label: t("stat_agents"), value: networkStats?.agents.toLocaleString() ?? "—", icon: "🤖", color: "text-electric-blue" },
            { label: t("total_xp"), value: networkStats?.xp.toLocaleString() ?? "—", icon: "🎫", color: "text-axiom-purple" },
            { label: t("stat_tx"), value: networkStats?.payments.toLocaleString() ?? "—", icon: "⚡", color: "text-axiom-gold" },
          ].map((stat) => (
            <div key={stat.label} className="text-center md:text-left md:border-r border-white/5 last:border-0 md:px-4 flex flex-col md:flex-row md:items-center gap-3">
              <span className="text-2xl hidden md:inline">{stat.icon}</span>
              <div>
                <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">{stat.label}</p>
                <h4 className={`text-lg md:text-xl font-bold font-mono mt-0.5 ${stat.color}`}>{stat.value}</h4>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <div className="w-full max-w-6xl px-6 mt-24 md:mt-32 z-10">
        <div className="text-center mb-12">
          <span className="text-[10px] font-mono text-neon-green tracking-widest uppercase">{language === "en" ? "How It Works" : "كيف يعمل النظام؟"}</span>
          <h2 className="text-2xl md:text-3xl font-bold text-white mt-2">{language === "en" ? "Three Steps to Agent Identity" : "ثلاث خطوات لبناء هوية العميل"}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              title: language === "en" ? "Connect" : "الاتصال",
              desc: language === "en" ? "Link your Pi wallet or any Stellar address. Your identity starts here." : "اربط محفظتك للبدء فورا في تأسيس هويتك الرقمية.",
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              ),
            },
            {
              step: "02",
              title: language === "en" ? "Verify" : "التحقق",
              desc: language === "en" ? "Complete KYA + KYC. Build trust through social actions and on-chain activity." : "أكمل خطوات التوثيق (KYA) واربح طوابع الهوية الرقمية.",
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ),
            },
            {
              step: "03",
              title: language === "en" ? "Deploy" : "التشغيل",
              desc: language === "en" ? "Your Agent Passport is ready. Use it across the Pi ecosystem and beyond." : "جواز سفر العميل الخاص بك جاهز للاستخدام في شبكة Pi وخارجها.",
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              ),
            },
          ].map((item) => (
            <div key={item.step} className="bento-card p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="text-neon-green font-mono text-2xl font-bold">{item.step}</span>
                <div className="w-px h-6 bg-white/10" />
                <div className="text-neon-green">{item.icon}</div>
              </div>
              <h3 className="text-lg font-bold text-white">{item.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Why AxiomID? Section */}
      <div className="w-full max-w-6xl px-6 mt-24 md:mt-32 z-10">
        <div className="text-center mb-12">
          <span className="text-[10px] font-mono text-axiom-purple tracking-widest uppercase">{language === "en" ? "The Sovereign Advantage" : "الميزة السيادية"}</span>
          <h2 className="text-2xl md:text-3xl font-bold text-white mt-2">{language === "en" ? "Why Choose AxiomID?" : "لماذا تختار AxiomID؟"}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Traditional Identity */}
          <div className="bento-card p-6 border border-red-500/10 bg-red-500/[0.01] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-red-400 text-lg">⚠️</span>
                <h3 className="text-base font-bold text-red-400 font-mono">{language === "en" ? "Traditional Identity (Web2)" : "الهوية التقليدية (Web2)"}</h3>
              </div>
              <ul className="space-y-3.5 text-xs text-gray-400 font-mono">
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500/70">✗</span>
                  <span>{language === "en" ? "Siloed data: Your profiles are owned by third-party platforms." : "بيانات معزولة: ملفاتك الشخصية مملوكة لمنصات خارجية."}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500/70">✗</span>
                  <span>{language === "en" ? "High friction: Repeated manual KYC checks for every app." : "خطوات معقدة: فحوصات KYC متكررة لكل تطبيق."}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500/70">✗</span>
                  <span>{language === "en" ? "Vulnerable: Easy spoofing of digital identities and usernames." : "سهل الاختراق: انتحال سهل للهويات الرقمية وأسماء المستخدمين."}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500/70">✗</span>
                  <span>{language === "en" ? "No AI integration: Machine agents cannot prove their authority or credentials." : "لا تكامل مع الذكاء الاصطناعي: لا يمكن للعملاء الآليين إثبات هويتهم."}</span>
                </li>
              </ul>
            </div>
            <div className="border-t border-white/5 pt-4 mt-6 text-[10px] text-gray-500 font-mono">
              {language === "en" ? "Result: Fragile security, high user friction, lack of agent trust." : "النتيجة: أمان هش، خطوات معقدة، غياب للثقة."}
            </div>
          </div>

          {/* AxiomID Passport */}
          <div className="bento-card p-6 border border-neon-green/20 bg-neon-green/[0.01] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-neon-green text-lg">✓</span>
                <h3 className="text-base font-bold text-neon-green font-mono">{language === "en" ? "AxiomID Stamps Passport" : "جواز سفر طوابع AxiomID"}</h3>
              </div>
              <ul className="space-y-3.5 text-xs text-gray-300 font-mono">
                <li className="flex items-start gap-2.5">
                  <span className="text-neon-green">✓</span>
                  <span>{language === "en" ? "Decentralized: You own and carry your credentials via W3C DIDs." : "لامركزي: أنت تمتلك وتتحكم ببياناتك عبر المعرفات W3C DIDs."}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-neon-green">✓</span>
                  <span>{language === "en" ? "Verify once, prove everywhere: Single dashboard for all platform stamps." : "تحقق مرة واحدة، أثبت في كل مكان: لوحة تحكم واحدة لجميع طوابعك."}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-neon-green">✓</span>
                  <span>{language === "en" ? "Cryptographic security: Trust Score is math-verified on-chain." : "حماية تشفيرية: نقاط الثقة موثقة ومعتمدة رياضياً."}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-neon-green">✓</span>
                  <span>{language === "en" ? "Agent-native: Built for AI agents to represent you securely in automated tasks." : "مصمم للذكاء الاصطناعي: بني ليمثلك عميلك الآلي بأمان في المعاملات."}</span>
                </li>
              </ul>
            </div>
            <div className="border-t border-white/5 pt-4 mt-6 text-[10px] text-gray-500 font-mono">
              {language === "en" ? "Result: Frictionless authentication, resilient trust, delegation-ready." : "النتيجة: مصادقة خالية من الاحتكاك، ثقة مرنة، تفويض آمن."}
            </div>
          </div>
        </div>
      </div>

      {/* Tiers Section */}
      <div className="w-full max-w-6xl px-6 mt-24 z-10">
        <div className="text-center mb-12">
          <span className="text-[10px] font-mono text-electric-blue tracking-widest uppercase">{t("tier")}</span>
          <h2 className="text-2xl md:text-3xl font-bold text-white mt-2">{language === "en" ? "Level Up Your Identity" : "ارفع مستوى هويتك الرقمية"}</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: t("visitor"), xp: "0", color: "#64748b", desc: language === "en" ? "Connect wallet" : "اربط محفظتك" },
            { name: t("citizen"), xp: "100", color: "#00ff41", desc: language === "en" ? "Social + actions" : "تأكيدات وحسابات اجتماعية" },
            { name: t("validator"), xp: "500", color: "#00d4ff", desc: language === "en" ? "KYC verified" : "توثيق الهوية KYC" },
            { name: t("sovereign"), xp: "1000", color: "#a855f7", desc: language === "en" ? "Full delegation" : "تفويض كامل للذكاء الاصطناعي" },
          ].map((tier) => (
            <div key={tier.name} className="bento-card p-5 text-center">
              <div
                className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center border"
                style={{
                  borderColor: `${tier.color}40`,
                  background: `${tier.color}10`,
                }}
              >
                <span className="font-mono font-bold text-sm animate-pulse-slow" style={{ color: tier.color }}>
                  {tier.name[0]}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white">{tier.name}</h4>
              <p className="text-[10px] text-gray-500 mt-1">{tier.desc}</p>
              <span className="text-[10px] font-mono mt-2 block" style={{ color: tier.color }}>
                {tier.xp} XP
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-center mt-24 py-8 border-t border-white/5 text-[10px] font-mono text-gray-500 z-10 gap-4">
        <div>&copy; 2026 AxiomID. All rights reserved.</div>
        <div className="flex gap-4">
          <Link href="/status" className="hover:text-white transition-colors">{t("nav_status")}</Link>
          <Link href="/privacy" className="hover:text-white transition-colors">{t("nav_privacy")}</Link>
          <Link href="/terms" className="hover:text-white transition-colors">{t("nav_terms")}</Link>
          <span className="text-gray-600">1.0.0</span>
        </div>
      </footer>
    </main>
  );
}
