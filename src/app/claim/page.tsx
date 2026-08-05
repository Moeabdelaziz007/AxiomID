"use client";

import { useState } from "react";
import { useWallet } from "@/app/context/wallet-context";
import { useLanguage } from "@/app/context/language-context";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { DevModeBanner } from "@/components/DevModeBanner";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { determineSandboxMode, checkPiBrowser } from "@/lib/pi-sdk";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import {
  Wallet,
  Shield,
  Rocket,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
      Globe,
} from "lucide-react";
import { ConnectStep } from "@/components/claim/ConnectStep";
import { VerifyStep } from "@/components/claim/VerifyStep";
import { DeployStep } from "@/components/claim/DeployStep";


const steps = [
  { id: 1, labelKey: "connect", icon: Wallet },
  { id: 2, labelKey: "verify", icon: Shield },
  { id: 3, labelKey: "deploy", icon: Rocket },
];

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: { ease: [0.16, 1, 0.3, 1] as const, duration: 0.5 }
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
    scale: 0.95,
    transition: { ease: [0.16, 1, 0.3, 1] as const, duration: 0.5 }
  }),
};

/**
 * Renders the identity claim wizard page.
 */
export default function ClaimPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [walletConnected, setWalletConnected] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationItems, setVerificationItems] = useState({
    kyc: false,
    payment: false,
  });
  const [verified, setVerified] = useState(false);
  const [verifiedTrustScore, setVerifiedTrustScore] = useState<number | null>(null);
  const [deployed, setDeployed] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [agentName, setAgentName] = useState("My Agent");

  const [connectError, setConnectError] = useState<string | null>(null);
  const [showBrowserModal, setShowBrowserModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const closeBrowserModal = () => { setCopied(false); setShowBrowserModal(false); };

  const { user, connectWallet, isConnecting, isPiBrowser, createAgent, activateAgent, piAccessToken, connectDemo } = useWallet();
  const { language } = useLanguage();

  const t = (en: string, ar: string) => (language === "en" ? en : ar);


  const nextStep = () => {
    if (currentStep < 3) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleConnect = async () => {
    setConnectError(null);
    const actuallyInPiBrowser = isPiBrowser || checkPiBrowser();
    if (!actuallyInPiBrowser && !determineSandboxMode()) {
      setShowBrowserModal(true);
      return;
    }
    const connected = await connectWallet();
    if (connected) {
      setWalletConnected(true);
    } else {
      setConnectError(t("Connection failed", "فشل الاتصال"));
    }
  };

  const handleDemoConnect = async () => {
    setConnectError(null);
    await connectDemo();
    setWalletConnected(true);
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      if (user?.kycStatus === "VERIFIED") {
        setVerificationItems({ kyc: true, payment: true });
        setVerifiedTrustScore(user.trustScore ?? null);
        setVerified(true);
      } else {
        const kyaRes = await fetch("/api/pi/kya/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(piAccessToken ? { Authorization: `Bearer ${piAccessToken}` } : {}),
          },
          body: JSON.stringify({ accessToken: piAccessToken }),
        });

        if (kyaRes.ok) {
          const kyaData = await kyaRes.json();

          if (kyaData.kycStatus === "VERIFIED") {
            setVerificationItems({ kyc: true, payment: true });
            if (typeof kyaData.computedTrustScore === "number") {
              setVerifiedTrustScore(kyaData.computedTrustScore);
            }
            setVerified(true);
          } else {
            setVerificationItems((prev) => ({ ...prev, kyc: true }));
          }
        }
      }
    } catch (err) {
      logger.error("Verification failed:", err);
      toast.error(t("Verification failed", "فشل التحقق"));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDeploy = async (name: string) => {
    setIsDeploying(true);
    try {
      const isDemo = user?.id === "demo-user-id";
      const created = isDemo || await createAgent(name);
      if (!created) {
        toast.error(t("Agent creation failed", "فشل إنشاء الوكيل"));
        return;
      }
      const activated = isDemo || await activateAgent();
      if (activated) {
        setDeployed(true);
        toast.success(t("Agent deployed successfully", "تم نشر وتفعيل الوكيل بنجاح"));
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#22c55e", "#3b82f6", "#6366f1", "#ffffff"],
          disableForReducedMotion: true,
        });
      } else {
        toast.error(t("Agent activation failed", "فشل تفعيل الوكيل"));
      }
    } catch (err) {
      logger.error("Deployment failed:", err);
      toast.error(t("Deployment failed", "فشل عملية النشر"));
    } finally {
      setIsDeploying(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return walletConnected || !!user?.walletAddress;
      case 2:
        return verified;
      case 3:
        return deployed;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,120,255,0.08)_0%,_transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(0,255,136,0.05)_0%,_transparent_50%)]" />

      <Header />
      <DevModeBanner />

      <main className="relative z-10 pt-28 pb-20 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">


          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl sm:text-5xl font-sans font-bold mb-3 bg-gradient-to-r from-white via-electric-blue to-neon-green bg-clip-text text-transparent">
              {t("Claim Your Identity", "احمل هويتك")}
            </h1>
            <p className="text-white/50 font-sans text-sm">
              {t(
                "Your sovereign digital passport awaits",
                "جواز سفرك الرقمي السيادي في انتظارك"
              )}
            </p>
          </motion.div>

          {/* Stepper Progress */}
           <div className="mb-4">
             <div className="flex items-center justify-between mb-2">
               <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                 {t("Step", "خطوة")} {currentStep}/3
               </span>
               <span className="text-[10px] font-mono text-white/40">
                 {Math.round((currentStep / 3) * 100)}% {t("Complete", "مكتمل")}
               </span>
             </div>
             <div className="w-full h-1.5 rounded-full bg-glass overflow-hidden p-[1px] border border-glass">
               <motion.div
                 className="h-full bg-gradient-to-r from-electric-blue via-blue-500 to-neon-green rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                 animate={{ width: `${(currentStep / 3) * 100}%` }}
                 transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
               />
             </div>
           </div>

          {/* Circle Stepper */}
          <div className="flex items-center justify-center gap-3 mb-14">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              return (
                <div key={step.id} className="flex items-center gap-3">
                  <motion.div
                    animate={{
                      scale: isActive ? 1.1 : 1,
                      borderColor: isCompleted
                        ? "rgba(0,255,136,0.6)"
                        : isActive
                          ? "rgba(0,120,255,0.6)"
                          : "rgba(255,255,255,0.1)",
                    }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                      isCompleted
                        ? "bg-neon-green/10"
                        : isActive
                          ? "bg-electric-blue/10"
                          : "bg-glass"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-neon-green" />
                    ) : (
                      <StepIcon
                        className={`w-5 h-5 ${
                          isActive ? "text-electric-blue" : "text-white/30"
                        }`}
                      />
                    )}
                  </motion.div>
                  {index < steps.length - 1 && (
                    <div className="w-12 h-0.5 rounded-full overflow-hidden bg-glass-hover">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: currentStep > step.id ? "100%" : "0%",
                        }}
                        transition={{ duration: 0.4 }}
                        className="h-full bg-gradient-to-r from-electric-blue to-neon-green"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          <div className="relative min-h-[420px]">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="w-full"
              >
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 sm:p-10 shadow-2xl shadow-black/40">

                  {/* Step 1: Connect */}
                  {currentStep === 1 && (
                    <ConnectStep
                      t={t}
                      walletConnected={walletConnected}
                      user={user}
                      handleConnect={handleConnect}
                      isConnecting={isConnecting}
                      isPiBrowser={isPiBrowser}
                      connectError={connectError}
                      onDemoConnect={handleDemoConnect}
                    />
                  )}


                  {/* Step 2: Verify */}
                  {currentStep === 2 && (
                    <VerifyStep
                      t={t}
                      verified={verified}
                      verificationItems={verificationItems}
                      handleVerify={handleVerify}
                      isVerifying={isVerifying}
                      verifiedTrustScore={verifiedTrustScore}
                      user={user}
                    />
                  )}


                  {/* Step 3: Activate Agent */}
                  {currentStep === 3 && (
                    <DeployStep
                      t={t}
                      deployed={deployed}
                      handleDeploy={handleDeploy}
                      isDeploying={isDeploying}
                      verifiedTrustScore={verifiedTrustScore}
                      user={user}
                      agentName={agentName}
                      setAgentName={setAgentName}
                    />
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* CSS Confetti */}
          {deployed && (
            <div className="pointer-events-none" aria-hidden="true">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="confetti-piece"
                  style={{
                    left: `${(i * 4.17) % 100}%`,
                    backgroundColor: ["#22c55e", "#3b82f6", "#6366f1", "#f59e0b", "#ec4899"][i % 5],
                    animationDuration: `${1.5 + (i % 5) * 0.3}s`,
                    animationDelay: `${(i % 8) * 0.08}s`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Navigation Buttons */}
          {currentStep < 3 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-between mt-8"
            >
              <button
                onClick={prevStep}
                disabled={currentStep === 1}
                className="flex items-center gap-2 font-sans text-sm text-white/40 hover:text-white/70 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                {t("Back", "رجوع")}
              </button>

              <motion.button
                whileHover={canProceed() ? { scale: 1.03 } : {}}
                whileTap={canProceed() ? { scale: 0.97 } : {}}
                onClick={nextStep}
                disabled={!canProceed()}
                className="flex items-center gap-2 font-mono text-sm font-semibold px-6 py-3 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white/[0.06] border border-white/[0.1] backdrop-blur-md text-white hover:bg-white/[0.1]"
              >
                {t("Continue", "متابعة")}
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </motion.div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {showBrowserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeBrowserModal}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            {/* Content Container */}
            <motion.div
              role="dialog"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.4 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-glass-hover bg-zinc-900/90 p-6 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Globe className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white font-sans">
                    {t("Pi Browser Required", "يتطلب متصفح Pi")}
                  </h3>
                  <p className="text-sm text-faint font-sans">
                    {t(
                      "To authenticate with the sovereign key protocol, you must access this page from inside the official Pi Browser application.",
                      "للتوثيق بمستندات الهوية السيادية، يجب عليك زيارة هذه الصفحة من داخل تطبيق متصفح Pi الرسمي."
                    )}
                  </p>
                </div>

                <div className="w-full space-y-3 pt-2">
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-black/40 border border-glass font-mono text-xs text-subtle">
                    <span className="truncate flex-1 select-all">
                      {typeof window !== "undefined" ? window.location.href : "https://www.axiomid.app/claim"}
                    </span>
                    <button
                      onClick={async () => {
                        const url = typeof window !== "undefined" ? window.location.href : "https://www.axiomid.app/claim";
                        try {
                          if (navigator.clipboard) {
                            await navigator.clipboard.writeText(url);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }
                        } catch (err) {
                          logger.error("Failed to copy link: ", err);
                        }
                      }}
                      className="p-1.5 hover:bg-glass rounded-lg text-faint hover:text-white transition-colors"
                      title={t("Copy link", "نسخ الرابط")}
                    >
                      {copied ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      )}
                    </button>
                  </div>

                  <button
                    onClick={closeBrowserModal}
                    className="w-full py-3 px-4 rounded-xl bg-glass hover:bg-glass-hover text-white font-semibold text-sm border border-glass-hover transition-colors"
                  >
                    {t("Got it", "فهمت")}
                  </button>

                  <button
                    onClick={async () => {
                      closeBrowserModal();
                      await handleDemoConnect();
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-neon-green/10 hover:bg-neon-green/20 text-neon-green font-semibold text-sm border border-neon-green/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-green focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  >
                    {t("Try Demo Mode", "تجربة وضع العرض التوضيحي")}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
