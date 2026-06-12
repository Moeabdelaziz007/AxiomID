"use client";

import Link from "next/link";
import { useLanguage } from "../../context/language-context";
import LanguageToggle from "@/components/LanguageToggle";

export function PassportHeader() {
  const { language } = useLanguage();

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
            {language === "ar" ? "جواز سفر العميل" : "AGENT PASSPORT"}
          </span>
        </div>
      </div>
    </header>
  );
}
