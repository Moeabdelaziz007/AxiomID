"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export type Language = "en" | "ar" | "zh";

export interface FontConfig {
  family: string;
  weight: {
    regular: number;
    medium: number;
    bold: number;
  };
  size: {
    base: number;
    scale: number;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
}

export interface LanguageConfig {
  code: Language;
  name: string;
  nativeName: string;
  dir: "ltr" | "rtl";
  font: FontConfig;
  flag: string;
  locale: string;
}

export interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  config: LanguageConfig;
  allConfigs: Record<Language, LanguageConfig>;
  t: (key: string) => string;
  isAgentMode: boolean;
  setAgentMode: (enabled: boolean) => void;
}

// ─── Agent-First Language Configurations ───

const LANGUAGE_CONFIGS: Record<Language, LanguageConfig> = {
  en: {
    code: "en",
    name: "English",
    nativeName: "English",
    dir: "ltr",
    flag: "🇺🇸",
    locale: "en-US",
    font: {
      family: "'Inter', 'Noto Sans', system-ui, sans-serif",
      weight: { regular: 400, medium: 500, bold: 700 },
      size: { base: 16, scale: 1.2 },
      lineHeight: { tight: 1.1, normal: 1.5, relaxed: 1.75 }
    }
  },
  ar: {
    code: "ar",
    name: "Arabic",
    nativeName: "العربية",
    dir: "rtl",
    flag: "🇸🇦",
    locale: "ar-SA",
    font: {
      family: "'Noto Naskh Arabic', 'Cairo', 'Amiri', system-ui, sans-serif",
      weight: { regular: 400, medium: 500, bold: 700 },
      size: { base: 16, scale: 1.2 },
      lineHeight: { tight: 1.2, normal: 1.6, relaxed: 1.85 }
    }
  },
  zh: {
    code: "zh",
    name: "Chinese",
    nativeName: "中文",
    dir: "ltr",
    flag: "🇨🇳",
    locale: "zh-CN",
    font: {
      family: "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif",
      weight: { regular: 400, medium: 500, bold: 700 },
      size: { base: 16, scale: 1.2 },
      lineHeight: { tight: 1.15, normal: 1.55, relaxed: 1.8 }
    }
  }
};

// ─── CSS Variable Generator (Agent-Readable) ───

export function generateCSSVariables(config: LanguageConfig): Record<string, string> {
  return {
    "--font-family": config.font.family,
    "--font-weight-regular": String(config.font.weight.regular),
    "--font-weight-medium": String(config.font.weight.medium),
    "--font-weight-bold": String(config.font.weight.bold),
    "--font-size-base": `${config.font.size.base}px`,
    "--font-size-scale": String(config.font.size.scale),
    "--line-height-tight": String(config.font.lineHeight.tight),
    "--line-height-normal": String(config.font.lineHeight.normal),
    "--line-height-relaxed": String(config.font.lineHeight.relaxed),
    "--text-direction": config.dir,
    "--language-code": config.code,
    "--language-locale": config.locale
  };
}

// ─── Context ───

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ 
  children, 
  defaultLanguage = "en",
  enableAgentMode = false 
}: { 
  children: ReactNode; 
  defaultLanguage?: Language;
  enableAgentMode?: boolean;
}) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("axiomid-language") as Language) || defaultLanguage;
    }
    return defaultLanguage;
  });
  
  const [agentMode, setAgentMode] = useState(enableAgentMode);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("axiomid-language", lang);
    
    // Apply CSS variables to document root (agent-readable)
    const config = LANGUAGE_CONFIGS[lang];
    const cssVars = generateCSSVariables(config);
    Object.entries(cssVars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
    
    // Set document direction
    document.documentElement.dir = config.dir;
    document.documentElement.lang = config.locale;
    
    // Dispatch custom event for agents listening
    window.dispatchEvent(new CustomEvent("axiomid:language-changed", {
      detail: { language: lang, config, timestamp: Date.now() }
    }));
  }, []);

  // Initialize on mount
  useEffect(() => {
    setLanguage(language);
    
    // Listen for agent-initiated language changes
    const handleAgentLanguageChange = (event: CustomEvent) => {
      if (event.detail?.source === "agent" && event.detail?.language) {
        setLanguage(event.detail.language);
      }
    };
    
    window.addEventListener("axiomid:agent-set-language", handleAgentLanguageChange as EventListener);
    return () => window.removeEventListener("axiomid:agent-set-language", handleAgentLanguageChange as EventListener);
  }, [language, setLanguage]);

  // Translation function
  // Translation function
  const t = useCallback((key: string) => {
    return getTranslation(language, key);
  }, [language]);

  const config = LANGUAGE_CONFIGS[language];

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage,
      config,
      allConfigs: LANGUAGE_CONFIGS,
      t,
      isAgentMode: agentMode,
      setAgentMode
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}

// ─── Agent API (Exposed globally for agent access) ───

if (typeof window !== "undefined") {
  // Agent can call: window.axiomid.language.set("ar")
  (window as any).axiomid = (window as any).axiomid || {};
  (window as any).axiomid.language = {
    get: () => {
      const stored = typeof localStorage !== "undefined" ? (localStorage.getItem("axiomid-language") as Language) : null;
      return stored || "en";
    },
    set: (lang: Language) => {
      window.dispatchEvent(new CustomEvent("axiomid:agent-set-language", {
        detail: { language: lang, source: "agent", timestamp: Date.now() }
      }));
    },
    getConfig: (lang?: Language) => {
      const targetLang = lang || (window as any).axiomid.language.get();
      return LANGUAGE_CONFIGS[targetLang as Language];
    },
    getAllConfigs: () => LANGUAGE_CONFIGS,
    subscribe: (callback: (lang: Language) => void) => {
      const handler = (e: CustomEvent) => callback(e.detail.language);
      window.addEventListener("axiomid:language-changed", handler as EventListener);
      return () => window.removeEventListener("axiomid:language-changed", handler as EventListener);
    }
  };
}