"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { motion } from "framer-motion";
import { Smartphone, Globe, Loader2, ExternalLink } from "lucide-react";
import { checkPiBrowser, determineSandboxMode } from "@/lib/pi-sdk";

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
          <Loader2 className="w-8 h-8 text-electric-blue animate-spin" />
          <p className="text-sm text-[var(--text-secondary)]">Detecting environment...</p>
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
              {isSandbox ? "Pi Sandbox" : "Pi Browser"} Connected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-neon-green/70">
              Full functionality available
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
}

interface PiBrowserPromptProps {
  onConnect?: () => void;
  onDismiss?: () => void;
  onConnectDemo?: () => void;
}

export function PiBrowserPrompt({ onConnect, onDismiss, onConnectDemo }: PiBrowserPromptProps) {
  const { isPiBrowser } = usePiBrowser();
  
  if (isPiBrowser) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-96"
    >
      <div className="bg-[var(--bg-card)] border border-[var(--card-border)] rounded-xl p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-electric-blue/10 flex items-center justify-center flex-shrink-0">
            <Globe className="w-5 h-5 text-electric-blue" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Open in Pi Browser
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              For full functionality, open this app in Pi Browser.
            </p>
            <div className="flex gap-2 mt-3 flex-wrap">
              {onConnect && (
                <button
                  onClick={onConnect}
                  className="text-xs px-3 py-1.5 rounded-lg bg-electric-blue/10 text-electric-blue border border-electric-blue/20 hover:bg-electric-blue/20 transition-colors"
                >
                  <ExternalLink className="w-3 h-3 inline mr-1" />
                  Open in Pi
                </button>
              )}
              {onConnectDemo && (
                <button
                  onClick={onConnectDemo}
                  className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-axiom-purple to-electric-blue text-white hover:opacity-90 transition-opacity"
                >
                  Demo Mode
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="text-xs px-3 py-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Continue anyway
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default PiBrowserGuard;
