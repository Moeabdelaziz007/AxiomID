"use client";

import React, { useState, useRef } from "react";
import { Tier, getTierColor } from "@/lib/tiers";
import { useLanguage } from "@/app/context/language-context";
import { sharePassport } from "@/lib/pi-native-features";
import { Fingerprint, Award, CheckCircle, Lock, Download, Coins, Share2 } from "lucide-react";
import PassportKeyManager from "./PassportKeyManager";

interface InteractivePassportCardProps {
  user: {
    piUsername?: string | null;
    walletAddress?: string;
    tier?: Tier | null;
    xp?: number;
    trustScore?: number;
    kyaStatus?: string;
    kycStatus?: string;
  } | null;
  readonly?: boolean;
  locked?: boolean;
  onSign?: (payload: string) => Promise<string>;
}

/**
 * Displays an interactive passport card with user identity and verification information.
 *
 * Presents identity details including username, wallet address, XP balance, trust score, and verification statuses (KYA/KYC). In locked mode, the card obscures information and displays a locked preview state. Supports pointer and touch interactions when unlocked and not in readonly mode. Includes a `PassportKeyManager` child component for signing when a user is present.
 *
 * @param user - User data object containing identity and verification details.
 * @param readonly - When `true`, disables card interactions. Defaults to `false`.
 * @param locked - When `true`, displays the card in locked preview state with obscured information. Defaults to `false`.
 * @param onSign - Optional async callback for signing operations, passed to `PassportKeyManager`.
 */
export default function InteractivePassportCard({ user, readonly = false, locked = false, onSign }: InteractivePassportCardProps) {
  const { t, language } = useLanguage();
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [shineStyle, setShineStyle] = useState<React.CSSProperties>({ opacity: 0 });

  const hasUser = !!user && !locked;
  const username = locked ? "" : (user?.piUsername || (user?.walletAddress ? (user.walletAddress.startsWith("pi:") ? user.walletAddress.slice(3) : user.walletAddress) : ""));
  const displayUsername = locked ? (language === "en" ? "LOCKED PREVIEW" : "معاينة مقفلة") : (username || (language === "en" ? "Anonymous Pioneer" : "رائد مجهول"));
  const displayAddress = locked ? "did:axiom:locked_credential" : (user?.walletAddress 
    ? (user.walletAddress.length > 22 ? `${user.walletAddress.slice(0, 10)}...${user.walletAddress.slice(-8)}` : user.walletAddress)
    : "did:axiom:unconnected");
  const tier = locked ? "Visitor" : (user?.tier || "Visitor");
  const tierColor = locked ? "#64748b" : getTierColor(tier);
  const xp = locked ? 0 : (user?.xp ?? 0);
  const trustScore = locked ? 0 : (user?.trustScore ?? 0);
  const isKya = !locked && user?.kyaStatus === "verified";
  const isKyc = !locked && user?.kycStatus === "verified";
  const did = locked ? "did:axiom:locked_credential" : (user?.walletAddress || "did:axiom:unconnected");


  const [isExporting, setIsExporting] = useState(false);
  const [isMinting, setIsMinting] = useState(false);

  const handleExportImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cardRef.current || isExporting) return;

    setIsExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      // Temporarily remove tilt for clean capture
      const originalTransform = cardRef.current.style.transform;
      cardRef.current.style.transform = 'none';

      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        logging: false,
        useCORS: true
      });

      cardRef.current.style.transform = originalTransform;

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `axiom-passport-${displayUsername}.png`;
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleMintSBT = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMinting) return;

    setIsMinting(true);
    try {
      // Simulate SBT Minting on Stellar
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert(t("mint_success") || "Soulbound Token minted successfully on Stellar!");
    } catch (err) {
      console.error("Minting failed:", err);
      alert("Failed to mint SBT.");
    } finally {
      setIsMinting(false);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/passport/${encodeURIComponent(did)}`;
    await sharePassport({
      title: "AxiomID Passport",
      text: "Check out my AxiomID Passport!",
      url: shareUrl,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (readonly || locked || !cardRef.current) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate tilt
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const tiltX = -(y - centerY) / 8; // Max 15 deg
    const tiltY = (x - centerX) / 8;
    
    setRotateX(tiltX);
    setRotateY(tiltY);

    // Calculate light reflection (shine)
    const shineX = (x / rect.width) * 100;
    const shineY = (y / rect.height) * 100;
    setShineStyle({
      opacity: 0.15,
      background: `radial-gradient(circle at ${shineX}% ${shineY}%, rgba(255,255,255,0.4) 0%, transparent 60%)`,
    });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setShineStyle({ opacity: 0 });
  };

  // Mobile support (Touch tilt/reset)
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (readonly || locked || !cardRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const tiltX = -(y - centerY) / 8;
    const tiltY = (x - centerX) / 8;
    
    setRotateX(tiltX);
    setRotateY(tiltY);

    const shineX = (x / rect.width) * 100;
    const shineY = (y / rect.height) * 100;
    setShineStyle({
      opacity: 0.12,
      background: `radial-gradient(circle at ${shineX}% ${shineY}%, rgba(255,255,255,0.3) 0%, transparent 60%)`,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseLeave}
      className={`group relative w-full max-w-sm mx-auto transition-all duration-300 ${
        readonly || locked ? "cursor-default" : "cursor-pointer hover:shadow-electric-blue/20"
      }`}
      style={{
        perspective: "1000px",
        transformStyle: "preserve-3d",
      }}>
      <div className="absolute inset-0 rounded-3xl shadow-2xl overflow-hidden" style={{ border: locked ? "1px dashed rgba(255, 255, 255, 0.05)" : "1px solid rgba(255, 255, 255, 0.08)", background: locked ? "linear-gradient(135deg, rgba(20, 22, 27, 0.8) 0%, rgba(10, 11, 14, 0.9) 100%)" : "linear-gradient(135deg, rgba(29, 32, 39, 0.9) 0%, rgba(16, 19, 26, 0.95) 100%)", backdropFilter: "blur(12px)" }}></div>
      {/* 3D tilt inner container */}

      <div
        className="p-6 sm:p-7 flex flex-col justify-between min-h-[290px] sm:min-h-[310px] relative transition-transform duration-100 ease-out"
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Holographic light reflection layer */}
        <div 
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 mix-blend-color-dodge z-20"
          style={shineStyle}
        />

        {/* Ambient background glow based on tier */}
        <div 
          className="absolute -inset-20 opacity-10 pointer-events-none filter blur-3xl z-0 transition-all duration-500"
          style={{
            background: locked 
              ? "radial-gradient(circle at center, rgba(255,255,255,0.01) 0%, transparent 70%)" 
              : `radial-gradient(circle at center, ${tierColor} 0%, transparent 70%)`
          }}
        />

        {/* Header section */}
        <div className="flex items-center justify-between z-10" style={{ transform: "translateZ(30px)" }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center border" style={{ borderColor: `${tierColor}30`, background: `${tierColor}10` }}>
              <Fingerprint className="w-4 h-4" style={{ color: tierColor }} />
            </div>
            <span className="font-mono text-xs font-semibold tracking-wider text-white">AXIOM<span style={{ color: tierColor }}>ID</span></span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tierColor }} />
            <span className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase">{t("agent_passport")}</span>
          </div>
        </div>

        {/* Middle section: Avatar + Username + Address */}
        <div className={`flex items-center gap-4 my-6 z-10 transition-all ${locked ? "opacity-30 blur-[1px]" : ""}`} style={{ transform: "translateZ(40px)" }}>
          <div 
            className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl flex items-center justify-center text-2xl font-bold font-mono border relative overflow-hidden"
            style={{ 
              borderColor: `${tierColor}40`, 
              background: `linear-gradient(135deg, ${tierColor}15 0%, rgba(255,255,255,0.02) 100%)`,
              color: tierColor,
              boxShadow: `0 0 15px ${tierColor}10`
            }}
          >
            {/* Holographic scanner effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent animate-pulse" style={{ animationDuration: "2s" }} />
            {locked ? "?" : (displayUsername[0]?.toUpperCase() || "?")}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm sm:text-base font-bold font-mono text-white truncate">{displayUsername}</h3>
              {hasUser && (
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              )}
            </div>
            <p className="text-[10px] font-mono text-zinc-400 mt-1 break-all select-all">{displayAddress}</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <span className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-wider font-semibold border ${
                isKya 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                  : "bg-white/5 text-zinc-500 border-white/5"
              }`}>
                KYA {isKya ? t("status_verified") : "LOCKED"}
              </span>
              <span className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-wider font-semibold border ${
                isKyc 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                  : "bg-white/5 text-zinc-500 border-white/5"
              }`}>
                KYC {isKyc ? t("status_verified") : "LOCKED"}
              </span>
              {hasUser && (
                <span className="px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-wider font-semibold border bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.15)]">
                  STATE: {isKyc ? "VERIFIED" : (isKya ? "PARTIAL" : "CONNECTED")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Lock Overlay for locked status */}
        {locked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none" style={{ transform: "translateZ(50px)" }}>
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-lg backdrop-blur-md">
              <Lock className="w-4 h-4 text-zinc-400" />
            </div>
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mt-2 bg-black/60 px-2 py-1 rounded border border-white/5">
              CONNECT TO PROVISION
            </span>
          </div>
        )}

        {/* Bottom section: Stats + Seal */}
        <div className={`flex items-center justify-between border-t pt-4 z-10 transition-all ${locked ? "opacity-30" : ""}`} style={{ borderColor: "rgba(255, 255, 255, 0.08)", transform: "translateZ(30px)" }}>
          <div className="flex gap-4">
            <div>
              <span className="text-[8px] font-mono text-zinc-500 block uppercase tracking-wider">{t("trust_score")}</span>
              <span className="text-xs sm:text-sm font-bold font-mono text-white">{trustScore}%</span>
            </div>
            <div className="border-l border-white/5 pl-4">
              <span className="text-[8px] font-mono text-zinc-500 block uppercase tracking-wider">{t("xp_balance")}</span>
              <span className="text-xs sm:text-sm font-bold font-mono" style={{ color: tierColor }}>{xp.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Award className="w-4 h-4" style={{ color: tierColor }} />
            <span className="text-[10px] font-bold font-mono tracking-wider" style={{ color: tierColor }}>
              {t(tier.toLowerCase())?.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
      {hasUser && <PassportKeyManager did={did} onSign={onSign} />}

      {/* Action Buttons */}
      {!locked && !readonly && (
        <div data-html2canvas-ignore className="flex items-center justify-center gap-2 mt-4 absolute -bottom-12 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={handleExportImage}
            disabled={isExporting}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md border border-white/10 transition-colors tooltip-trigger"
            title={t("export_image") || "Export as Image"}
          >
            <Download className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={handleMintSBT}
            disabled={isMinting}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md border border-white/10 transition-colors tooltip-trigger"
            title={t("mint_sbt") || "Mint as SBT (Stellar)"}
          >
            <Coins className="w-4 h-4 text-amber-400" />
          </button>
          <button
            onClick={handleShare}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md border border-white/10 transition-colors tooltip-trigger"
            title={t("share_passport") || "Share"}
          >
            <Share2 className="w-4 h-4 text-blue-400" />
          </button>
        </div>
      )}

    </div>
  );
}
