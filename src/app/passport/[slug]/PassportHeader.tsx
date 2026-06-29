"use client";

import Link from "next/link";
import { useLanguage } from "../../context/language-context";
import LanguageToggle from "@/components/LanguageToggle";

/**
 * Renders the header bar for the passport page, including navigation and language controls.
 */
export function PassportHeader() {
  const { t } = useLanguage();

  return (
    <header
      className="w-full border-b backdrop-blur-xl px-4 sm:px-6 py-4 z-10"
      style={{
        // Theme-aware solid background. Avoids color-mix() so older browsers
        // without support still render an opaque header; backdrop-blur-xl
        // already provides the glassy effect over scrolled content.
        backgroundColor: "var(--bg-deep)",
        borderColor: "var(--card-border)",
      }}
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-6 h-6 rounded bg-neon-green/20 flex items-center justify-center border border-neon-green/50">
            <span className="text-neon-green font-bold text-[8px]">A</span>
          </div>
          <span className="font-mono text-sm tracking-tighter text-surface">
            AXIOM<span className="text-faint">ID</span>
          </span>
        </Link>
        <div className="flex items-center gap-3 shrink-0">
          <LanguageToggle />
          <span className="text-[10px] font-mono text-faint uppercase hidden sm:inline">
            {t('agent_passport')}
          </span>
        </div>
      </div>
    </header>
  );
}
