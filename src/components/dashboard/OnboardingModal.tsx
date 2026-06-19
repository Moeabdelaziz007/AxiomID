"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Fingerprint, Bot, Zap } from "lucide-react";
import { createUserDid } from "@/lib/did";

interface OnboardingModalProps {
  step: number;
  agentName: string;
  setAgentName: (v: string) => void;
  agentLoading: boolean;
  shouldShowPiBrowserPrompt: boolean;
  isConnecting: boolean;
  user: { agent?: { name?: string }; id: string } | null;
  onConnect: () => void;
  onCreateAgent: (name?: string) => Promise<void>;
  onSkip: () => void;
  onComplete: () => void;
  t: (key: string) => string;
}

export function OnboardingModal({
  step,
  agentName,
  setAgentName,
  agentLoading,
  shouldShowPiBrowserPrompt,
  isConnecting,
  user,
  onConnect,
  onCreateAgent,
  onSkip,
  onComplete,
  t,
}: OnboardingModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    dialogRef.current?.focus();
    return () => { previousFocusRef.current?.focus(); };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onSkip(); return; }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onSkip]);
  return (
    <motion.div
      ref={dialogRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      tabIndex={-1}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="bento-card max-w-md w-full p-6 sm:p-8 relative flex flex-col border border-white/10 shadow-2xl"
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 id="onboarding-title" className="text-xl font-bold text-white font-mono">AGENT ONBOARDING</h3>
            <p className="text-xs text-gray-400 font-mono mt-1">Step {step} of 3</p>
          </div>
          <button onClick={onSkip} className="text-gray-500 hover:text-white text-xs font-mono border border-white/5 hover:border-white/10 px-2.5 py-1 rounded">
            SKIP
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${s === step ? "bg-neon-green" : s < step ? "bg-neon-green/40" : "bg-white/10"}`} />
          ))}
        </div>

        <div className="flex-1 min-h-[200px] flex flex-col justify-between">
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center py-4 text-4xl animate-float"><Fingerprint className="w-10 h-10 mx-auto text-neon-green" /></div>
              <h4 className="text-base font-semibold text-white text-center">Connect Your Pi Wallet</h4>
              <p className="text-xs text-gray-400 text-center leading-relaxed">
                Link your secure Pi cryptographic identity to anchor your autonomous agent.
              </p>
              {shouldShowPiBrowserPrompt && (
                <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-center text-amber-200 text-xs">
                  Open in Pi Browser
                </div>
              )}
              <div className="pt-4">
                <button onClick={onConnect} disabled={isConnecting || shouldShowPiBrowserPrompt} className="btn-primary w-full py-3 text-xs tracking-wider">
                  {isConnecting ? t("connecting") : t("connect_wallet")}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center py-4 text-4xl animate-float"><Bot className="w-10 h-10 mx-auto text-axiom-purple" /></div>
              <h4 className="text-base font-semibold text-white text-center">Create Autonomous Agent</h4>
              <p className="text-xs text-gray-400 text-center leading-relaxed font-mono">
                Define the name for your autonomous gRPC agent.
              </p>
              <div className="space-y-3 pt-2">
                <label htmlFor="onboarding-agent-name" className="sr-only">Agent name</label>
                <input
                  id="onboarding-agent-name"
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="Agent name (optional)"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-green/40 font-mono"
                />
                <button onClick={() => onCreateAgent(agentName)} disabled={agentLoading} className="btn-primary w-full py-3 text-xs tracking-wider">
                  {agentLoading ? "CREATING AGENT..." : "CREATE AGENT"}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center py-4 text-4xl animate-float"><Zap className="w-10 h-10 mx-auto text-electric-blue" /></div>
              <h4 className="text-base font-semibold text-white text-center">Your Passport is Ready!</h4>
              <p className="text-xs text-gray-400 text-center leading-relaxed">
                Your agent identity passport has been successfully anchored.
              </p>
              {user && (
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-xs space-y-2 font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Agent:</span>
                    <span className="text-neon-green">{user.agent?.name || "AxiomBot"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">DID:</span>
                    <span className="text-electric-blue">{createUserDid(user.id).slice(0, 32)}...</span>
                  </div>
                </div>
              )}
              <div className="pt-4">
                <button onClick={onComplete} className="btn-primary w-full py-3 text-xs tracking-wider">GET STARTED</button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
