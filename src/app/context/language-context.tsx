"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { getTranslation, getTranslations } from "@/i18n";

export type Language = "en" | "ar";

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === "undefined") return "en";
    const saved = localStorage.getItem("aix_language") as Language;
    return saved === "en" || saved === "ar" ? saved : "en";
  });
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("aix_language", lang);
  }, []);

  const t = useCallback((key: string): string => {
    return getTranslation(language, key);
  }, [language]);

  const value = React.useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Access the language context value for the current React tree.
 *
 * @returns The context object with `language`, `setLanguage`, and `t` (translation) helpers.
 * @throws Error if called outside a `LanguageProvider`.
 */
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

// Re-export for backward compatibility — tests import { translations } from language-context
import en from "@/i18n/en.json";
import ar from "@/i18n/ar.json";
export const translations = { en, ar };
