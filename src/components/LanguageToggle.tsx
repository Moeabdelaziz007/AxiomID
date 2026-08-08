"use client";

import { useState } from "react";
import { useLanguage } from "@/app/context/language-context";
import type { Language } from "@/app/context/language-context";
import { Globe } from "lucide-react";

const LANGUAGES: Record<Language, string> = {
  en: "English",
  ar: "العربية",
  zh: "简体中文",
  hi: "हिन्दी",
};

/**
 * Renders a language selector dropdown.
 *
 * The button displays a globe icon and the current language's native name.
 * Clicking it opens a list of all supported languages; selecting one calls
 * `setLanguage`. The list is closed after selection.
 */
export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);

  const select = (lang: Language) => {
    setLanguage(lang);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle language"
        aria-expanded={open}
        className="btn-toggle flex items-center gap-1.5 px-3 py-2 min-h-[44px] min-w-[44px] justify-center rounded-full border backdrop-blur-md text-xs font-mono transition-all duration-300 active:scale-95 cursor-pointer z-50"
      >
        <Globe className="w-4 h-4" />
        <span>{LANGUAGES[language]}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 min-w-[9rem] rounded-xl border bg-card/95 backdrop-blur-md py-1 shadow-lg z-50">
          {(Object.keys(LANGUAGES) as Language[]).map((code) => (
            <button
              key={code}
              onClick={() => select(code)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-mono transition-colors ${
                code === language
                  ? "text-electric-blue"
                  : "text-faint hover:text-surface"
              }`}
            >
              <span>{LANGUAGES[code]}</span>
              {code === language && <span className="ml-auto">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
