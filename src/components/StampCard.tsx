"use client";

import { useState } from "react";
import { XPBurst } from "./XPBurst";
import { useLanguage } from "@/app/context/language-context";

interface StampCardProps {
  type: string;
  label: string;
  xp: number;
  icon: string;
  isConnected: boolean;
  metadata?: string | null;
  onConnect: (handle: string) => Promise<boolean>;
  onInspectVc: () => void;
  isAutomatic?: boolean;
}

export function StampCard({
  type,
  label,
  xp,
  icon,
  isConnected,
  metadata,
  onConnect,
  onInspectVc,
  isAutomatic = false,
}: StampCardProps) {
  const { t } = useLanguage();
  const [showInput, setShowInput] = useState(false);
  const [handle, setHandle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [triggerXP, setTriggerXP] = useState(false);

  let displayHandle = "";
  if (isConnected && metadata) {
    try {
      const parsed = JSON.parse(metadata);
      displayHandle = parsed.credentialSubject?.handle || parsed.credentialSubject?.username || t('verified');
    } catch {
      displayHandle = t('verified');
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle.trim()) return;
    setSubmitting(true);
    const success = await onConnect(handle.trim());
    setSubmitting(false);
    if (success) {
      setTriggerXP(true);
      setShowInput(false);
      setHandle("");
    }
  };

  const handleAutoClaim = async () => {
    setSubmitting(true);
    const success = await onConnect("system_verified");
    setSubmitting(false);
    if (success) {
      setTriggerXP(true);
    }
  };

  return (
    <div className={`bento-card p-5 relative flex flex-col justify-between min-h-[160px] border transition-all duration-300 ${
      isConnected ? "border-neon-green/30 bg-neon-green/[0.02] animate-stamp-unlock" : "border-white/5"
    }`}>
      <XPBurst xp={xp} trigger={triggerXP} />

      <div className="flex justify-between items-start">
        <div className="flex gap-3">
          <span className="text-3xl filter drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]">{icon}</span>
          <div>
            <h4 className="text-sm font-bold text-white font-mono">{label}</h4>
            {isConnected ? (
              <p className="text-[10px] text-neon-green font-mono mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                {displayHandle}
              </p>
            ) : (
              <p className="text-[10px] text-gray-500 font-mono mt-1">
                {t('reward_label')} <span className="text-neon-green">+{xp} XP</span>
              </p>
            )}
          </div>
        </div>

        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${
          isConnected
            ? "bg-neon-green/10 text-neon-green border border-neon-green/20"
            : "bg-white/5 text-gray-400 border border-white/5"
        }`}>
          {isConnected ? t('claimed') : `+${xp} XP`}
        </span>
      </div>

      <div className="mt-4">
        {isConnected ? (
          <button
            onClick={onInspectVc}
            className="w-full btn-ghost text-[10px] py-1.5 font-mono flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            {t('inspect_vc')}
          </button>
        ) : showInput ? (
          <form onSubmit={handleSubmit} className="space-y-2">
            <input
              type="text"
              required
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder={type === "connect_google" ? t('placeholder_email') : t('placeholder_username')}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-neon-green/40 font-mono"
            />
            <div className="flex gap-1.5">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 btn-primary py-1.5 text-[9px]"
              >
                {submitting ? t('claiming') : t('submit')}
              </button>
              <button
                type="button"
                onClick={() => setShowInput(false)}
                className="btn-ghost py-1.5 text-[9px] px-2.5"
              >
                {t('cancel')}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => {
              if (isAutomatic) {
                handleAutoClaim();
              } else {
                setShowInput(true);
              }
            }}
            disabled={submitting}
            className="w-full btn-primary text-[10px] min-h-[44px] py-2"
          >
            {submitting ? t('claiming') : isAutomatic ? t('claim_stamp') : t('connect_profile')}
          </button>
        )}
      </div>
    </div>
  );
}
