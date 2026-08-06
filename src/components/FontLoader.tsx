"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/app/context/language-context";

const FONT_CONFIGS = {
  en: {
    families: [
      { name: "Inter", weights: [400, 500, 700], display: "swap" },
      { name: "JetBrains Mono", weights: [400, 500, 700], display: "swap" }
    ],
    subsets: ["latin"]
  },
  ar: {
    families: [
      { name: "Noto Naskh Arabic", weights: [400, 500, 700], display: "swap" },
      { name: "Cairo", weights: [400, 500, 700], display: "swap" },
      { name: "JetBrains Mono", weights: [400, 500, 700], display: "swap" }
    ],
    subsets: ["arabic"]
  },
  zh: {
    families: [
      { name: "Noto Sans SC", weights: [400, 500, 700], display: "swap" },
      { name: "JetBrains Mono", weights: [400, 500, 700], display: "swap" }
    ],
    subsets: ["chinese-simplified"]
  }
};

const FONT_URLS = {
  "Inter": "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap",
  "JetBrains Mono": "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap",
  "Noto Naskh Arabic": "https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;700&display=swap",
  "Cairo": "https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;700&display=swap",
  "Noto Sans SC": "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap"
};

export function FontLoader() {
  const { language } = useLanguage();
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());

  useEffect(() => {
    const config = FONT_CONFIGS[language];
    if (!config) return;

    const fontPromises = config.families.map(async (family) => {
      const url = FONT_URLS[family.name as keyof typeof FONT_URLS];
      if (!url) return;

      try {
        const response = await fetch(url);
        const css = await response.text();
        
        // Inject CSS
        const style = document.createElement("style");
        style.textContent = css;
        style.setAttribute("data-font-family", family.name);
        document.head.appendChild(style);
        
        setLoadedFonts(prev => new Set(prev).add(family.name));
      } catch (error) {
        console.warn(`Failed to load font: ${family.name}`, error);
      }
    });

    Promise.all(fontPromises).then(() => {
      // Mark document as ready for this language
      document.documentElement.setAttribute("data-fonts-loaded", language);
    });

    return () => {
      // Cleanup: remove font styles for this language
      document.querySelectorAll(`style[data-font-family]`).forEach(el => {
        const familyName = el.getAttribute("data-font-family");
        if (config.families.some(f => f.name === familyName)) {
          el.remove();
        }
      });
    };
  }, [language]);

  // Agent API: expose font loading status
  useEffect(() => {
    (window as any).axiomid = (window as any).axiomid || {};
    (window as any).axiomid.fonts = {
      getLoaded: () => Array.from(loadedFonts),
      isReady: (lang: string) => {
        const config = FONT_CONFIGS[lang as keyof typeof FONT_CONFIGS];
        if (!config) return true;
        return config.families.every(f => loadedFonts.has(f.name));
      },
      preload: async (lang: string) => {
        const config = FONT_CONFIGS[lang as keyof typeof FONT_CONFIGS];
        if (!config) return;
        
        await Promise.all(config.families.map(async (family) => {
          const url = FONT_URLS[family.name as keyof typeof FONT_URLS];
          if (!url) return;
          
          try {
            const response = await fetch(url);
            const css = await response.text();
            const style = document.createElement("style");
            style.textContent = css;
            style.setAttribute("data-font-family", family.name);
            document.head.appendChild(style);
            setLoadedFonts(prev => new Set(prev).add(family.name));
          } catch (error) {
            console.warn(`Failed to preload font: ${family.name}`, error);
          }
        }));
      }
    };
  }, [loadedFonts, language]);

  return null; // This component doesn't render anything
}

export function useFontStatus(lang?: string) {
  const { language } = useLanguage();
  const targetLang = lang || language;
  const config = FONT_CONFIGS[targetLang as keyof typeof FONT_CONFIGS];

  if (!config) return { ready: true, loaded: [], pending: [] };

  const loaded: string[] = typeof window !== "undefined" && (window as any).axiomid?.fonts
    ? (window as any).axiomid.fonts.getLoaded()
    : [];

  return {
    ready: config.families.every(f => loaded.includes(f.name)),
    loaded: config.families.filter(f => loaded.includes(f.name)).map(f => f.name),
    pending: config.families.filter(f => !loaded.includes(f.name)).map(f => f.name)
  };
}

// Global font status for agents
if (typeof window !== "undefined") {
  (window as any).axiomid = (window as any).axiomid || {};
  (window as any).axiomid.getFontStatus = () => {
    const root = document.documentElement;
    return {
      currentLanguage: root.getAttribute("data-language") || "en",
      fontsLoaded: root.getAttribute("data-fonts-loaded") || "none",
      direction: root.getAttribute("dir") || "ltr"
    };
  };
}