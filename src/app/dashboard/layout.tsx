"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ErrorBanner } from "@/components/ErrorBanner";
import { ThemeToggle } from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "../context/language-context";
import { Fingerprint, Store, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard" as const, labelKey: "dashboard_title", icon: Fingerprint },
  { href: "/dashboard/marketplace" as const, labelKey: "marketplace", icon: Store },
  { href: "/dashboard/settings" as const, labelKey: "settings_page_title", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-grid">
      <div className="scanline" />
      <ErrorBanner />

      <header className="sticky top-0 z-50 backdrop-blur-md border-b" style={{ background: 'color-mix(in srgb, var(--bg-card) 90%, transparent)', borderColor: 'var(--card-border)' }}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Link href="/" className="flex items-center gap-2 shrink-0">
                <span className="text-lg sm:text-xl font-bold text-neon-green font-mono">AXIOM</span>
                <span className="text-lg sm:text-xl font-bold text-surface font-mono">ID</span>
              </Link>
              <div className="w-px h-6 bg-white/10 hidden sm:block" />
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  {t("dashboard_title")}
                </h1>
                <p className="text-[10px] font-mono hidden sm:block" style={{ color: 'var(--text-muted)' }}>
                  Agent Identity Layer v1.0.0
                </p>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-1" aria-label="Dashboard navigation">
              {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono transition-all ${
                    pathname === href
                      ? "text-neon-green bg-neon-green/10"
                      : "text-subtle hover:text-surface hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t(labelKey)}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <ThemeToggle />
              <LanguageToggle />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 pb-24">
        {children}
      </div>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md border-t" style={{ background: 'color-mix(in srgb, var(--bg-card) 95%, transparent)', borderColor: 'var(--card-border)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center justify-around py-2 px-2">
          {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all ${
                pathname === href
                  ? "text-neon-green"
                  : "text-faint hover:text-subtle"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t(labelKey)}
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
