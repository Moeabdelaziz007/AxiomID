"use client";

import Link from "next/link";
import { useLanguage } from "../../context/language-context";
import LanguageToggle from "@/components/LanguageToggle";

/**
 * Renders the top header bar for the passport page with a home link, brand mark, language toggle, and a language-dependent label.
 *
 * The displayed label switches to Arabic when the current language from context is `"ar"`.
 *
 * @returns The header JSX element containing the brand link, language toggle, and language-specific label.
 */
export function PassportHeader() {
  const { t } = useLanguage();

  return (
    <header className="w-full border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl px-6 py-4 z-10">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-neon-green/20 flex items-center justify-center border border-neon-green/50">
            <span className="text-neon-green font-bold text-[8px]">A</span>
          </div>
          <span className="font-mono text-sm tracking-tighter text-white">
            AXIOM<span className="text-gray-600">ID</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <span className="text-[10px] font-mono text-gray-500 uppercase">
            {t('agent_passport')}
          </span>
        </div>
      </div>
    </header>
  );
}
