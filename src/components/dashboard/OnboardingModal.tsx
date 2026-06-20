"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Fingerprint, Bot, Zap } from "lucide-react";
import { createUserDid } from "@/lib/did";
import { User } from "@/app/context/wallet-context";

interface OnboardingModalProps {
  step: number;
  agentName: string;
  setAgentName: (v: string) => void;
  agentLoading: boolean;
  shouldShowPiBrowserPrompt: boolean;
  isConnecting: boolean;
  user: User | null;
  onConnect: () => void;
  onCreateAgent: (name?: string) => Promise<void>;
  onSkip: () => void;
  onComplete: () => void;
  t: (key: string) => string;
}

/**
 * Renders a three-step onboarding modal with focus management and keyboard navigation.
 *
 * Guides users through connecting a Pi wallet, creating an autonomous agent, and completing onboarding. Supports escape-to-skip and traps tab navigation within the modal.
 */
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

  type OnboardingState = "VISITOR" | "CONNECTED" | "PARTIAL_VERIFIED" | "VERIFIED" | "PENDING_REVIEW" | "ERROR";

  const getOnboardingState = (u: any): OnboardingState => {
    if (!u) return "VISITOR";
    if (u.kycStatus === "VERIFIED") return "VERIFIED";
    if (u.kycStatus === "PENDING" || u.kycStatus === "PENDING_REVIEW") return "PENDING_REVIEW";
    if (u.kycStatus === "PARTIAL" || u.kycStatus === "PARTIAL_VERIFIED") return "PARTIAL_VERIFIED";
    return "CONNECTED";
  };

  const stateValue = getOnboardingState(user);

  const stateConfigs: Record<OnboardingState, { label: string; colorClass: string }> = {
    VISITOR: { label: "VISITOR", colorClass: "text-zinc-500 border-zinc-800 bg-zinc-900/50" },
    CONNECTED: { label: "CONNECTED", colorClass: "text-blue-400 border-blue-500/20 bg-blue-500/5" },
    PARTIAL_VERIFIED: { label: "PARTIAL KYC", colorClass: "text-amber-400 border-amber-500/20 bg-amber-500/5" },
    VERIFIED: { label: "VERIFIED", colorClass: "text-green-400 border-green-500/20 bg-green-500/5" },
    PENDING_REVIEW: { label: "PENDING REVIEW", colorClass: "text-purple-400 border-purple-500/20 bg-purple-500/5" },
    ERROR: { label: "ERROR", colorClass: "text-red-400 border-red-500/20 bg-red-500/5" }
  };

  const stateConfig = stateConfigs[stateValue];

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
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
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
            <h3 id="onboarding-title" className="text-xl font-bold text-surface font-mono">AGENT ONBOARDING</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] text-subtle font-mono">Step {step} of 3</span>
              <span className="text-zinc-600">•</span>
              <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border ${stateConfig.colorClass}`}>
                {stateConfig.label}
              </span>
            </div>
          </div>
          <button onClick={onSkip} className="text-faint hover:text-surface text-xs font-mono border border-white/5 hover:border-white/10 px-2.5 py-1 rounded">
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
              <h4 className="text-base font-semibold text-surface text-center">Connect Your Pi Wallet</h4>
              <p className="text-xs text-subtle text-center leading-relaxed">
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
              <h4 className="text-base font-semibold text-surface text-center">Create Autonomous Agent</h4>
              <p className="text-xs text-subtle text-center leading-relaxed font-mono">
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
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-surface placeholder-gray-600 focus:outline-none focus:border-neon-green/40 font-mono"
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
              <h4 className="text-base font-semibold text-surface text-center">Your Passport is Ready!</h4>
              <p className="text-xs text-subtle text-center leading-relaxed">
                Your agent identity passport has been successfully anchored.
              </p>
              {user && (
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-xs space-y-2 font-mono">
                  <div className="flex justify-between">
                    <span className="text-faint">Agent:</span>
                    <span className="text-neon-green">{user.agent?.name || "AxiomBot"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-faint">DID:</span>
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
