"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      toast.success("AxiomID installed successfully!");
    }
    
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="install-pwa-cta"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-xs px-4"
        >
          <div className="bg-black/60 backdrop-blur-xl border border-glass-hover p-3 rounded-2xl flex items-center justify-between shadow-2xl ring-1 ring-electric-blue/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-electric-blue/20 rounded-lg">
                <Sparkles className="w-4 h-4 text-electric-blue" />
              </div>
              <div>
                <p className="text-xs font-medium text-white">Install AxiomID</p>
                <p className="text-[10px] text-white/40 font-mono">Sovereign Experience</p>
              </div>
            </div>
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-white text-black text-[11px] font-bold rounded-lg hover:bg-electric-blue hover:text-white transition-colors"
            >
              Install
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
