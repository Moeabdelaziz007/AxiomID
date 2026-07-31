"use client";

import { useWallet } from "@/app/context/wallet-context";
import { useLanguage } from "@/app/context/language-context";
import LanguageToggle from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface HeaderActionsProps {
  showBack?: boolean;
  showWallet?: boolean;
  minimal?: boolean;
  onConnect?: () => void;
  isConnecting?: boolean;
}

/**
 * Renders header navigation controls with optional back, appearance, and wallet actions.
 *
 * @param showBack - Whether to display a link back to the home page.
 * @param showWallet - Whether to display wallet-related actions.
 * @param minimal - Whether to hide the language and theme toggles.
 * @param onConnect - Optional callback invoked when the connect action is selected.
 * @param isConnecting - Optional override for the wallet connection state.
 * @returns The header actions navigation.
 */
export function HeaderActions({ showBack, showWallet, minimal, onConnect, isConnecting: externalConnecting }: HeaderActionsProps) {
  const { user, connectWallet, isConnecting: walletConnecting, logout } = useWallet();
  const { t } = useLanguage();
  const connecting = externalConnecting ?? walletConnecting;

  return (
    <nav aria-label="Header actions" className="flex items-center gap-1.5 sm:gap-2 shrink-0">
      {showBack && (
        <Link href="/" className="btn-ghost text-xs font-mono px-3 py-1.5 flex items-center gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" />
          {t("header_back")}
        </Link>
      )}
      {!minimal && (
        <>
          <LanguageToggle />
          <ThemeToggle />
        </>
      )}
      {showWallet && (
        <>
          {user ? (
            <div className="flex items-center gap-2">
              <Link href="/dashboard" className="btn-primary text-xs px-3 sm:px-4 py-2">
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
              <button onClick={onConnect ?? (() => connectWallet())} disabled={connecting} className="btn-primary text-xs px-3 sm:px-4 py-2">
                {connecting ? t("connecting") : t("connect")}
              </button>
            </div>
          )}
        </>
      )}
    </nav>
  );
}
