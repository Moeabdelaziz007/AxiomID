"use client";

import Link from "next/link";
import { useLanguage } from "@/app/context/language-context";
import type { Route } from "next";
import { HeaderActions } from "@/components/shared/HeaderActions";

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
 * Renders the dashboard header with branding, navigation, and header actions.
 *
 * @param pathname - The current path used to identify the active navigation item
 * @param navItems - The navigation items displayed in the header
 * @returns The dashboard header element
 */
export function Header({ pathname, navItems }: HeaderProps) {
  const { t } = useLanguage();

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
            <div className="w-px h-6 bg-glass-hover hidden sm:block" />
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
className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono transition-colors duration-200 ${
                   pathname === href
                     ? "text-neon-green bg-neon-green/10 shadow-[0_0_12px_rgba(34,197,94,0.05)] border border-neon-green/20"
                     : "text-subtle hover:text-surface hover:bg-glass border border-transparent"
                 }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t(labelKey)}
              </Link>
            ))}
          </nav>
          <HeaderActions showWallet />
        </div>
      </div>
    </header>
  );
}
