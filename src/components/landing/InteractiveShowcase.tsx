"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Fingerprint,
  ShieldCheck,
  Cpu,
  Terminal as TerminalIcon,
  Sparkles,
  Globe,
  Lock,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { useLanguage } from "@/app/context/language-context";

type DemoState = "did" | "stamps" | "agent";

export default function InteractiveShowcase() {
  const { language } = useLanguage();
  const t = (en: string, ar: string) => (language === "en" ? en : ar);
  const [activeState, setActiveState] = useState<DemoState>("did");
  const [trustScore, setTrustScore] = useState(0);
  const [stampsCount, setStampsCount] = useState(0);

  // Loop through showcase states
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveState((prev) => {
        if (prev === "did") return "stamps";
        if (prev === "stamps") return "agent";
        return "did";
      });
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Animate trust score counting up during "stamps" state
  useEffect(() => {
    if (activeState === "did") {
      setTrustScore(0);
      setStampsCount(0);
    } else if (activeState === "stamps") {
      // Step 1: Start at 0 stamps, 0 score
      // Step 2: 1s -> 1 stamp, 35 score
      // Step 3: 2.5s -> 2 stamps, 70 score
      // Step 4: 4s -> 3 stamps, 95 score
      const timers = [
        setTimeout(() => {
          setStampsCount(1);
          setTrustScore(35);
        }, 1200),
        setTimeout(() => {
          setStampsCount(2);
          setTrustScore(70);
        }, 2600),
        setTimeout(() => {
          setStampsCount(3);
          setTrustScore(95);
        }, 4000),
      ];
      return () => timers.forEach(clearTimeout);
    } else if (activeState === "agent") {
      setTrustScore(95);
      setStampsCount(3);
    }
  }, [activeState]);

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch pt-4">
      {/* Left Panel: State controls & Descriptions */}
      <div className="lg:col-span-5 flex flex-col justify-center space-y-4">
        <div className="space-y-1 text-center lg:text-left">
          <span className="text-[10px] font-mono text-electric-blue tracking-widest uppercase">
            {t("Interactive Demo", "عرض تفاعلي حي")}
          </span>
          <h3 className="text-2xl font-bold text-white">
            {t("Your Identity Lifecycle", "دورة حياة هويتك السيادية")}
          </h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto lg:mx-0">
            {t(
              "See how AxiomID transforms secure cryptographic keys into verifiable on-chain sovereign identity passports.",
              "شاهد كيف يحول AxiomID مفاتيح التشفير الآمنة إلى جوازات سفر رقمية مستقلة وموثقة على الشبكة."
            )}
          </p>
        </div>

        {/* State Selection List */}
        <div className="grid grid-cols-3 lg:grid-cols-1 gap-2.5 pt-2">
          {(["did", "stamps", "agent"] as DemoState[]).map((state) => {
            const isActive = activeState === state;
            const labels = {
              did: { en: "1. Cryptographic DID", ar: "١. معرف DID مشفر" },
              stamps: { en: "2. Verifiable Stamps", ar: "٢. طوابع الثقة" },
              agent: { en: "3. Sovereign Agent", ar: "٣. تفعيل العميل" },
            };
            return (
              <button
                key={state}
                onClick={() => setActiveState(state)}
                className={`flex flex-col lg:flex-row items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  isActive
                    ? "bg-electric-blue/10 border-electric-blue/30 text-white shadow-lg shadow-electric-blue/5"
                    : "bg-white/[0.02] border-white/[0.04] text-zinc-400 hover:bg-white/[0.04] hover:border-white/[0.08]"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isActive ? "bg-electric-blue text-white" : "bg-white/5 text-zinc-500"
                  }`}
                >
                  {state === "did" && <Fingerprint className="w-4 h-4" />}
                  {state === "stamps" && <ShieldCheck className="w-4 h-4" />}
                  {state === "agent" && <Cpu className="w-4 h-4" />}
                </div>
                <span className="text-xs font-semibold font-mono tracking-tight">
                  {labels[state][t("en", "ar") === "en" ? "en" : "ar"]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Panel: The Holographic Animation Container */}
      <div className="lg:col-span-7 flex items-center justify-center">
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/[0.06] bg-gradient-to-br from-white/[0.02] to-transparent shadow-2xl p-6 flex flex-col justify-between">
          
          {/* Subtle Grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#424754 1.5px, transparent 1.5px)",
              backgroundSize: "20px 20px",
            }}
          />

          {/* Glowing background gradient reflecting active state */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div
              className={`absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-20 transition-colors duration-1000 ${
                activeState === "did"
                  ? "bg-electric-blue"
                  : activeState === "stamps"
                  ? "bg-emerald-500"
                  : "bg-indigo-500"
              }`}
            />
          </div>

          {/* Header of simulated device */}
          <div className="relative z-10 flex items-center justify-between border-b border-white/[0.06] pb-3 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full animate-pulse ${
                  activeState === "did"
                    ? "bg-electric-blue"
                    : activeState === "stamps"
                    ? "bg-emerald-400"
                    : "bg-indigo-400"
                }`}
              />
              <span>AxiomID Node: Active</span>
            </div>
            <span>DID:AXIOM://SECURE_VM</span>
          </div>

          {/* Body: Conditional Rendering per State */}
          <div className="relative z-10 flex-1 flex items-center justify-center py-4 overflow-hidden">
            <AnimatePresence mode="wait">
              {activeState === "did" && (
                <motion.div
                  key="did-step"
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
                  className="flex flex-col items-center gap-4 text-center"
                >
                  <div className="relative">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
                      className="w-16 h-16 rounded-full border-2 border-dashed border-electric-blue/40 flex items-center justify-center"
                    >
                      <Fingerprint className="w-8 h-8 text-electric-blue" />
                    </motion.div>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-electric-blue/20 rounded-full border border-electric-blue flex items-center justify-center text-[8px] text-electric-blue font-bold"
                    >
                      π
                    </motion.div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-zinc-500 font-mono">
                      Generating sovereign keypair from Pi seed...
                    </p>
                    <p className="text-[10px] text-zinc-400 bg-white/5 border border-white/5 px-3 py-1.5 rounded-lg font-mono tracking-wider select-all">
                      did:axiom:pi:8a9d0f2b...58cc4372a567
                    </p>
                  </div>
                </motion.div>
              )}

              {activeState === "stamps" && (
                <motion.div
                  key="stamps-step"
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
                  className="w-full max-w-sm grid grid-cols-1 md:grid-cols-2 gap-4 items-center"
                >
                  {/* Left: Holographic Passport Preview */}
                  <div className="bento-card p-4 border border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden flex flex-col gap-2">
                    <div className="absolute -top-10 -left-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl" />
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-mono text-emerald-400 font-bold uppercase tracking-widest">
                        Axiom Passport
                      </span>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="space-y-1.5 pt-2">
                      <div className="h-1 bg-white/10 rounded overflow-hidden">
                        <motion.div
                          animate={{ width: `${trustScore}%` }}
                          transition={{ duration: 0.6 }}
                          className="h-full bg-emerald-400"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-zinc-500">Trust Score</span>
                        <span className="text-emerald-400 font-bold">{trustScore} XP</span>
                      </div>
                    </div>
                    {/* Active Stamp Icons */}
                    <div className="flex gap-1.5 pt-2">
                      <div
                        className={`w-6 h-6 rounded flex items-center justify-center transition-colors duration-300 ${
                          stampsCount >= 1 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-zinc-600 border border-white/5"
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5" />
                      </div>
                      <div
                        className={`w-6 h-6 rounded flex items-center justify-center transition-colors duration-300 ${
                          stampsCount >= 2 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-zinc-600 border border-white/5"
                        }`}
                      >
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                      <div
                        className={`w-6 h-6 rounded flex items-center justify-center transition-colors duration-300 ${
                          stampsCount >= 3 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-zinc-600 border border-white/5"
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>

                  {/* Right: Ingestion Log */}
                  <div className="flex flex-col gap-2 font-mono text-[9px] text-zinc-500">
                    <p className="text-emerald-400/80 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      KYC Verified Stamp (+35)
                    </p>
                    <p
                      className={`flex items-center gap-1.5 transition-colors duration-300 ${
                        stampsCount >= 2 ? "text-emerald-400/80" : "text-zinc-600"
                      }`}
                    >
                      <CheckCircle2
                        className={`w-3 h-3 ${stampsCount >= 2 ? "text-emerald-400" : "text-zinc-600"}`}
                      />
                      Github Sovereign Link (+35)
                    </p>
                    <p
                      className={`flex items-center gap-1.5 transition-colors duration-300 ${
                        stampsCount >= 3 ? "text-emerald-400/80" : "text-zinc-600"
                      }`}
                    >
                      <CheckCircle2
                        className={`w-3 h-3 ${stampsCount >= 3 ? "text-emerald-400" : "text-zinc-600"}`}
                      />
                      XpLedger Stake Stamp (+25)
                    </p>
                  </div>
                </motion.div>
              )}

              {activeState === "agent" && (
                <motion.div
                  key="agent-step"
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
                  className="w-full h-full flex flex-col md:flex-row gap-4 items-stretch"
                >
                  {/* Left: Glowing Activated Card */}
                  <div className="md:w-5/12 bento-card p-4 border border-indigo-500/20 bg-indigo-500/5 relative overflow-hidden flex flex-col justify-between shadow-[0_0_15px_rgba(99,102,241,0.05)]">
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                      <span className="text-[8px] font-mono text-indigo-400 font-bold uppercase tracking-widest">
                        Agent Active
                      </span>
                    </div>
                    <div className="py-4 text-center">
                      <p className="text-[10px] font-mono text-zinc-400">Trust Threshold</p>
                      <h4 className="text-2xl font-bold font-mono text-indigo-300">Level 3</h4>
                    </div>
                    <div className="text-[8px] font-mono text-zinc-500">
                      Signature Verified.
                    </div>
                  </div>

                  {/* Right: Simulated Terminal */}
                  <div className="flex-1 rounded-xl bg-black/40 border border-white/5 p-3 flex flex-col gap-1.5 font-mono text-[9px] text-zinc-400">
                    <div className="flex items-center gap-1 text-[8px] text-zinc-600 border-b border-white/5 pb-1">
                      <TerminalIcon className="w-3 h-3" />
                      <span>Console Logs</span>
                    </div>
                    <div className="space-y-1 pt-1 overflow-hidden h-[75px]">
                      <p className="text-zinc-600">{"[AxiomAgent] Booting..."}</p>
                      <p className="text-indigo-400">{"[AxiomAgent] DID: did:axiom:pi verified."}</p>
                      <p className="text-emerald-400">{"[AxiomAgent] Trust Score 95 XP matched."}</p>
                      <p className="text-white">{"[AxiomAgent] Executing workflow: deploy."}</p>
                      <p className="text-indigo-400">{"[AxiomAgent] ZK-Proof minted successfully."}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer of simulated device */}
          <div className="relative z-10 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[9px] font-mono text-zinc-500">
            <span className="hidden sm:inline">AxiomID Protocol Version 1.0.0</span>
            <div className="flex gap-4">
              <span>{t("Stamps: ", "الطوابع: ")}{stampsCount} / 6</span>
              <span>{t("Security: TLS 1.3", "الأمان: TLS 1.3")}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
