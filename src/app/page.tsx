"use client";

import { Tier } from "@/lib/tiers";
import { useState, useEffect } from "react";
import { useWallet } from "./context/wallet-context";
import { ErrorBanner } from "@/components/ErrorBanner";
import Link from "next/link";
import { useLanguage } from "./context/language-context";
import LanguageToggle from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Users, Bot, Ticket, Zap, AlertTriangle, ArrowRight, Shield, Fingerprint, Globe } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { AnimatedCounter } from "@/components/AnimatedCounter";

function PassportHero({ user }: { user: { piUsername?: string | null; walletAddress?: string; tier?: Tier | null } | null }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 15;
      const y = (e.clientY / window.innerHeight - 0.5) * 15;
      setTilt({ x, y });
    };
    const handleTouch = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const x = (touch.clientX / window.innerWidth - 0.5) * 15;
        const y = (touch.clientY / window.innerHeight - 0.5) * 15;
        setTilt({ x, y });
      }
    };
    const handleTouchEnd = () => setTilt({ x: 0, y: 0 });
    window.addEventListener("mousemove", handleMouse);
    window.addEventListener("touchmove", handleTouch, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("mousemove", handleMouse);
      window.removeEventListener("touchmove", handleTouch);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  const hasUser = !!user;
  const username = user?.piUsername || (user?.walletAddress ? (user.walletAddress.startsWith("pi:") ? user.walletAddress.slice(3) : user.walletAddress) : "Connect Wallet");
  const displayAddress = user?.walletAddress ? (user.walletAddress.length > 20 ? `${user.walletAddress.slice(0, 8)}...${user.walletAddress.slice(-6)}` : user.walletAddress) : "did:axiom:...";
  const avatarText = user?.piUsername ? user.piUsername[0].toUpperCase() : (user?.walletAddress ? "\ud83d\udc64" : "?");

  return (
    <div
      className="relative w-full max-w-md mx-auto cursor-pointer"
      style={{ perspective: "1000px" }}
    >
      <div
        className="passport-card p-6 sm:p-8 flex flex-col justify-between min-h-[280px] sm:min-h-[320px]"
        style={{
          transform: `rotateY(${tilt.x * 0.3}deg) rotateX(${-tilt.y * 0.3}deg)`,
          transition: "transform 0.1s ease-out",
        }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-neon-green/20 flex items-center justify-center border border-neon-green/50">
              <span className="text-neon-green font-bold text-[9px]">A</span>
            </div>
            <span className="font-mono text-[11px] tracking-wider text-white">AXIOMID</span>
          </div>
          <span className="font-mono text-[9px] text-gray-500 tracking-widest">AGENT PASSPORT</span>
        </div>

        {/* Middle: Avatar + Info */}
        <div className="flex items-center gap-4 my-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gradient-to-br from-neon-green/20 to-electric-blue/20 border border-neon-green/30 flex items-center justify-center text-2xl sm:text-3xl font-bold font-mono text-neon-green">
            {avatarText}
          </div>
          <div className="flex-1">
            <h3 className="text-sm sm:text-base font-bold text-white font-mono">{username}</h3>
            <p className="text-[9px] sm:text-[10px] text-gray-500 font-mono mt-1 break-all">{displayAddress}</p>
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
          <div className="flex items-center gap-1.5">
            <svg viewBox="0 0 100 100" className="w-3 h-3 text-[#8B5CF6]" fill="currentColor">
              <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="5"/>
              <text x="50" y="68" textAnchor="middle" fontSize="60" fontWeight="bold" fill="currentColor" fontFamily="serif">π</text>
            </svg>
            <span className="text-[8px] text-gray-600 font-mono">AxiomID • Pi Network</span>
          </div>
          <span className="text-[8px] text-gray-600 font-mono">{user?.tier ? user.tier.toUpperCase() : "1.0.0"}</span>
        </div>
      </div>
    </div>
  );
}

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

      {process.env.NEXT_PUBLIC_PI_SANDBOX === "true" && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-[10px] font-mono tracking-wider">
          SANDBOX MODE
        </div>
      )}

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-6xl flex flex-wrap justify-between items-center gap-3 px-4 sm:px-6 py-4 sm:py-6 z-10"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-neon-green/20 flex items-center justify-center border border-neon-green/50">
              <span className="text-neon-green font-bold">A</span>
            </div>
            <span className="font-mono text-lg sm:text-xl tracking-tighter">AXIOM<span className="text-gray-600">ID</span></span>
          </div>
          <div className="w-px h-6 bg-white/10 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-[#8B5CF6]/10 border border-[#8B5CF6]/30">
            <svg viewBox="0 0 100 100" className="w-4 h-4 text-[#8B5CF6]" fill="currentColor">
              <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.3"/>
              <text x="50" y="68" textAnchor="middle" fontSize="60" fontWeight="bold" fill="currentColor" fontFamily="serif">π</text>
            </svg>
            <span className="text-[9px] font-mono text-[#8B5CF6] tracking-wider">PI NETWORK</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageToggle />
          <ThemeToggle />
          {isPiBrowser && !user && (
            <span className="hidden sm:inline text-[10px] font-mono text-electric-blue px-2 py-1 rounded-full border border-electric-blue/30 bg-electric-blue/5">
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
            <button onClick={connectWallet} disabled={isConnecting} className="btn-primary text-xs px-3 sm:px-4 py-2">
              {isConnecting ? t("connecting") : t("connect")}
            </button>
          )}
        </div>
      </motion.header>

      {/* Hero Section */}
      <div className="w-full max-w-6xl px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center mt-4 md:mt-12 z-10">
        {/* Left: Text */}
        <div className="flex flex-col gap-5">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex items-center gap-2"
          >
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neon-green/10 text-neon-green border border-neon-green/20">v1.0.0</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-electric-blue/10 text-electric-blue border border-electric-blue/20">PI COMPATIBLE</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight leading-[1.1]"
          >
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
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex items-center gap-2 text-[10px] font-mono flex-wrap"
          >
            <span className="px-2 py-0.5 rounded bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20 flex items-center gap-1">
              <svg viewBox="0 0 100 100" className="w-3 h-3" fill="currentColor">
                <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="5"/>
                <text x="50" y="68" textAnchor="middle" fontSize="60" fontWeight="bold" fill="currentColor" fontFamily="serif">π</text>
              </svg>
              {language === "en" ? "Built on Pi Network" : "مبني على شبكة Pi"}
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {language === "en" ? "Pi Token Payments Only" : "مدفوعات Pi فقط"}
            </span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="text-gray-400 max-w-md leading-relaxed text-sm md:text-base"
          >
            {t("hero_desc")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            {!user ? (
              <div className="flex flex-col sm:flex-row gap-3 mt-1">
                <button onClick={connectWallet} disabled={isConnecting} className="btn-primary flex items-center gap-3 w-fit group">
                  {isConnecting ? (
                    <><span className="animate-spin">⟳</span> {t("connecting")}</>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      {t("connect_wallet")}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
                <Link href="/dashboard" prefetch={false} className="btn-ghost w-fit text-center">
                  {t("view_demo")}
                </Link>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 mt-1">
                <Link href="/dashboard" prefetch={false} className="btn-primary flex items-center justify-center gap-2 w-fit group">
                  {t("enter_dashboard")}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <button onClick={logout} className="btn-ghost w-fit text-center">{t("logout")}</button>
              </div>
            )}
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="flex flex-wrap gap-4 mt-2 text-[10px] font-mono text-gray-500"
          >
            {[
              { icon: <Fingerprint className="w-3 h-3 text-neon-green" />, text: language === "en" ? "W3C DID Compliant" : "متوافق مع W3C DID" },
              { icon: <Globe className="w-3 h-3 text-neon-green" />, text: language === "en" ? "Stellar On-Chain" : "على الشبكة Stellar" },
              { icon: <svg viewBox="0 0 100 100" className="w-3 h-3 text-[#8B5CF6]" fill="currentColor"><circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="5"/><text x="50" y="68" textAnchor="middle" fontSize="60" fontWeight="bold" fill="currentColor" fontFamily="serif">π</text></svg>, text: language === "en" ? "Pi Network — Pi Only" : "شبكة Pi — Pi فقط" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                {item.icon}
                <span>{item.text}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right: Floating Passport */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotateY: -10 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <div className="animate-float">
            <PassportHero user={user} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-tr from-neon-green/5 to-electric-blue/5 blur-3xl rounded-full scale-150 pointer-events-none animate-pulse-slow" />
        </motion.div>
      </div>

      {/* Live Stats Bar */}
      <div ref={statsRef} className="w-full max-w-6xl px-4 sm:px-6 mt-12 sm:mt-16 z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={statsInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 sm:p-6 bento-card border border-white/5 bg-white/[0.01]"
        >
          {[
            { label: t("stat_users"), value: networkStats?.users ?? 0, icon: <Users className="w-5 h-5" />, color: "text-neon-green" },
            { label: t("stat_agents"), value: networkStats?.agents ?? 0, icon: <Bot className="w-5 h-5" />, color: "text-electric-blue" },
            { label: t("total_xp"), value: networkStats?.xp ?? 0, icon: <Ticket className="w-5 h-5" />, color: "text-axiom-purple" },
            { label: t("stat_tx"), value: networkStats?.payments ?? 0, icon: <Zap className="w-5 h-5" />, color: "text-axiom-gold" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={statsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.5 }}
              className="text-center md:text-left md:border-r border-white/5 last:border-0 md:px-4 flex flex-col md:flex-row md:items-center gap-3"
            >
              <span className="hidden md:inline">{stat.icon}</span>
              <div>
                <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">{stat.label}</p>
                <h4 className={`text-lg md:text-xl font-bold font-mono mt-0.5 ${stat.color}`}>
                  {statsInView ? <AnimatedCounter target={stat.value} duration={1200} /> : "—"}
                </h4>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Features Grid */}
      <div className="w-full max-w-6xl px-4 sm:px-6 mt-16 sm:mt-24 z-10">
        <SectionHeader
          label={language === "en" ? "How It Works" : "كيف يعمل النظام؟"}
          title={language === "en" ? "Three Steps to Agent Identity" : "ثلاث خطوات لبناء هوية العميل"}
          labelColor="text-neon-green"
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
              color: "text-neon-green",
            },
            {
              step: "02",
              title: language === "en" ? "Verify" : "التحقق",
              desc: language === "en" ? "Complete KYA + KYC. Build trust through social actions and on-chain activity." : "أكمل خطوات التوثيق (KYA) واربح طوابع الهوية الرقمية.",
              icon: <Shield className="w-6 h-6" />,
              color: "text-electric-blue",
            },
            {
              step: "03",
              title: language === "en" ? "Deploy" : "التشغيل",
              desc: language === "en" ? "Your Agent Passport is ready. Use it across the Pi ecosystem with Pi token payments only." : "جواز سفر العميل الخاص بك جاهز للاستخدام في نظام Pi البيئي مع مدفوعات Pi فقط.",
              icon: <Zap className="w-6 h-6" />,
              color: "text-axiom-purple",
            },
          ].map((item) => (
            <motion.div
              key={item.step}
              variants={fadeUp}
              custom={0}
              whileHover="hover"
              className="bento-card p-6 flex flex-col gap-4 cursor-default group"
            >
              <div className="flex items-center gap-3">
                <span className={`font-mono text-2xl font-bold ${item.color}`}>{item.step}</span>
                <div className="w-px h-6 bg-white/10" />
                <div className={`${item.color} opacity-60 group-hover:opacity-100 transition-opacity`}>{item.icon}</div>
              </div>
              <h3 className="text-lg font-bold text-white">{item.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Why AxiomID? Section */}
      <div className="w-full max-w-6xl px-4 sm:px-6 mt-16 sm:mt-24 z-10">
        <SectionHeader
          label={language === "en" ? "The Sovereign Advantage" : "الميزة السيادية"}
          title={language === "en" ? "Why Choose AxiomID?" : "لماذا تختار AxiomID؟"}
          labelColor="text-axiom-purple"
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
              <ul className="space-y-3.5 text-xs text-gray-400 font-mono">
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
            <div className="border-t border-white/5 pt-4 mt-6 text-[10px] text-gray-500 font-mono">
              {language === "en" ? "Result: Fragile security, high friction, no agent trust." : "النتيجة: أمان هش، خطوات معقدة، غياب للثقة."}
            </div>
          </motion.div>

          {/* AxiomID */}
          <motion.div variants={fadeUp} custom={1} className="bento-card p-6 border border-neon-green/20 bg-neon-green/[0.01] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-neon-green text-lg">✓</span>
                <h3 className="text-base font-bold text-neon-green font-mono">{language === "en" ? "AxiomID Stamps Passport" : "جواز سفر طوابع AxiomID"}</h3>
              </div>
              <ul className="space-y-3.5 text-xs text-gray-300 font-mono">
                {[
                  language === "en" ? "Decentralized: You own your credentials via W3C DIDs." : "لامركزي: أنت تمتلك بياناتك عبر W3C DIDs.",
                  language === "en" ? "Verify once, prove everywhere: Single dashboard for all stamps." : "تحقق مرة، أثبت في كل مكان: لوحة تحكم واحدة لجميع طوابعك.",
                  language === "en" ? "Cryptographic security: Trust Score verified on-chain." : "حماية تشفيرية: نقاط الثقة موثقة ومعتمدة رياضياً.",
                  language === "en" ? "Agent-native: Built for AI agents to represent you securely." : "مصمم للذكاء الاصطناعي: يمثلك عميلك الآلي بأمان.",
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-neon-green">✓</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-white/5 pt-4 mt-6 text-[10px] text-gray-500 font-mono">
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
            { name: t("visitor"), xp: "0", color: "#64748b", desc: language === "en" ? "Connect wallet" : "اربط محفظتك" },
            { name: t("citizen"), xp: "100", color: "#00ff41", desc: language === "en" ? "Social + actions" : "تأكيدات وحسابات اجتماعية" },
            { name: t("validator"), xp: "500", color: "#00d4ff", desc: language === "en" ? "KYC verified" : "توثيق الهوية KYC" },
            { name: t("sovereign"), xp: "1000", color: "#a855f7", desc: language === "en" ? "Full delegation" : "تفويض كامل للذكاء الاصطناعي" },
          ].map((tier) => (
            <motion.div
              key={tier.name}
              variants={fadeUp}
              custom={0}
              whileHover="hover"
              className="bento-card p-5 text-center cursor-default"
            >
              <div
                className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center border"
                style={{ borderColor: `${tier.color}40`, background: `${tier.color}10` }}
              >
                <span className="font-mono font-bold text-sm animate-pulse-slow" style={{ color: tier.color }}>
                  {tier.name[0]}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white">{tier.name}</h4>
              <p className="text-[10px] text-gray-500 mt-1">{tier.desc}</p>
              <span className="text-[10px] font-mono mt-2 block" style={{ color: tier.color }}>{tier.xp} XP</span>
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
        className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-center mt-16 sm:mt-24 py-8 border-t border-white/5 text-[10px] font-mono text-gray-500 z-10 gap-4"
      >
        <div>&copy; 2026 AxiomID. All rights reserved.</div>
        <div className="flex gap-4">
          <Link href="/status" className="hover:text-white transition-colors">{t("nav_status")}</Link>
          <Link href="/privacy" className="hover:text-white transition-colors">{t("nav_privacy")}</Link>
          <Link href="/terms" className="hover:text-white transition-colors">{t("nav_terms")}</Link>
          <span className="text-gray-600">1.0.0</span>
        </div>
      </motion.footer>
    </main>
  );
}

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
      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mt-2">{title}</h2>
    </motion.div>
  );
}
