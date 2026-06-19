"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "../context/wallet-context";
import { useLanguage } from "../context/language-context";
import LanguageToggle from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, Wallet, ShieldCheck, CheckCircle2, ChevronRight, Zap } from "lucide-react";
import InteractivePassportCard from "@/components/ui/InteractivePassportCard";
import { motion, AnimatePresence } from "framer-motion";

export default function OnboardingPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { user, connectWallet, isConnecting, createAgent, isPiBrowser } = useWallet();

  const [step, setStep] = useState(1);
  const [agentName, setAgentName] = useState("");
  const [creatingAgent, setCreatingAgent] = useState(false);

  const handleNextStep = () => {
    setStep((prev) => prev + 1);
  };

  const handleBackStep = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleCreateAgent = async () => {
    setCreatingAgent(true);
    try {
      const ok = await createAgent(agentName || "Axiom Pioneer Agent");
      if (ok) {
        handleNextStep();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingAgent(false);
    }
  };

  const currentStepInfo = () => {
    switch (step) {
      case 1:
        return {
          title: language === "en" ? "Link Sovereign Key" : "ربط المفتاح السيادي",
          desc: language === "en" ? "Establish authorization link via Stellar or Pi Network protocol key." : "أسس تفويض الهوية الرقمية عبر مفتاح شبكة Pi أو Stellar.",
        };
      case 2:
        return {
          title: language === "en" ? "Configure Your Agent" : "إعداد العميل الذكي",
          desc: language === "en" ? "Give your autonomous agent representative a custom profile label." : "امنح عميلك الآلي المستقل اسماً مميزاً للتعريف.",
        };
      case 3:
        return {
          title: language === "en" ? "Anchor Trust Status" : "توثيق الهوية والربط",
          desc: language === "en" ? "Acquire W3C social credentials and complete the basic human oracle verifications." : "اربح بيانات الاعتماد ومستندات DID لتأكيد هويتك.",
        };
      default:
        return {
          title: language === "en" ? "Identity Provisioned" : "تم إصدار جواز السفر",
          desc: language === "en" ? "Your decentralized agent passport is fully anchored on the registry." : "جواز سفر العميل اللامركزي الخاص بك نشط ومسجل بالكامل.",
        };
    }
  };

  return (
    <main className="min-h-screen bg-grid relative pb-10 flex flex-col justify-between">
      <div className="scanline" />

      {/* Header */}
      <header className="w-full flex justify-between items-center p-4 md:p-6 max-w-6xl mx-auto relative z-10">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded bg-neon-green/20 flex items-center justify-center border border-neon-green/50 group-hover:bg-neon-green/30 transition-all">
            <span className="text-neon-green font-bold text-sm">A</span>
          </div>
          <span className="font-mono text-lg tracking-tighter text-white">
            AXIOM<span className="text-zinc-500">ID</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <ThemeToggle />
          <Link href="/" className="btn-ghost text-xs font-mono px-3 py-1.5 flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            {language === "en" ? "BACK" : "عودة"}
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-5xl w-full mx-auto px-4 relative z-10 flex-1 flex items-center justify-center py-6">
        <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          
          {/* Left Side: Step Guide */}
          <div className="md:col-span-6 space-y-6">
            <div>
              <span className="text-[10px] font-mono text-electric-blue uppercase tracking-widest block mb-2 font-bold">
                STEP {step} OF 4
              </span>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white transition-all duration-300">
                {currentStepInfo().title}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                {currentStepInfo().desc}
              </p>
            </div>

            {/* Stepper Progress bar */}
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div 
                  key={i} 
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    i <= step ? "bg-electric-blue" : "bg-white/5"
                  }`} 
                />
              ))}
            </div>

            {/* Wizard Steps Details */}
            <div className="bento-card p-6 bg-[#101217]/65 min-h-[160px] flex flex-col justify-between">
              
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    key="step-1-details"
                    className="space-y-4"
                  >
                    <p className="text-xs text-zinc-500 font-mono">
                      Authorize access to fetch metadata: user identifier, wallet keys, and active nodes settings.
                    </p>
                    {user ? (
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Wallet connected successfully.</span>
                      </div>
                    ) : (
                      <button onClick={connectWallet} disabled={isConnecting} className="btn-primary w-full py-3 text-xs font-mono font-bold flex items-center justify-center gap-2">
                        {isConnecting ? "CONNECTING..." : "CONNECT WALLET"}
                        <Wallet className="w-4 h-4" />
                      </button>
                    )}
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    key="step-2-details"
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono text-zinc-500 uppercase block">Agent Representative Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Sentinel-1"
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-white focus:outline-none focus:border-electric-blue/30"
                      />
                    </div>
                    <button 
                      onClick={handleCreateAgent} 
                      disabled={creatingAgent || !agentName} 
                      className="btn-primary w-full py-3 text-xs font-mono font-bold flex items-center justify-center gap-2"
                    >
                      {creatingAgent ? "PROVISIONING AGENT..." : "PROVISION AGENT"}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    key="step-3-details"
                    className="space-y-4"
                  >
                    <p className="text-xs text-zinc-500 font-mono">
                      Acquiring the basic credential stamp validates KYA parameters directly to secure trust delegation limits.
                    </p>
                    <div className="flex items-center gap-2 text-amber-400 text-xs font-mono bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                      <ShieldCheck className="w-4 h-4 animate-pulse" />
                      <span>Sovereign DID resolution verified. ready to seal.</span>
                    </div>
                    <button onClick={handleNextStep} className="btn-primary w-full py-3 text-xs font-mono font-bold flex items-center justify-center gap-2">
                      SEAL PASSPORT DATA
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}

                {step === 4 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    key="step-4-details"
                    className="space-y-4"
                  >
                    <p className="text-xs text-zinc-500 font-mono">
                      Congratulation Pioneer! Your passport profile is verified, cryptographically signed, and portable as did:axiom standard metadata.
                    </p>
                    <button onClick={() => router.push("/dashboard")} className="btn-primary w-full py-3 text-xs font-mono font-bold flex items-center justify-center gap-2">
                      ENTER DASHBOARD
                      <Zap className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Back navigation */}
              {step > 1 && step < 4 && (
                <button onClick={handleBackStep} className="text-zinc-500 hover:text-white transition-colors text-[10px] font-mono mt-4 flex items-center gap-1">
                  ← BACK
                </button>
              )}
            </div>
          </div>

          {/* Right Side: Passport Preview */}
          <div className="md:col-span-6 flex items-center justify-center relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-500/5 via-electric-blue/5 to-axiom-purple/5 rounded-[36px] filter blur-xl opacity-60 pointer-events-none" />
            <InteractivePassportCard
              readonly
              user={user ? {
                piUsername: user.piUsername,
                walletAddress: user.walletAddress,
                tier: user.tier,
                xp: user.xp,
                trustScore: user.trustScore,
                kyaStatus: user.kycStatus ? "verified" : "pending",
                kycStatus: user.kycStatus ? "verified" : "pending"
              } : null}
              locked={step === 1 && !user}
            />
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="w-full text-center text-[9px] font-mono text-zinc-600 relative z-10 mt-6">
        &copy; 2026 AxiomID Protocol • Sovereign Onboarding wizard
      </footer>
    </main>
  );
}
