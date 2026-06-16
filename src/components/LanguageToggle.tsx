"use client";

import { useLanguage } from "@/app/context/language-context";
import { Globe } from "lucide-react";

/**
 * Renders a button that toggles the application language between English and Arabic.
 *
 * The button displays a globe icon and the label for the alternate language:
 * "العربية" when the current language is English, and "English" when Arabic.
 *
 * @returns A React element representing the language toggle button.
 */
export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "ar" : "en");
  };

  return (
    <button
      onClick={toggleLanguage}
      className="btn-toggle flex items-center gap-1.5 px-3 py-2 min-h-[44px] min-w-[44px] justify-center rounded-full border backdrop-blur-md text-xs font-mono transition-all duration-300 active:scale-95 cursor-pointer z-50"
      aria-label="Toggle language"
    >
      <Globe className="w-4 h-4" />
      <span>{language === "en" ? "العربية" : "English"}</span>
    </button>
  );
}
