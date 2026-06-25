"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "../context/wallet-context";
import { useLanguage } from "../context/language-context";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Wallet, ShieldCheck, CheckCircle2, ChevronRight, Zap } from "lucide-react";
import InteractivePassportCard from "@/components/ui/InteractivePassportCard";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function OnboardingPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, connectWallet, isConnecting, createAgent } = useWallet();

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
      } else {
        toast.error(t("onboarding_agent_failed"));
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
          title: t("onboarding_step1_title"),
          desc: t("onboarding_step1_desc"),
        };
      case 2:
        return {
          title: t("onboarding_step2_title"),
          desc: t("onboarding_step2_desc"),
        };
      case 3:
        return {
          title: t("onboarding_step3_title"),
          desc: t("onboarding_step3_desc"),
        };
      default:
        return {
          title: t("onboarding_step4_title"),
          desc: t("onboarding_step4_desc"),
        };
    }
  };

  type OnboardingState = "VISITOR" | "CONNECTED" | "PARTIAL_VERIFIED" | "VERIFIED" | "PENDING_REVIEW" | "ERROR";

  const getOnboardingState = (): OnboardingState => {
    if (!user) return "VISITOR";
    if (user.kycStatus === "VERIFIED") return "VERIFIED";
    if (user.kycStatus === "PENDING" || user.kycStatus === "PENDING_REVIEW") return "PENDING_REVIEW";
    if (user.kycStatus === "PARTIAL" || user.kycStatus === "PARTIAL_VERIFIED") return "PARTIAL_VERIFIED";
    return "CONNECTED";
  };

  const stateValue = getOnboardingState();

  const stateConfigs: Record<OnboardingState, { label: string; colorClass: string }> = {
    VISITOR: { label: "VISITOR", colorClass: "text-zinc-500 border-zinc-800 bg-zinc-900/50" },
    CONNECTED: { label: "CONNECTED", colorClass: "text-blue-400 border-blue-500/20 bg-blue-500/5" },
    PARTIAL_VERIFIED: { label: "PARTIAL KYC", colorClass: "text-amber-400 border-amber-500/20 bg-amber-500/5" },
    VERIFIED: { label: "VERIFIED", colorClass: "text-green-400 border-green-500/20 bg-green-500/5" },
    PENDING_REVIEW: { label: "PENDING REVIEW", colorClass: "text-purple-400 border-purple-500/20 bg-purple-500/5" },
    ERROR: { label: "ERROR", colorClass: "text-red-400 border-red-500/20 bg-red-500/5" }
  };

  const stateConfig = stateConfigs[stateValue];

  return (
    <main className="min-h-screen bg-grid relative pb-10 flex flex-col justify-between">
      <div className="scanline" />

      {/* Header */}
      <Header showBack />

      {/* Main Content Area */}
      <div className="max-w-5xl w-full mx-auto px-4 relative z-10 flex-1 flex items-center justify-center py-6">
        <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          
          {/* Left Side: Step Guide */}
          <div className="md:col-span-6 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono text-electric-blue uppercase tracking-widest font-bold">
                  {t("onboarding_step_label").replace("{step}", String(step))}
                </span>
                <span className="text-zinc-700">•</span>
                <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border ${stateConfig.colorClass}`}>
                  STATE: {stateConfig.label}
                </span>
              </div>
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
                      {t("onboarding_connect_desc")}
                    </p>
                    {user ? (
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{t("onboarding_wallet_connected")}</span>
                      </div>
                    ) : (
                      <button onClick={connectWallet} disabled={isConnecting} className="btn-primary w-full py-3 text-xs font-mono font-bold flex items-center justify-center gap-2">
                        {isConnecting ? (
                          <span className="flex items-center gap-2">
                            <span className="animate-spin">⟳</span>
                            <span>{t("onboarding_requesting_access")}</span>
                          </span>
                        ) : (
                          <>{t("onboarding_connect_wallet_btn")}</>
                        )}
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
                      <label className="text-[10px] font-mono text-zinc-500 uppercase block">{t("onboarding_agent_name_label")}</label>
                      <input
                        type="text"
                        placeholder={t("onboarding_agent_name_placeholder")}
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
                      {creatingAgent ? t("onboarding_provisioning") : t("onboarding_provision_btn")}
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
                      {t("onboarding_seal_desc")}
                    </p>
                    <div className="flex items-center gap-2 text-amber-400 text-xs font-mono bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                      <ShieldCheck className="w-4 h-4 animate-pulse" />
                      <span>{t("onboarding_seal_verified")}</span>
                    </div>
                    <button onClick={handleNextStep} className="btn-primary w-full py-3 text-xs font-mono font-bold flex items-center justify-center gap-2">
                      {t("onboarding_seal_btn")}
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
                      {t("onboarding_congrats_desc")}
                    </p>
                    <button onClick={() => router.push("/dashboard")} className="btn-primary w-full py-3 text-xs font-mono font-bold flex items-center justify-center gap-2">
                      {t("onboarding_enter_dashboard")}
                      <Zap className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Back navigation */}
              {step > 1 && step < 4 && (
                <button onClick={handleBackStep} className="text-zinc-500 hover:text-white transition-colors text-[10px] font-mono mt-4 flex items-center gap-1">
                  {t("onboarding_back")}
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

      <Footer minimal copyright={t("onboarding_footer")} />
    </main>
  );
}
