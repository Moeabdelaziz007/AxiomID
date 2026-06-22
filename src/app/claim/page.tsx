"use client";

import { useState } from "react";
import { useWallet } from "@/app/context/wallet-context";
import { useLanguage } from "@/app/context/language-context";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  Shield,
  Rocket,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
  Lock,
  Globe,
} from "lucide-react";
import Link from "next/link";

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

export default function ClaimPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [walletConnected, setWalletConnected] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [verified, setVerified] = useState(false);
  const [deployed, setDeployed] = useState(false);
  const [xpGain, setXpGain] = useState<number | null>(null);

  const { user, connectWallet, isConnecting } = useWallet();
  const { language } = useLanguage();

  const t = (en: string, ar: string) => (language === "en" ? en : ar);

  const grantXP = (amount: number) => {
    setXpGain(amount);
    setTimeout(() => setXpGain(null), 2000);
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setDirection(1);
      grantXP(100);
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
    try {
      await connectWallet();
      setWalletConnected(true);
    } catch {
      // User declined or error
    }
  };

  const handleVerify = () => {
    setVerificationProgress(0);
    const interval = setInterval(() => {
      setVerificationProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setVerified(true);
          return 100;
        }
        return prev + 2;
      });
    }, 40);
  };

  const handleDeploy = () => {
    setTimeout(() => {
      setDeployed(true);
    }, 1500);
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

      <main className="relative z-10 pt-28 pb-20 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          {/* XP Badge */}
          <AnimatePresence>
            {xpGain && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -40, scale: 0.6 }}
                className="fixed top-24 left-1/2 -translate-x-1/2 z-50"
              >
                <div className="bg-neon-green/20 border border-neon-green/40 rounded-full px-5 py-2 backdrop-blur-xl flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-neon-green" />
                  <span className="text-neon-green font-mono font-bold text-sm">
                    +{xpGain} XP
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
                          : "bg-white/5"
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
                    <div className="w-12 h-0.5 rounded-full overflow-hidden bg-white/10">
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
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-electric-blue/10 border border-electric-blue/20 flex items-center justify-center">
                        <Wallet className="w-10 h-10 text-electric-blue" />
                      </div>
                      <h2 className="text-2xl font-sans font-bold mb-2">
                        {t("Connect Wallet", "اتصل بالمحفظة")}
                      </h2>
                      <p className="text-white/40 font-sans text-sm mb-8 max-w-sm mx-auto">
                        {t(
                          "Link your Pi Network wallet to begin your decentralized identity journey",
                          "اربط محفظة شبكة Pi لبدء رحلة هويتك اللامركزية"
                        )}
                      </p>

                      {walletConnected || user?.walletAddress ? (
                        <div className="bg-neon-green/10 border border-neon-green/20 rounded-xl p-4 mb-6">
                          <div className="flex items-center justify-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-neon-green" />
                            <span className="font-mono text-sm text-neon-green">
                              {t("Connected", "متصل")}
                            </span>
                          </div>
                          <p className="text-white/40 font-mono text-xs mt-2">
                            {user?.walletAddress
                              ? `${user.walletAddress.slice(0, 12)}...${user.walletAddress.slice(-6)}`
                              : "Connected"}
                          </p>
                        </div>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.03, transition: { ease: [0.16, 1, 0.3, 1] as const } }}
                          whileTap={{ scale: 0.97, transition: { ease: [0.16, 1, 0.3, 1] as const } }}
                          onClick={handleConnect}
                          disabled={isConnecting}
                          className="w-full max-w-sm mx-auto bg-gradient-to-r from-electric-blue to-blue-600 text-white font-sans font-semibold py-4 px-8 rounded-xl backdrop-blur-md shadow-lg shadow-electric-blue/10 border border-white/10 flex items-center justify-center gap-3 hover:shadow-lg hover:shadow-electric-blue/20 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Wallet className="w-5 h-5" />
                          {isConnecting
                            ? t("CONNECTING...", "جاري الاتصال...")
                            : t("CONNECT PI WALLET",
                            "اتصل بمحفظة PI"
                          )}
                          <ChevronRight className="w-4 h-4" />
                        </motion.button>
                      )}

                      <div className="mt-8 flex items-center justify-center gap-2 text-white/30">
                        <Lock className="w-3.5 h-3.5" />
                        <span className="font-mono text-xs">
                          {t(
                            "Non-custodial · Your keys, your identity",
                            "غير أصيل · مفاتيحك، هويتك"
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Verify */}
                  {currentStep === 2 && (
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-electric-blue/10 border border-electric-blue/20 flex items-center justify-center">
                        <Shield className="w-10 h-10 text-electric-blue" />
                      </div>
                      <h2 className="text-2xl font-sans font-bold mb-2">
                        {t("Know Your Agent", "اعرف وكيلك")}
                      </h2>
                      <p className="text-white/40 font-sans text-sm mb-8 max-w-sm mx-auto">
                        {t(
                          "Build your trust score through decentralized verification",
                          "ابنِ نقاط ثقتك من خلال التحقق اللامركزي"
                        )}
                      </p>

                      {!verified ? (
                        <div className="space-y-4">
                          {/* Trust Score Visualization */}
                          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 mb-6">
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-mono text-xs text-white/50">
                                {t("TRUST SCORE", "نقاط الثقة")}
                              </span>
                              <span className="font-mono text-lg font-bold text-electric-blue">
                                {verificationProgress}
                              </span>
                            </div>
                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-gradient-to-r from-electric-blue to-neon-green rounded-full"
                                style={{ width: `${verificationProgress}%` }}
                              />
                            </div>
                          </div>

                          {/* Verification Items */}
                          <div className="space-y-3">
                            {[
                              {
                                label: t(
                                  "Wallet Ownership",
                                  "ملكية المحفظة"
                                ),
                                threshold: 30,
                              },
                              {
                                label: t(
                                  "Network Standing",
                                  "الوضع في الشبكة"
                                ),
                                threshold: 60,
                              },
                              {
                                label: t(
                                  "Community Trust",
                                  "ثقة المجتمع"
                                ),
                                threshold: 90,
                              },
                            ].map((item) => (
                              <div
                                key={item.label}
                                className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3"
                              >
                                <div className="flex items-center gap-3">
                                  {verificationProgress >= item.threshold ? (
                                    <CheckCircle2 className="w-4 h-4 text-neon-green" />
                                  ) : (
                                    <div className="w-4 h-4 rounded-full border border-white/20" />
                                  )}
                                  <span className="font-mono text-sm text-white/70">
                                    {item.label}
                                  </span>
                                </div>
                                <span
                                  className={`font-mono text-xs ${
                                    verificationProgress >= item.threshold
                                      ? "text-neon-green"
                                      : "text-white/30"
                                  }`}
                                >
                                  {verificationProgress >= item.threshold
                                    ? t("VERIFIED", "موثق")
                                    : t("PENDING", "قيد الانتظار")}
                                </span>
                              </div>
                            ))}
                          </div>

                          <motion.button
                            whileHover={{ scale: 1.03, transition: { ease: [0.16, 1, 0.3, 1] as const } }}
                            whileTap={{ scale: 0.97, transition: { ease: [0.16, 1, 0.3, 1] as const } }}
                            onClick={handleVerify}
                            disabled={verificationProgress > 0}
                            className="w-full max-w-sm mx-auto bg-gradient-to-r from-electric-blue to-blue-600 text-white font-sans font-semibold py-4 px-8 rounded-xl backdrop-blur-md shadow-lg shadow-electric-blue/10 border border-white/10 flex items-center justify-center gap-3 hover:shadow-lg hover:shadow-electric-blue/20 transition-shadow disabled:opacity-50"
                          >
                            {verificationProgress > 0 ? (
                              <>
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{
                                    duration: 1,
                                    repeat: Infinity,
                                    ease: "linear",
                                  }}
                                >
                                  <Shield className="w-5 h-5" />
                                </motion.div>
                                {t(
                                  "VERIFYING...",
                                  "جارٍ التحقق..."
                                )}
                              </>
                            ) : (
                              <>
                                <Globe className="w-5 h-5" />
                                {t(
                                  "START KYA VERIFICATION",
                                  "بدء التحقق من KYA"
                                )}
                              </>
                            )}
                          </motion.button>
                        </div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-neon-green/10 border border-neon-green/20 rounded-xl p-6"
                        >
                          <CheckCircle2 className="w-12 h-12 text-neon-green mx-auto mb-3" />
                          <p className="font-mono text-sm text-neon-green font-bold">
                            {t(
                              "VERIFICATION COMPLETE",
                              "اكتمل التحقق"
                            )}
                          </p>
                          <p className="font-mono text-xs text-white/40 mt-1">
                            {t("Trust Score: 100", "نقاط الثقة: 100")}
                          </p>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* Step 3: Deploy */}
                  {currentStep === 3 && (
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-electric-blue/10 border border-electric-blue/20 flex items-center justify-center">
                        <Rocket className="w-10 h-10 text-electric-blue" />
                      </div>
                      <h2 className="text-2xl font-sans font-bold mb-2">
                        {t(
                          "Deploy Passport",
                          "نشر جواز السفر"
                        )}
                      </h2>
                      <p className="text-white/40 font-sans text-sm mb-8 max-w-sm mx-auto">
                        {t(
                          "Mint your sovereign agent passport on-chain",
                          "اصنع جواز سفر الوكيل السيادي على السلسلة"
                        )}
                      </p>

                      {!deployed ? (
                        <div className="space-y-6">
                          {/* Passport Preview */}
                          <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.1] rounded-2xl backdrop-blur-xl p-6 text-left relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-electric-blue/10 rounded-full blur-3xl" />
                            <div className="relative">
                              <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-electric-blue/20 flex items-center justify-center">
                                  <Rocket className="w-4 h-4 text-electric-blue" />
                                </div>
                                <span className="font-mono text-xs text-white/50">
                                  AXIOM AGENT PASSPORT
                                </span>
                              </div>
                              <div className="space-y-3">
                                <div className="flex justify-between border-b border-white/5 pb-2">
                                  <span className="font-mono text-xs text-white/40">
                                    {t("Status", "الحالة")}
                                  </span>
                                  <span className="font-mono text-xs text-neon-green">
                                    {t("READY", "جاهز")}
                                  </span>
                                </div>
                                <div className="flex justify-between border-b border-white/5 pb-2">
                                  <span className="font-mono text-xs text-white/40">
                                    {t("Trust", "الثقة")}
                                  </span>
                                  <span className="font-mono text-xs text-electric-blue">
                                    100
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="font-mono text-xs text-white/40">
                                    {t("Network", "الشبكة")}
                                  </span>
                                  <span className="font-mono text-xs text-white/60">
                                    Pi Testnet
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <motion.button
                            whileHover={{ scale: 1.03, transition: { ease: [0.16, 1, 0.3, 1] as const } }}
                            whileTap={{ scale: 0.97, transition: { ease: [0.16, 1, 0.3, 1] as const } }}
                            onClick={handleDeploy}
                            className="w-full max-w-sm mx-auto bg-gradient-to-r from-neon-green/90 to-green-500 text-black font-sans font-bold py-4 px-8 rounded-xl backdrop-blur-md shadow-lg shadow-neon-green/10 border border-white/10 flex items-center justify-center gap-3 hover:shadow-lg hover:shadow-neon-green/20 transition-shadow"
                          >
                            <Rocket className="w-5 h-5" />
                            {t(
                              "DEPLOY ON-CHAIN",
                              "نشر على السلسلة"
                            )}
                          </motion.button>
                        </div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="space-y-6"
                        >
                          <div className="bg-neon-green/10 border border-neon-green/20 rounded-2xl p-8">
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{
                                type: "spring",
                                stiffness: 200,
                                damping: 10,
                              }}
                            >
                              <CheckCircle2 className="w-16 h-16 text-neon-green mx-auto mb-4" />
                            </motion.div>
                            <h3 className="font-mono text-lg font-bold text-neon-green mb-2">
                              {t(
                                "PASSPORT DEPLOYED",
                                "تم نشر جواز السفر"
                              )}
                            </h3>
                            <p className="font-mono text-sm text-white/50">
                              {t(
                                "Your sovereign identity is now on-chain",
                                "هويتك السيادية الآن على السلسلة"
                              )}
                            </p>
                          </div>

                          <Link href="/dashboard">
                            <motion.button
                              whileHover={{ scale: 1.03, transition: { ease: [0.16, 1, 0.3, 1] as const } }}
                              whileTap={{ scale: 0.97, transition: { ease: [0.16, 1, 0.3, 1] as const } }}
                              className="w-full max-w-sm mx-auto bg-gradient-to-r from-electric-blue to-blue-600 text-white font-sans font-bold py-4 px-8 rounded-xl backdrop-blur-md shadow-lg shadow-electric-blue/10 border border-white/10 flex items-center justify-center gap-3 hover:shadow-lg hover:shadow-electric-blue/20 transition-shadow"
                            >
                              {t(
                                "ENTER DASHBOARD",
                                "الدخول إلى لوحة التحكم"
                              )}
                              <ChevronRight className="w-5 h-5" />
                            </motion.button>
                          </Link>
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

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

            <Footer />
    </div>
  );
}
