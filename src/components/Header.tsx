"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useLanguage } from "@/app/context/language-context";
import { useWallet } from "@/app/context/wallet-context";
import { AxiomLogo } from "@/components/AxiomLogo";
import { HeaderActions } from "@/components/shared/HeaderActions";

interface HeaderProps {
  showBack?: boolean;
  showWallet?: boolean;
}

/**
 * Renders the site header with branding, navigation controls, and optional wallet actions.
 *
 * @param showBack - Whether to display the back navigation control.
 * @param showWallet - Whether to display the wallet control.
 * @returns The rendered site header.
 */
export default function Header({ showBack = false, showWallet = false }: HeaderProps) {
  const { language } = useLanguage();
  const { connectWallet, isConnecting } = useWallet();
  const [connectError, setConnectError] = React.useState<string | null>(null);

  const handleConnect = async () => {
    setConnectError(null);
    const connected = await connectWallet();
    if (!connected) {
      const msg = language === "ar" ? "فشل الاتصال" : "Connection failed";
      setConnectError(msg);
      setTimeout(() => setConnectError(null), 6000);
    }
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 w-full z-50 backdrop-blur-xl border-b"
      style={{
        background: "color-mix(in srgb, var(--bg-deep) 92%, transparent)",
        borderColor: "var(--card-border)",
        color: "var(--text-primary)",
      }}
    >
      <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-3 px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/" className="group">
            <AxiomLogo />
          </Link>
          <div className="w-px h-6 bg-glass-hover hidden sm:block" />
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-glass border border-glass-hover">
            <svg viewBox="0 0 100 100" className="w-4 h-4" fill="currentColor">
              <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.3"/>
              <text x="50" y="68" textAnchor="middle" fontSize="60" fontWeight="bold" fill="currentColor" fontFamily="serif">π</text>
            </svg>
            <span className="text-[9px] font-mono tracking-wider" style={{ color: 'var(--text-secondary)' }}>PI NETWORK</span>
          </div>
        </div>
        <HeaderActions showBack={showBack} showWallet={showWallet} onConnect={handleConnect} isConnecting={isConnecting} />
        {connectError && (
          <div className="absolute top-full right-0 mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-mono max-w-[250px] z-50">
            {connectError}
          </div>
        )}
      </div>
    </motion.header>
  );
}
