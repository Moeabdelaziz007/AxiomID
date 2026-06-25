"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/app/context/language-context";
import { useWallet } from "@/app/context/wallet-context";
import type { Route } from "next";

interface NavItem {
  href: Route;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface HeaderProps {
  pathname: string;
  navItems: NavItem[];
}

/**
 * Renders the dashboard header with branding, navigation, wallet controls, and utility toggles.
 *
 * @param pathname - Current route path used to highlight the active navigation item.
 * @param navItems - Navigation entries to display in the header.
 */
export function Header({ pathname, navItems }: HeaderProps) {
  const { t } = useLanguage();
  const { user, connectWallet, isConnecting, isPiBrowser, logout } = useWallet();

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-md border-b animate-fadeIn"
      style={{
        background: "color-mix(in srgb, var(--bg-card) 90%, transparent)",
        borderColor: "var(--card-border)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-2 shrink-0 group">
              <span className="text-lg sm:text-xl font-bold text-neon-green font-mono transition-colors group-hover:text-emerald-400">
                AXIOM
              </span>
              <span className="text-lg sm:text-xl font-bold text-surface font-mono transition-colors group-hover:text-white">
                ID
              </span>
            </Link>
            <div className="w-px h-6 bg-white/10 hidden sm:block" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold truncate" style={{ color: "var(--text-primary)" }}>
                {t("dashboard_title")}
              </h1>
              <p className="text-[10px] font-mono hidden sm:block" style={{ color: "var(--text-muted)" }}>
                Agent Identity Layer v1.0.0
              </p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1" aria-label="Dashboard navigation">
            {navItems.map(({ href, labelKey, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200 ${
                  pathname === href
                    ? "text-neon-green bg-neon-green/10 shadow-[0_0_12px_rgba(34,197,94,0.05)] border border-neon-green/20"
                    : "text-subtle hover:text-surface hover:bg-white/5 border border-transparent"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t(labelKey)}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 font-mono">
            {isPiBrowser && !user && (
              <span className="hidden sm:inline text-[10px] font-mono px-2 py-1 rounded border" style={{ background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}>
                Pi Browser
              </span>
            )}
            {user ? (
              <button onClick={() => logout()} className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {t("logout")}
              </button>
            ) : (
              <button onClick={connectWallet} disabled={isConnecting} className="btn-primary text-xs px-3 sm:px-4 py-2">
                {isConnecting ? t("connecting") : t("connect")}
              </button>
            )}
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
