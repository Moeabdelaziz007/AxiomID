"use client";

import { useState, useEffect, useRef } from "react";
import { useWallet } from "./context/wallet-context";
import { ErrorBanner } from "@/components/ErrorBanner";
import Link from "next/link";
import { useLanguage } from "./context/language-context";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Users, Bot, Ticket, Zap, AlertTriangle, Shield, Fingerprint } from "lucide-react";
import { motion, useInView } from "framer-motion";
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

/**
 * Renders the AxiomID public landing page with wallet integration, Agent Passport card, animated hero section, live network statistics, feature guides, and identity tier cards. Supports English and Arabic.
 */
export default function Home() {
  const { user, connectWallet, isConnecting, isPiBrowser } = useWallet();
  const { t, language } = useLanguage();
  const [networkStats, setNetworkStats] = useState<{ users: number; agents: number; xp: number; payments: number } | null>(null);

  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { once: true, margin: "-80px" });

  const mainRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const main = mainRef.current;
    if (!main) return;
    const rect = main.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    main.style.setProperty("--mouse-x", `${x}px`);
    main.style.setProperty("--mouse-y", `${y}px`);
  };

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
    <main 
      ref={mainRef}
      onMouseMove={handleMouseMove}
      className="min-h-screen bg-grid flex flex-col items-center relative overflow-hidden"
    >
      <div className="scanline" />
      <ErrorBanner />

      {/* Dynamic Ambient Glow Layer */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20 transition-opacity duration-500 z-0"
        style={{
          background: `radial-gradient(800px circle at var(--mouse-x, 50vw) var(--mouse-y, 30vh), rgba(59, 130, 246, 0.15) 0%, rgba(99, 102, 241, 0.05) 50%, transparent 100%)`
        }}
      />

      {/* Header */}
      <Header showWallet />

      {/* Hero Section */}
      <div className="relative w-full max-w-6xl px-4 sm:px-6 mt-6 md:mt-16 z-10 min-h-[70vh] flex items-center">
        {/* Dot grid background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(#424754 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

        <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center py-8 relative z-10">
          
          {/* Left Column: Headline, Description, CTAs, Trust indicators */}
          <div className="md:col-span-7 flex flex-col items-center md:items-start text-center md:text-left space-y-5">
            {/* Live badge & Secure Layer badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="flex flex-wrap gap-2 justify-center md:justify-start items-center"
            >
              <span className="px-3 py-1 rounded-full text-[10px] font-mono bg-neon-green/10 text-neon-green border border-neon-green/20 uppercase tracking-widest">
                {t("hero_badge")}
              </span>
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
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] text-white"
            >
              {language === "en" ? (
                <>Your Identity, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-electric-blue to-axiom-purple animate-pulse">Sovereign.</span></>
              ) : (
                <>هويتك، <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-electric-blue to-axiom-purple animate-pulse">سيادية.</span></>
              )}
            </motion.h1>

            {/* Sub-headline / Core Vision */}
            <motion.h2
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight text-electric-blue"
            >
              {t("hero_heading")}
            </motion.h2>

            {/* Description & Protocol subtitle */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="max-w-xl text-sm sm:text-base md:text-lg leading-relaxed text-zinc-400 space-y-3"
            >
              <p>{t("hero_desc")}</p>
              <p className="text-xs font-mono text-zinc-500 border-l border-white/10 pl-3">
                {t("hero_subtitle")}
              </p>
            </motion.div>

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
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={connectWallet} 
                      disabled={isConnecting} 
                      aria-busy={isConnecting} 
                      className="btn-primary flex items-center justify-center gap-2 text-xs sm:text-sm px-6 py-3 min-h-[48px]"
                    >
                      {isConnecting ? (
                        <><span className="animate-spin">⟳</span> {t("connecting")}</>
                      ) : (
                        <>
                          {t("connect_wallet")}
                          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                        </>
                      )}
                    </motion.button>
                  ) : (
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Link href="/dashboard" prefetch={false} className="btn-primary flex items-center justify-center gap-2 text-xs sm:text-sm px-6 py-3 min-h-[48px] w-full">
                        {t("enter_dashboard")}
                        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                      </Link>
                    </motion.div>
                  )}
                </>
              ) : (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/dashboard" prefetch={false} className="btn-primary flex items-center justify-center gap-2 text-xs sm:text-sm px-6 py-3 min-h-[48px] w-full">
                    {t("enter_dashboard")}
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </Link>
                </motion.div>
              )}
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link href="/docs" className="btn-ghost flex items-center justify-center text-xs sm:text-sm px-6 py-3 min-h-[48px] w-full">
                  {language === "en" ? "Documentation" : "الوثائق التقنية"}
                </Link>
              </motion.div>
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

      {/* Live Stats Bento Grid */}
      <div ref={statsRef} className="w-full max-w-6xl px-4 sm:px-6 mt-12 sm:mt-16 z-10">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={statsInView ? "visible" : "hidden"}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { label: t("stat_users"), value: networkStats?.users ?? 0, icon: <Users className="w-5 h-5 text-electric-blue" /> },
            { label: t("stat_agents"), value: networkStats?.agents ?? 0, icon: <Bot className="w-5 h-5 text-axiom-purple" /> },
            { label: t("total_xp"), value: networkStats?.xp ?? 0, icon: <Ticket className="w-5 h-5 text-emerald-400" /> },
            { label: t("stat_tx"), value: networkStats?.payments ?? 0, icon: <Zap className="w-5 h-5 text-amber-400" /> },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              variants={fadeUp}
              custom={i}
              className="p-5 bento-card flex flex-col justify-between relative group overflow-hidden transition-all duration-300 hover:border-electric-blue/30 hover:shadow-lg hover:shadow-electric-blue/[0.02] min-h-[110px]"
            >
              {/* Card border glow decoration */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.01] to-white/[0.04] opacity-50 group-hover:opacity-100 transition-opacity" />
              <div className="flex justify-between items-start z-10">
                <span className="p-2 rounded-lg bg-white/5 border border-white/10 group-hover:border-electric-blue/20 transition-all duration-300">{stat.icon}</span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{stat.label}</span>
              </div>
              <div className="mt-4 z-10">
                <h4 className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
                  {statsInView ? <AnimatedCounter target={stat.value} duration={1400} /> : "—"}
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
          labelColor="text-electric-blue"
        />
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 relative"
        >
          {/* Connector line behind cards in desktop layout */}
          <div className="hidden md:block absolute top-24 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent z-0" />

          {[
            {
              step: "01",
              title: language === "en" ? "Connect" : "الاتصال",
              desc: language === "en" ? "Link your Pi wallet or any Stellar address. Your identity starts here." : "اربط محفظتك للبدء فورا في تأسيس هويتك الرقمية.",
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
          ].map((item, i) => (
            <motion.div
              key={item.step}
              variants={fadeUp}
              custom={i}
              className="stitch-feature-card flex flex-col gap-4 cursor-default group relative z-10"
            >
              {/* Highlight number */}
              <div className="absolute top-4 right-4 text-3xl font-mono font-bold text-white/5 group-hover:text-electric-blue/5 transition-colors">{item.step}</div>

              {/* Icon container */}
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 group-hover:border-electric-blue/20 transition-all duration-300">
                {item.icon}
              </div>

              {/* Title */}
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-electric-blue transition-colors duration-300">{item.title}</h3>
              </div>

              {/* Description */}
              <p className="text-sm leading-relaxed text-zinc-400">{item.desc}</p>

              {/* Protocol badge */}
              <div className="mt-auto pt-4 border-t border-white/5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-electric-blue animate-pulse" />
                <span className="text-[11px] font-mono text-zinc-500">{item.badge}</span>
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
          labelColor="text-zinc-500"
        />
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Traditional Identity */}
          <motion.div 
            variants={fadeUp} 
            custom={0} 
            className="p-6 rounded-3xl border border-red-500/10 bg-[#0f0a0d]/40 backdrop-blur-md flex flex-col justify-between min-h-[300px]"
          >
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
          </motion.div>

          {/* AxiomID */}
          <motion.div 
            variants={fadeUp} 
            custom={1} 
            className="p-6 rounded-3xl border border-emerald-500/20 bg-[#07130e]/40 backdrop-blur-md flex flex-col justify-between min-h-[300px] shadow-lg shadow-emerald-500/[0.01]"
          >
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-bold text-emerald-400 font-mono tracking-tight">{language === "en" ? "AxiomID Stamps Passport" : "جواز سفر طوابع AxiomID"}</h3>
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
          </motion.div>
        </motion.div>
      </div>

      {/* Tiers Section */}
      <div className="w-full max-w-6xl px-4 sm:px-6 mt-16 sm:mt-24 z-10">
        <SectionHeader
          label={t("tier")}
          title={language === "en" ? "Level Up Your Identity" : "ارفع مستوى هويتك الرقمية"}
          labelColor="text-electric-blue"
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
          ].map((tier, i) => (
            <motion.div
              key={tier.name}
              variants={fadeUp}
              custom={i}
              className="stitch-feature-card text-center cursor-default group"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-lg mx-auto mb-3 flex items-center justify-center bg-white/5 border border-white/10 group-hover:border-electric-blue/20 transition-all duration-300" style={{ color: 'var(--color-primary)' }}>
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
      <Footer />
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
