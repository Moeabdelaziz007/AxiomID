"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { motion } from "framer-motion";
import { Smartphone } from "lucide-react";
import { checkPiBrowser, determineSandboxMode } from "@/lib/pi-sdk";
import { useLanguage } from "@/app/context/language-context";

interface PiBrowserContextType {
  isPiBrowser: boolean;
  isDetecting: boolean;
  isSandbox: boolean;
}

const PiBrowserContext = createContext<PiBrowserContextType>({
  isPiBrowser: false,
  isDetecting: true,
  isSandbox: false,
});

export const usePiBrowser = () => useContext(PiBrowserContext);

interface PiBrowserGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  showSplash?: boolean;
}

export function PiBrowserGuard({ 
  children, 
  fallback,
  showSplash = true 
}: PiBrowserGuardProps) {
  const [isDetecting, setIsDetecting] = useState(true);
  const [isPiBrowser, setIsPiBrowser] = useState(false);
  const [isSandbox, setIsSandbox] = useState(false);
  const { language } = useLanguage();
  const t = (en: string, ar: string) => (language === "en" ? en : ar);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPiBrowser(checkPiBrowser());
      setIsSandbox(determineSandboxMode());
      setIsDetecting(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  if (isDetecting && showSplash) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-deep)]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="animate-pulse space-y-3 w-48">
            <div className="h-4 bg-white/5 rounded w-3/4" />
            <div className="h-4 bg-white/5 rounded w-1/2" />
            <div className="h-8 bg-white/5 rounded w-full" />
          </div>
          <p className="text-sm text-[var(--text-secondary)]">{t("Detecting environment...", "جاري اكتشاف البيئة...")}</p>
        </motion.div>
      </div>
    );
  }

  if (!isPiBrowser && !isSandbox) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <PiBrowserContext.Provider value={{ isPiBrowser, isDetecting, isSandbox }}>
        {children}
      </PiBrowserContext.Provider>
    );
  }

  return (
    <PiBrowserContext.Provider value={{ isPiBrowser, isDetecting, isSandbox }}>
      {children}
    </PiBrowserContext.Provider>
  );
}

export function PiBrowserBanner() {
  const { isPiBrowser, isSandbox } = usePiBrowser();
  const { language } = useLanguage();
  const t = (en: string, ar: string) => (language === "en" ? en : ar);
  
  if (isPiBrowser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 bg-neon-green/10 border-b border-neon-green/20 px-4 py-2"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-neon-green" />
            <span className="text-xs font-mono text-neon-green">
              {isSandbox ? "Pi Sandbox" : "Pi Browser"} {t("Connected", "متصل")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-neon-green/70">
              {t("Full functionality available", "جميع الوظائف متاحة")}
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
}



