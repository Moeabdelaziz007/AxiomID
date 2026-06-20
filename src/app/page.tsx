"use client";

import { useState, useEffect, useRef } from "react";
import { useWallet } from "./context/wallet-context";
import { ErrorBanner } from "@/components/ErrorBanner";
import Link from "next/link";
import { useLanguage } from "./context/language-context";
import LanguageToggle from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Users, Bot, Ticket, Zap, AlertTriangle, Shield, Fingerprint } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { AnimatedCounter } from "@/components/AnimatedCounter";

const PiSvg = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor" aria-hidden="true">
    <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.3"/>
    <text x="50" y="68" textAnchor="middle" fontSize="60" fontWeight="bold" fill="currentColor" fontFamily="serif">π</text>
  </svg>
);

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
    <main id="main-content" className="min-h-screen bg-grid flex flex-col items-center relative overflow-hidden">
      <div className="scanline" />
      <ErrorBanner />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 w-full max-w-6xl flex flex-wrap justify-between items-center gap-3 px-4 sm:px-6 py-4 sm:py-6 z-50 bg-grid/80 backdrop-blur-xl"
        role="banner"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/" className="flex items-center gap-2" aria-label="AxiomID Home">
            <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: 'var(--color-primary)' }}>
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-mono text-lg sm:text-xl tracking-tighter" style={{ color: 'var(--text-primary)' }}>AXIOM<span style={{ color: 'var(--text-muted)' }}>ID</span></span>
          </Link>
          <div className="w-px h-6 bg-white/10 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/10">
            <PiSvg className="w-4 h-4" />
            <span className="text-[9px] font-mono tracking-wider" style={{ color: 'var(--text-secondary)' }}>PI NETWORK</span>
          </div>
        </div>

        {/* Nav links — hidden on small screens, visible md+ */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
          <Link href="/status" className="text-[11px] font-mono tracking-wider" style={{ color: 'var(--text-muted)' }}>{t("nav_status")}</Link>
          <Link href="/privacy" className="text-[11px] font-mono tracking-wider" style={{ color: 'var(--text-muted)' }}>{t("nav_privacy")}</Link>
          <Link href="/terms" className="text-[11px] font-mono tracking-wider" style={{ color: 'var(--text-muted)' }}>{t("nav_terms")}</Link>
        </nav>

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
              <button onClick={() => logout()} aria-label={t("logout")} className="btn-ghost text-xs px-3 py-1.5 hidden sm:flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {t("logout")}
              </button>
            </div>
          ) : (
            <button onClick={connectWallet} disabled={isConnecting} aria-busy={isConnecting} aria-label={isConnecting ? t("connecting") : t("connect")} className="btn-primary text-xs px-3 sm:px-4 py-2">
              {isConnecting ? t("connecting") : t("connect")}
            </button>
          )}
        </div>
      </motion.header>

      {/* Hero Section */}
      <div className="relative w-full max-w-6xl px-4 sm:px-6 mt-4 md:mt-12 z-10 min-h-[70vh] flex flex-col justify-center items-center text-center">
        {/* Dot grid background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(#424754 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

        <div className="max-w-4xl mx-auto space-y-4 relative z-10 py-8">
          {/* Live badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <span className="stitch-badge">
              <PiSvg className="w-4 h-4" />
              {language === "en" ? "Live on Pi Network Mainnet" : "مباشر على شبكة Pi الرئيسية"}
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]"
            style={{ color: 'var(--text-primary)' }}
            aria-label={language === "en" ? "Your Identity, Sovereign." : "هويتك، سيادية."}
          >
            {language === "en" ? (
              <>Your Identity, <span className="text-blue-500">Sovereign.</span></>
            ) : (
              <>هويتك، <span className="text-blue-500">سيادية.</span></>
            )}
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="max-w-2xl mx-auto text-base md:text-lg leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            {t("hero_desc")}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
          >
            {!user ? (
              <button onClick={connectWallet} disabled={isConnecting} aria-busy={isConnecting} className="btn-primary flex items-center justify-center gap-2 text-sm px-6 py-3 min-h-[48px]">
                {isConnecting ? (
                  <><span className="animate-spin">⟳</span> {t("connecting")}</>
                ) : (
                  <>
                    {t("connect_wallet")}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </>
                )}
              </button>
            ) : (
              <Link href="/dashboard" prefetch={false} className="btn-primary flex items-center justify-center gap-2 text-sm px-6 py-3 min-h-[48px]">
                {t("enter_dashboard")}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
            )}
            <Link href="/status" className="btn-ghost flex items-center justify-center text-sm px-6 py-3 min-h-[48px]">
              {language === "en" ? "View Docs" : "عرض التوثيق"}
            </Link>
          </motion.div>
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
          labelColor="text-subtle"
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

      {/* Trust Indicators */}
      <div className="w-full max-w-6xl px-4 sm:px-6 mt-16 sm:mt-24 z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bento-card p-6 sm:px-8 text-center"
        >
          <p className="text-[10px] font-mono uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
            {language === "en" ? "Built on Open Standards" : "مبني على معايير مفتوحة"}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {[
              { label: "W3C DID", desc: "Decentralized Identifiers" },
              { label: "W3C VC", desc: "Verifiable Credentials" },
              { label: "Pi Network", desc: "Blockchain Layer" },
              { label: "DIF", desc: "Interop Framework" },
              { label: "ZK Proofs", desc: "Privacy Preserving" },
            ].map(({ label, desc }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <span className="text-xs font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{label}</span>
                <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>{desc}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--card-border)' }}>
            <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
              {language === "en"
                ? "W3C Member — Contributing to the Decentralized Identity Working Group"
                : "عضو في W3C — مساهم في مجموعة عمل الهوية اللامركزية"}
            </span>
          </div>
        </motion.div>
      </div>

      {/* FAQ Section */}
      <div className="w-full max-w-6xl px-4 sm:px-6 mt-16 sm:mt-24 z-10">
        <SectionHeader
          label={language === "en" ? "FAQ" : "أسئلة شائعة"}
          title={language === "en" ? "Common Questions" : "أسئلة متكررة"}
          labelColor="text-blue-500"
        />
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="max-w-3xl mx-auto space-y-4"
        >
          {[
            {
              q: language === "en" ? "What is a Decentralized Identifier (DID)?" : "ما هو المعرف اللامركزي (DID)؟",
              a: language === "en"
                ? "A DID is a globally unique, cryptographically verifiable identifier that you control entirely — no platform, no registrar, no central authority. Your AxiomID DID resolves to a signed document containing your public keys, service endpoints, and credential proofs."
                : "المعرف اللامركزي (DID) هو معرف عالمي فريد يمكن التحقق منه تشفيرياً وتتحكم فيه أنت بالكامل — لا منصة ولا مسجل ولا سلطة مركزية.",
            },
            {
              q: language === "en" ? "How does KYA differ from KYC?" : "ما الفرق بين KYA و KYC؟",
              a: language === "en"
                ? "KYA (Know Your Agent) extends KYC to the AI era. While KYC verifies human identity (passport, utility bill), KYA verifies what an AI agent is authorized to do on your behalf — its scope, spending limits, delegation chain, and revocation status. Both are required for full Sovereign tier access."
                : "KYA (اعرف عميلك الآلي) يوسع مفهوم KYC لعصر الذكاء الاصطناعي. بينما يتحقق KYC من هوية الإنسان، يتحقق KYA من صلاحيات العميل الآلي.",
            },
            {
              q: language === "en" ? "Can I use AxiomID without Pi Network?" : "هل يمكنني استخدام AxiomID بدون شبكة Pi؟",
              a: language === "en"
                ? "Currently, wallet connection requires the Pi Browser. However, our Stellar-based DID layer is designed for multi-chain support. Future releases will expand to other Stellar-compatible networks."
                : "حالياً، يتطلب الاتصال بالمحفظة متصفح Pi. لكن طبقة DID الخاصة بنا مصممة لدعم سلاسل متعددة في المستقبل.",
            },
            {
              q: language === "en" ? "What happens if I lose access to my wallet?" : "ماذا يحدث إذا فقدت الوصول إلى محفظتي؟",
              a: language === "en"
                ? "Your DID document and stamps are anchored on-chain and can be recovered through your Stellar recovery mechanism. We recommend setting up a recovery wallet and exporting your DID document for offline backup."
                : "يمكن استعادة وثيقة DID والطوابع الخاصة بك من خلال آلية استرداد Stellar.",
            },
          ].map((item) => (
            <motion.details
              key={item.q}
              variants={fadeUp}
              className="bento-card p-4 cursor-pointer group"
            >
              <summary className="text-sm font-bold font-mono list-none flex items-center justify-between gap-3" style={{ color: 'var(--text-primary)' }}>
                <span>{item.q}</span>
                <span className="text-faint shrink-0 text-xs">+</span>
              </summary>
              <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.a}</p>
            </motion.details>
          ))}
        </motion.div>
      </div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-6xl mt-16 sm:mt-24 py-8 border-t z-10"
        style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-4 sm:px-6">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded flex items-center justify-center" style={{ background: 'var(--color-primary)' }}>
                <span className="text-white font-bold text-xs">A</span>
              </div>
              <span className="font-mono text-sm tracking-tighter" style={{ color: 'var(--text-primary)' }}>AXIOM<span style={{ color: 'var(--text-muted)' }}>ID</span></span>
            </div>
            <p className="text-[10px] font-mono leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {language === "en"
                ? "Sovereign identity infrastructure for humans and AI agents."
                : "بنية هوية سيادية للبشر والعملاء الآليين."}
            </p>
          </div>
          <div>
            <h4 className="text-[10px] font-bold font-mono uppercase tracking-widest mb-3" style={{ color: 'var(--text-primary)' }}>{language === "en" ? "Protocol" : "البروتوكول"}</h4>
            <div className="flex flex-col gap-2">
              <Link href="/status" className="text-[10px] font-mono hover:text-surface transition-colors">{t("nav_status")}</Link>
              <Link href="/privacy" className="text-[10px] font-mono hover:text-surface transition-colors">{t("nav_privacy")}</Link>
              <Link href="/terms" className="text-[10px] font-mono hover:text-surface transition-colors">{t("nav_terms")}</Link>
            </div>
          </div>
          <div>
            <h4 className="text-[10px] font-bold font-mono uppercase tracking-widest mb-3" style={{ color: 'var(--text-primary)' }}>{language === "en" ? "Resources" : "المصادر"}</h4>
            <div className="flex flex-col gap-2">
              <Link href="/status" className="text-[10px] font-mono hover:text-surface transition-colors">{t("nav_status")}</Link>
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{language === "en" ? "Developer Docs" : "توثيق المطورين"}</span>
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{language === "en" ? "API Reference" : "مرجع API"}</span>
            </div>
          </div>
          <div>
            <h4 className="text-[10px] font-bold font-mono uppercase tracking-widest mb-3" style={{ color: 'var(--text-primary)' }}>{language === "en" ? "Community" : "المجتمع"}</h4>
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{language === "en" ? "GitHub" : "GitHub"}</span>
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{language === "en" ? "Discord" : "Discord"}</span>
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{language === "en" ? "X / Twitter" : "X / Twitter"}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-6 pt-4 border-t px-4 sm:px-6" style={{ borderColor: 'var(--card-border)' }}>
          <div className="text-[9px] font-mono">&copy; 2026 AxiomID. {language === "en" ? "All rights reserved." : "جميع الحقوق محفوظة."}</div>
          <div className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>v1.0.0</div>
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
