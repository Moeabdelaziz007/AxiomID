"use client";

import { useState, useEffect } from "react";
import { useWallet } from "./context/wallet-context";
import { ErrorBanner } from "@/components/ErrorBanner";
import Link from "next/link";
import { useLanguage } from "./context/language-context";
import LanguageToggle from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Users, Bot, Ticket, Zap, AlertTriangle, Shield, Fingerprint } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import dynamic from "next/dynamic";
const InteractivePassportCard = dynamic(() => import("@/components/ui/InteractivePassportCard"), { ssr: false });

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const _cardHover = {
  rest: { scale: 1, y: 0 },
  hover: { scale: 1.02, y: -4, transition: { duration: 0.3, ease: "easeOut" } },
};

/**
 * Renders the AxiomID public landing page with wallet integration, Agent Passport card, animated hero section, live network statistics, feature guides, and identity tier cards. Supports English and Arabic.
 */
export default function Home() {
  const { user, connectWallet, isConnecting, isPiBrowser, logout } = useWallet();
  const { t, language } = useLanguage();
  const [networkStats, setNetworkStats] = useState<{ users: number; agents: number; xp: number; payments: number } | null>(null);

  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { once: true, margin: "-80px" });

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
    <main className="min-h-screen bg-grid flex flex-col items-center relative overflow-hidden">
      <div className="scanline" />
      <ErrorBanner />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-6xl flex flex-wrap justify-between items-center gap-3 px-4 sm:px-6 py-4 sm:py-6 z-10"
      >
        <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-white/10 bg-black/40 relative group overflow-hidden transition-all duration-300 hover:border-electric-blue/40">
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 via-electric-blue/5 to-axiom-purple/5 opacity-50 group-hover:opacity-100 transition-opacity" />
              <svg className="w-5.5 h-5.5 z-10 filter drop-shadow-[0_0_8px_rgba(0,212,255,0.4)]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="42" stroke="url(#logoGrad)" strokeWidth="3" strokeDasharray="4 16 28 6" className="animate-spin" style={{ animationDuration: '24s' }} />
                <path d="M50 24 L74 74 L62 74 L50 48 L38 74 L26 74 Z" fill="#ffffff" />
                <path d="M40 64 H60 L58 68 H42 Z" fill="#39FF14" />
                <defs>
                  <linearGradient id="logoGrad" x1="0" y1="0" x2="100" y2="100">
                    <stop offset="0%" stopColor="#39FF14"/>
                    <stop offset="50%" stopColor="#00d4ff"/>
                    <stop offset="100%" stopColor="#a855f7"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="font-mono text-lg sm:text-xl tracking-tighter" style={{ color: 'var(--text-primary)' }}>AXIOM<span className="text-electric-blue">ID</span></span>
          <div className="w-px h-6 bg-white/10 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/10">
            <svg viewBox="0 0 100 100" className="w-4 h-4" fill="currentColor">
              <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.3"/>
              <text x="50" y="68" textAnchor="middle" fontSize="60" fontWeight="bold" fill="currentColor" fontFamily="serif">π</text>
            </svg>
            <span className="text-[9px] font-mono tracking-wider" style={{ color: 'var(--text-secondary)' }}>PI NETWORK</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageToggle />
          <ThemeToggle />
          {isPiBrowser && !user && (
            <span className="hidden sm:inline text-[10px] font-mono px-2 py-1 rounded border" style={{ background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}>
              Pi Browser
            </span>
          )}
          {user ? (
            <div className="flex items-center gap-2">
              <Link href="/dashboard" prefetch={false} className="btn-primary text-xs px-3 sm:px-4 py-2">
                {t("nav_dashboard")}
              </Link>
              <button onClick={() => logout()} className="btn-ghost text-xs px-3 py-1.5 hidden sm:flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {t("logout")}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/dashboard" prefetch={false} className="btn-ghost text-xs px-3 sm:px-4 py-2">
                {t("nav_dashboard")}
              </Link>
              <button onClick={connectWallet} disabled={isConnecting} aria-busy={isConnecting} aria-label={isConnecting ? t("connecting") : t("connect")} className="btn-primary text-xs px-3 sm:px-4 py-2">
                {isConnecting ? t("connecting") : t("connect")}
              </button>
            </div>
          )}
        </div>
      </motion.header>

      {/* Hero Section */}
      <div className="relative w-full max-w-6xl px-4 sm:px-6 mt-6 md:mt-16 z-10 min-h-[70vh] flex items-center">
        {/* Dot grid background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(#424754 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

        <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center py-8 relative z-10">
          
          {/* Left Column: Headline, Description, CTAs, Trust indicators */}
          <div className="md:col-span-7 flex flex-col items-center md:items-start text-center md:text-left space-y-5">
            {/* Live badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <span className="stitch-badge">
                <svg viewBox="0 0 100 100" className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} fill="currentColor">
                  <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.3"/>
                  <text x="50" y="68" textAnchor="middle" fontSize="60" fontWeight="bold" fill="currentColor" fontFamily="serif">π</text>
                </svg>
                {language === "en" ? "Live on Pi Network Mainnet" : "مباشر على شبكة Pi الرئيسية"}
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="text-3.5xl sm:text-4.5xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] text-white"
            >
              {language === "en" ? (
                <>Your Identity, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-electric-blue to-axiom-purple">Sovereign.</span></>
              ) : (
                <>هويتك، <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-electric-blue to-axiom-purple">سيادية.</span></>
              )}
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="max-w-xl text-sm sm:text-base md:text-lg leading-relaxed text-zinc-400"
            >
              {t("hero_desc")}
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto pt-2"
            >
              {!user ? (
                <>
                  {isPiBrowser ? (
                    <button onClick={connectWallet} disabled={isConnecting} aria-busy={isConnecting} className="btn-primary flex items-center justify-center gap-2 text-xs sm:text-sm px-6 py-3 min-h-[48px]">
                      {isConnecting ? (
                        <><span className="animate-spin">⟳</span> {t("connecting")}</>
                      ) : (
                        <>
                          {t("connect_wallet")}
                          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                        </>
                      )}
                    </button>
                  ) : (
                    <Link href="/dashboard" prefetch={false} className="btn-primary flex items-center justify-center gap-2 text-xs sm:text-sm px-6 py-3 min-h-[48px]">
                      {t("enter_dashboard")}
                      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    </Link>
                  )}
                </>
              ) : (
                <Link href="/dashboard" prefetch={false} className="btn-primary flex items-center justify-center gap-2 text-xs sm:text-sm px-6 py-3 min-h-[48px]">
                  {t("enter_dashboard")}
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </Link>
              )}
              <Link href="/docs" className="btn-ghost flex items-center justify-center text-xs sm:text-sm px-6 py-3 min-h-[48px]">
                {language === "en" ? "Documentation" : "الوثائق التقنية"}
              </Link>
            </motion.div>

            {/* Trust Badges */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="flex flex-wrap gap-4 items-center justify-center md:justify-start pt-4 text-[10px] font-mono text-zinc-500"
            >
              <div className="flex items-center gap-1">
                <span className="text-emerald-400">✓</span>
                <span>W3C DID COMPLIANT</span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
              <div className="flex items-center gap-1">
                <span className="text-emerald-400">✓</span>
                <span>STELLAR SECURED</span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
              <div className="flex items-center gap-1">
                <span className="text-emerald-400">✓</span>
                <span>PI NET INTEGRATION</span>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Interactive Passport Card Showcase */}
          <div className="md:col-span-5 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="w-full relative"
            >
              {/* Outer halo background decoration */}
              <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-500/10 via-electric-blue/10 to-axiom-purple/10 rounded-[36px] filter blur-xl opacity-70 animate-pulse pointer-events-none" style={{ animationDuration: '6s' }} />
              
              <InteractivePassportCard 
                user={user ? {
                  piUsername: user.piUsername,
                  walletAddress: user.walletAddress,
                  tier: user.tier,
                  xp: user.xp,
                  trustScore: user.trustScore,
                  kyaStatus: user.kycStatus ? "verified" : "pending",
                  kycStatus: user.kycStatus ? "verified" : "pending"
                } : {
                  piUsername: "Pioneer.Axiom",
                  walletAddress: "pi:GD5T...A77X",
                  tier: "Sovereign",
                  xp: 1250,
                  trustScore: 98,
                  kyaStatus: "verified",
                  kycStatus: "verified"
                }}
              />
            </motion.div>
          </div>

        </div>
      </div>

      {/* Live Stats Bar */}
      <div ref={statsRef} className="w-full max-w-6xl px-4 sm:px-6 mt-12 sm:mt-16 z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={statsInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 sm:px-6 bento-card"
        >
          {[
            { label: t("stat_users"), value: networkStats?.users ?? 0, icon: <Users className="w-5 h-5" /> },
            { label: t("stat_agents"), value: networkStats?.agents ?? 0, icon: <Bot className="w-5 h-5" /> },
            { label: t("total_xp"), value: networkStats?.xp ?? 0, icon: <Ticket className="w-5 h-5" /> },
            { label: t("stat_tx"), value: networkStats?.payments ?? 0, icon: <Zap className="w-5 h-5" /> },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={statsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.5 }}
              className="text-center md:text-left md:border-r last:border-0 md:px-4 flex flex-col md:flex-row md:items-center gap-3"
              style={{ borderColor: 'var(--card-border)' }}
            >
              <span className="hidden md:inline" style={{ color: 'var(--text-muted)' }}>{stat.icon}</span>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
                <h4 className="text-lg md:text-xl font-bold font-mono mt-0.5" style={{ color: 'var(--text-primary)' }}>
                  {statsInView ? <AnimatedCounter target={stat.value} duration={1200} /> : "—"}
                </h4>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Features Section */}
      <div className="w-full max-w-6xl px-4 sm:px-6 mt-16 sm:mt-24 z-10">
        <SectionHeader
          label={language === "en" ? "How It Works" : "كيف يعمل النظام؟"}
          title={language === "en" ? "Three Steps to Agent Identity" : "ثلاث خطوات لبناء هوية العميل"}
          labelColor="text-blue-500"
        />
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
        >
          {[
            {
              step: "01",
              title: language === "en" ? "Connect" : "الاتصال",
              desc: language === "en" ? "Link your Pi wallet or any Stellar address. Your identity starts here." : "اربط محفظتك للبدء فورا في تأسيس هويتك الرقمية.",
              icon: <Fingerprint className="w-6 h-6" />,
              badge: "W3C DID Standard",
            },
            {
              step: "02",
              title: language === "en" ? "Verify" : "التحقق",
              desc: language === "en" ? "Complete KYA + KYC. Build trust through social actions and on-chain activity." : "أكمل خطوات التوثيق (KYA) واربح طوابع الهوية الرقمية.",
              icon: <Shield className="w-6 h-6" />,
              badge: "ZKP Privacy Ready",
            },
            {
              step: "03",
              title: language === "en" ? "Deploy" : "التشغيل",
              desc: language === "en" ? "Your Agent Passport is ready. Use it across the Pi ecosystem with Pi token payments only." : "جواز سفر العميل الخاص بك جاهز للاستخدام في نظام Pi البيئي مع مدفوعات Pi فقط.",
              icon: <Zap className="w-6 h-6" />,
              badge: "Pi Network Compatible",
            },
          ].map((item) => (
            <motion.div
              key={item.step}
              variants={fadeUp}
              custom={0}
              className="stitch-feature-card flex flex-col gap-4 cursor-default group"
            >
              {/* Icon container */}
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--color-primary)' }}>
                {item.icon}
              </div>

              {/* Step + Title */}
              <div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
              </div>

              {/* Description */}
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.desc}</p>

              {/* Protocol badge */}
              <div className="mt-auto pt-4 border-t flex items-center gap-2" style={{ borderColor: 'var(--card-border)' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-primary)' }} />
                <span className="text-[11px] font-medium tracking-wide" style={{ color: 'var(--text-secondary)' }}>{item.badge}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Why AxiomID? Section */}
      <div className="w-full max-w-6xl px-4 sm:px-6 mt-16 sm:mt-24 z-10">
        <SectionHeader
          label={language === "en" ? "The Sovereign Advantage" : "الميزة السيادية"}
          title={language === "en" ? "Why Choose AxiomID?" : "لماذا تختار AxiomID؟"}
          labelColor="text-white/60"
        />
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Traditional Identity */}
          <motion.div variants={fadeUp} custom={0} className="bento-card p-6 border border-red-500/10 bg-red-500/[0.01] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <h3 className="text-base font-bold text-red-400 font-mono">{language === "en" ? "Traditional Identity (Web2)" : "الهوية التقليدية (Web2)"}</h3>
              </div>
              <ul className="space-y-3.5 text-xs text-subtle font-mono">
                {[
                  language === "en" ? "Siloed data: Your profiles are owned by third-party platforms." : "بيانات معزولة: ملفاتك الشخصية مملوكة لمنصات خارجية.",
                  language === "en" ? "High friction: Repeated manual KYC checks for every app." : "خطوات معقدة: فحوصات KYC متكررة لكل تطبيق.",
                  language === "en" ? "Vulnerable: Easy spoofing of digital identities and usernames." : "سهل الاختراق: انتحال سهل للهويات الرقمية وأسماء المستخدمين.",
                  language === "en" ? "No AI integration: Machine agents cannot prove their authority." : "لا تكامل مع الذكاء الاصطناعي: لا يمكن للعملاء الآليين إثبات هويتهم.",
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-red-500/70">✗</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-white/5 pt-4 mt-6 text-[10px] text-faint font-mono">
              {language === "en" ? "Result: Fragile security, high friction, no agent trust." : "النتيجة: أمان هش، خطوات معقدة، غياب للثقة."}
            </div>
          </motion.div>

          {/* AxiomID */}
          <motion.div variants={fadeUp} custom={1} className="bento-card p-6 flex flex-col justify-between" style={{ borderColor: 'rgba(59, 130, 246, 0.2)', background: 'rgba(59, 130, 246, 0.02)' }}>
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg" style={{ color: '#22c55e' }}>✓</span>
                <h3 className="text-base font-bold font-mono" style={{ color: '#22c55e' }}>{language === "en" ? "AxiomID Stamps Passport" : "جواز سفر طوابع AxiomID"}</h3>
              </div>
              <ul className="space-y-3.5 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                {[
                  language === "en" ? "Decentralized: You own your credentials via W3C DIDs." : "لامركزي: أنت تمتلك بياناتك عبر W3C DIDs.",
                  language === "en" ? "Verify once, prove everywhere: Single dashboard for all stamps." : "تحقق مرة، أثبت في كل مكان: لوحة تحكم واحدة لجميع طوابعك.",
                  language === "en" ? "Cryptographic security: Trust Score verified on-chain." : "حماية تشفيرية: نقاط الثقة موثقة ومعتمدة رياضياً.",
                  language === "en" ? "Agent-native: Built for AI agents to represent you securely." : "مصمم للذكاء الاصطناعي: يمثلك عميلك الآلي بأمان.",
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span style={{ color: '#22c55e' }}>✓</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t pt-4 mt-6 text-[10px] font-mono" style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
              {language === "en" ? "Result: Frictionless auth, resilient trust, delegation-ready." : "النتيجة: مصادقة خالية من الاحتكاك، ثقة مرنة، تفويض آمن."}
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Tiers Section */}
      <div className="w-full max-w-6xl px-4 sm:px-6 mt-16 sm:mt-24 z-10">
        <SectionHeader
          label={t("tier")}
          title={language === "en" ? "Level Up Your Identity" : "ارفع مستوى هويتك الرقمية"}
          labelColor="text-blue-500"
        />
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { name: t("visitor"), xp: "0", desc: language === "en" ? "Connect wallet" : "اربط محفظتك", tier: "V" },
            { name: t("citizen"), xp: "100", desc: language === "en" ? "Social + actions" : "تأكيدات وحسابات اجتماعية", tier: "C" },
            { name: t("validator"), xp: "500", desc: language === "en" ? "KYC verified" : "توثيق الهوية KYC", tier: "V" },
            { name: t("sovereign"), xp: "1000", desc: language === "en" ? "Full delegation" : "تفويض كامل للذكاء الاصطناعي", tier: "S" },
          ].map((tier) => (
            <motion.div
              key={tier.name}
              variants={fadeUp}
              custom={0}
              className="stitch-feature-card text-center cursor-default group"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-lg mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--color-primary)' }}>
                <span className="font-bold text-lg">{tier.tier}</span>
              </div>
              {/* Title */}
              <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{tier.name}</h4>
              {/* Description */}
              <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{tier.desc}</p>
              {/* XP */}
              <span className="text-[11px] font-mono mt-2 block" style={{ color: 'var(--color-primary)' }}>{tier.xp} XP</span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-center mt-16 sm:mt-24 py-8 border-t text-[10px] font-mono z-10 gap-4"
        style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}
      >
        <div>&copy; 2026 AxiomID. All rights reserved.</div>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/explorer" className="hover:text-surface transition-colors">{t("nav_explorer")}</Link>
          <Link href="/docs" className="hover:text-surface transition-colors">{t("nav_docs")}</Link>
          <Link href="/about" className="hover:text-surface transition-colors">{t("nav_about")}</Link>
          <Link href="/leaderboard" className="hover:text-surface transition-colors">{t("nav_leaderboard")}</Link>
          <Link href="/status" className="hover:text-surface transition-colors">{t("nav_status")}</Link>
          <Link href="/privacy" className="hover:text-surface transition-colors">{t("nav_privacy")}</Link>
          <Link href="/terms" className="hover:text-surface transition-colors">{t("nav_terms")}</Link>
          <span className="text-faint">1.0.0</span>
        </div>
      </motion.footer>
    </main>
  );
}

/**
 * Renders an animated section header that fades in when scrolled into view.
 *
 * @param label - Small uppercase label text displayed above the title
 * @param title - Main heading text
 * @param labelColor - CSS class name(s) applied to the label for styling
 */
function SectionHeader({ label, title, labelColor }: { label: string; title: string; labelColor: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5 }}
      className="text-center mb-10 sm:mb-12"
    >
      <span className={`text-[10px] font-mono ${labelColor} tracking-widest uppercase`}>{label}</span>
      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-surface mt-2">{title}</h2>
    </motion.div>
  );
}
