"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ErrorBanner } from "@/components/ErrorBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useLanguage } from "../context/language-context";
import type { Route } from "next";
import { Fingerprint, Store, Settings, Cpu } from "lucide-react";
import { Header } from "@/components/dashboard/Header";

interface NavItem {
  href: Route;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard_title", icon: Fingerprint },
  { href: "/dashboard/marketplace", labelKey: "marketplace", icon: Store },
  { href: "/dashboard/sandbox", labelKey: "sandbox", icon: Cpu },
  { href: "/dashboard/settings", labelKey: "settings_page_title", icon: Settings },
];

/**
 * Provides the layout structure for dashboard pages.
 *
 * @param children - The page content to render within the layout
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-grid">
      <div className="scanline" />
      <ErrorBanner />

      <Header pathname={pathname} navItems={NAV_ITEMS} />

      <div className="max-w-7xl mx-auto px-4 py-8 pb-24 animate-in">
        <ErrorBoundary>
          <Suspense fallback={
            <div className="animate-pulse space-y-4 p-8">
              <div className="h-6 bg-white/5 rounded w-1/3" />
              <div className="h-4 bg-white/5 rounded w-2/3" />
              <div className="h-32 bg-white/5 rounded w-full" />
            </div>
          }>
            {children}
          </Suspense>
        </ErrorBoundary>
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
