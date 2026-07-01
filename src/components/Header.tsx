"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useWallet } from "@/app/context/wallet-context";
import { useLanguage } from "@/app/context/language-context";
import LanguageToggle from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft } from "lucide-react";
import { AxiomLogo } from "@/components/AxiomLogo";

interface HeaderProps {
  showBack?: boolean;
  showWallet?: boolean;
}

/**
 * Shared Header component for all AxiomID pages.
 * Displays the premium logo, Pi Network indicators, language/theme toggles,
 * wallet connection or a back button depending on the page mode.
 */
export default function Header({ showBack = false, showWallet = false }: HeaderProps) {
  const { user, connectWallet, isConnecting, isPiBrowser, logout } = useWallet();
  const { t, language } = useLanguage();
  const [connectError, setConnectError] = React.useState<string | null>(null);

  const handleConnect = async () => {
    setConnectError(null);
    // connectWallet swallows its own errors and returns whether it succeeded,
    // so use the returned flag rather than relying on a throw.
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
      // ponytail: use unified theme-aware background color mix to support light mode transitions smoothly
      className="sticky top-0 w-full z-50 backdrop-blur-xl border-b"
      style={{
        background: "color-mix(in srgb, var(--bg-deep) 90%, transparent)",
        borderColor: "var(--card-border)"
      }}
    >
      <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-3 px-4 sm:px-6 py-4 sm:py-6">
        {/* Logo and Brand */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/" className="group">
            <AxiomLogo />
          </Link>
          <div className="w-px h-6 bg-white/10 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/10">
            <svg viewBox="0 0 100 100" className="w-4 h-4" fill="currentColor">
              <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.3"/>
              <text x="50" y="68" textAnchor="middle" fontSize="60" fontWeight="bold" fill="currentColor" fontFamily="serif">π</text>
            </svg>
            <span className="text-[9px] font-mono tracking-wider" style={{ color: 'var(--text-secondary)' }}>PI NETWORK</span>
          </div>
        </div>

        {/* Navigation & Controls */}
        <nav aria-label="Main navigation" className="flex items-center gap-2 sm:gap-3">
          {showBack && (
            <Link href="/" className="btn-ghost text-xs font-mono px-3 py-1.5 flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" />
              {t("header_back")}
            </Link>
          )}
          <LanguageToggle />
          <ThemeToggle />
          
          {showWallet && (
            <>
              {isPiBrowser && !user && (
                <span className="hidden sm:inline text-[10px] font-mono px-2 py-1 rounded border" style={{ background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}>
                  Pi Browser
                </span>
              )}
              {user ? (
                <div className="flex items-center gap-2">
                  <Link href="/dashboard" prefetch={false} className="btn-primary text-xs px-3 sm:px-4 py-2">
                    {t("nav_dashboard")}
                  </Link>
                  <button onClick={() => logout()} aria-label={t("logout")} className="btn-ghost text-xs px-3 py-1.5 hidden sm:flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    {t("logout")}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/dashboard" prefetch={false} className="btn-ghost text-xs px-3 sm:px-4 py-2">
                    {t("nav_dashboard")}
                  </Link>
                  {!isPiBrowser && (
                    <span className="hidden sm:inline text-[10px] font-mono px-2 py-1 rounded border border-yellow-500/20 bg-yellow-500/5 text-yellow-500">
                      {language === "ar" ? "يتطلب Pi Browser" : "Pi Browser required"}
                    </span>
                  )}
                  <button onClick={handleConnect} disabled={isConnecting} className="btn-primary text-xs px-3 sm:px-4 py-2">
                    {isConnecting ? t("connecting") : t("connect")}
                  </button>
                </div>
              )}
              {connectError && (
                <div className="absolute top-full right-0 mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-mono max-w-[250px] z-50">
                  {connectError}
                </div>
              )}
            </>
          )}
        </nav>
      </div>
    </motion.header>
  );
}
