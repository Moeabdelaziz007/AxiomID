"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { WifiOff, RefreshCw, ShieldAlert } from "lucide-react";
import { useLanguage } from "@/app/context/language-context";

export default function OfflinePage() {
  const { language } = useLanguage();
  const [retryCount, setRetryCount] = useState(0);

  const t = (en: string, ar: string) => (language === "en" ? en : ar);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-surface-deep text-surface flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-electric-blue/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-neon-green/10 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center z-10"
      >
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-electric-blue/20 rounded-full blur-xl animate-pulse" />
            <div className="relative p-6 bg-black/40 border border-glass-hover rounded-full backdrop-blur-xl">
              <WifiOff className="w-12 h-12 text-electric-blue" />
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-white via-electric-blue to-neon-green bg-clip-text text-transparent">
          {t("Sovereign Connection Lost", "انقطع الاتصال السيادي")}
        </h1>
        
        <p className="text-white/50 mb-10 font-mono text-sm leading-relaxed">
          {t(
            "Your identity is secure on-chain, but your bridge to the Axiom network is temporarily offline.",
            "هويتك مؤمنة على السلسلة، ولكن جسرك إلى شبكة Axiom غير متصل مؤقتاً."
          )}
        </p>

        <div className="flex flex-col gap-4">
          <button
            onClick={handleRetry}
            className="group relative px-6 py-3 bg-white text-black font-bold rounded-xl overflow-hidden transition-all hover:scale-105 active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-electric-blue to-neon-green opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10 flex items-center justify-center gap-2 group-hover:text-white">
              <RefreshCw className={`w-4 h-4 ${retryCount > 0 ? "animate-spin" : ""}`} />
              {t("Re-establish Bridge", "إعادة إنشاء الجسر")}
            </span>
          </button>
          
          <div className="flex items-center justify-center gap-2 text-white/30 text-[10px] font-mono">
            <ShieldAlert className="w-3 h-3" />
            <span>{t("Local identity cached", "الهوية المحلية مخزنة مؤقتاً")}</span>
          </div>
        </div>
      </motion.div>

      {/* Subtle Grid Overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
    </div>
  );
}
