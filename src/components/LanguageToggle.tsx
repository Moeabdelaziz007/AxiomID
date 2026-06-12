"use client";

import { useLanguage } from "@/app/context/language-context";

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "ar" : "en");
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-xs font-mono text-white/80 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.02)] active:scale-95 cursor-pointer z-50"
      aria-label="Toggle language"
    >
      <span>🌐</span>
      <span>{language === "en" ? "العربية" : "English"}</span>
    </button>
  );
}
