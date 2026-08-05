"use client";

import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/app/context/language-context";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  variant?: "dropdown" | "pills" | "minimal" | "agent";
  showFlag?: boolean;
  showNativeName?: boolean;
  showCode?: boolean;
  className?: string;
  agentAccessible?: boolean;
}

const DEFAULT_VARIANT = "dropdown";

export function LanguageSwitcher({ 
  variant = DEFAULT_VARIANT,
  showFlag = true,
  showNativeName = true,
  showCode = false,
  className = "",
  agentAccessible = true
}: LanguageSwitcherProps) {
  const { language, setLanguage, config, allConfigs, isAgentMode } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredLang, setHoveredLang] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages = Object.values(allConfigs);

  // Handle keyboard navigation (human + agent accessible)
  const handleKeyDown = (e: React.KeyboardEvent, langCode: string) => {
    const currentIndex = languages.findIndex(l => l.code === language);
    let newIndex = currentIndex;

    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        newIndex = (currentIndex + 1) % languages.length;
        break;
      case "ArrowLeft":
        e.preventDefault();
        newIndex = (currentIndex - 1 + languages.length) % languages.length;
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (langCode !== language) setLanguage(langCode as any);
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
    }

    if (newIndex !== currentIndex) {
      setLanguage(languages[newIndex].code);
    }
  };

  // Agent-triggered change handler
  const handleAgentChange = (langCode: string) => {
    setLanguage(langCode as any);
    // Notify any listening agents
    window.dispatchEvent(new CustomEvent("axiomid:language-changed", {
      detail: { language: langCode, source: "human", timestamp: Date.now() }
    }));
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLang = allConfigs[language];

  const renderTrigger = () => {
    if (variant === "pills") {
      return (
        <div 
          className={cn("flex items-center gap-1 bg-white/[0.03] border border-white/[0.05] rounded-xl p-1", className)}
          role="radiogroup"
          aria-label="Select language"
          data-language-switcher="pills"
          data-current-language={language}
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              role="radio"
              aria-checked={lang.code === language}
              onClick={() => handleAgentChange(lang.code)}
              onKeyDown={(e) => handleKeyDown(e, lang.code)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-mono transition-all duration-200",
                lang.code === language
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(34,197,94,0.15)]"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.05]"
              )}
              data-language={lang.code}
              data-language-native={lang.nativeName}
              data-language-dir={lang.dir}
            >
              {showFlag && <span aria-hidden="true">{lang.flag}</span>}
              {showNativeName && <span>{lang.nativeName}</span>}
              {showCode && <span className="text-[10px] text-zinc-500">{lang.code.toUpperCase()}</span>}
            </button>
          ))}
        </div>
      );
    }

    if (variant === "minimal") {
      return (
        <button
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsOpen(!isOpen);
            }
          }}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-mono transition-all",
            "bg-white/[0.03] border border-white/[0.05] hover:border-electric-blue/30 hover:bg-white/[0.05]",
            className
          )}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={`Current language: ${currentLang.nativeName}. Click to change.`}
          data-language-switcher="minimal"
          data-current-language={language}
        >
          {showFlag && <span aria-hidden="true">{currentLang.flag}</span>}
          {showNativeName && <span>{currentLang.nativeName}</span>}
          {showCode && <span className="text-[10px] text-zinc-500">{currentLang.code.toUpperCase()}</span>}
          <svg className={cn("w-4 h-4 text-zinc-400 transition-transform", isOpen && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      );
    }

    if (variant === "agent") {
      return (
        <div 
          className={cn("flex items-center gap-2", className)}
          data-language-switcher="agent"
          data-current-language={language}
          data-agent-accessible="true"
        >
          {/* Compact display for agents */}
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
            LANG
          </span>
          <select
            value={language}
            onChange={(e) => handleAgentChange(e.target.value)}
            className="bg-white/[0.03] border border-white/[0.05] rounded-lg px-3 py-1.5 text-sm font-mono text-white focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:outline-none"
            aria-label="Select language"
            data-language-select="true"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.nativeName} ({lang.code})
              </option>
            ))}
          </select>
          
          {/* Agent API indicator */}
          <span className="text-[9px] font-mono text-emerald-400/50" title="Agent API: window.axiomid.language.set('ar')">
            ⌘
          </span>
        </div>
      );
    }

    // Default: dropdown
    return (
      <div 
        ref={dropdownRef}
        className={cn("relative inline-block", className)}
        data-language-switcher="dropdown"
        data-current-language={language}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsOpen(!isOpen);
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIsOpen(true);
            }
          }}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-mono transition-all",
            "bg-white/[0.03] border border-white/[0.05] hover:border-electric-blue/30 hover:bg-white/[0.05]",
            className
          )}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={`Current language: ${currentLang.nativeName}. Click to change.`}
        >
          {showFlag && <span aria-hidden="true">{currentLang.flag}</span>}
          {showNativeName && <span>{currentLang.nativeName}</span>}
          {showCode && <span className="text-[10px] text-zinc-500">{currentLang.code.toUpperCase()}</span>}
          <svg className={cn("w-4 h-4 text-zinc-400 transition-transform", isOpen && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-0 mt-2 w-48 z-50"
              role="listbox"
              aria-label="Select language"
            >
              <div className="bento-card p-2 rounded-xl shadow-xl border border-white/[0.08] overflow-hidden">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    role="option"
                    aria-selected={lang.code === language}
                    onClick={() => { handleAgentChange(lang.code); setIsOpen(false); }}
                    onKeyDown={(e) => handleKeyDown(e, lang.code)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-mono transition-all",
                      lang.code === language
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "text-zinc-300 hover:bg-white/[0.05] hover:text-white"
                    )}
                    data-language={lang.code}
                    data-language-native={lang.nativeName}
                    data-language-dir={lang.dir}
                    data-language-locale={lang.locale}
                  >
                    {showFlag && <span aria-hidden="true">{lang.flag}</span>}
                    <span>{lang.nativeName}</span>
                    {showCode && <span className="ml-auto text-[10px] text-zinc-500">{lang.code.toUpperCase()}</span>}
                    {lang.code === language && (
                      <svg className="ml-auto w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div 
      className="language-switcher-container"
      data-agent-accessible={agentAccessible}
      data-language-provider="axiomid"
    >
      {renderTrigger()}
      
      {/* Agent metadata - machine readable */}
      {agentAccessible && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "AxiomID Language Switcher",
              "applicationCategory": "DeveloperTool",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "featureList": [
                "Multi-language support (EN, AR, ZH)",
                "RTL/LTR direction handling",
                "Font auto-switching per language",
                "Agent-accessible API: window.axiomid.language",
                "CSS custom properties for programmatic access",
                "Keyboard navigation (Arrow keys, Enter, Escape)",
                "Event-driven: axiomid:language-changed"
              ]
            })
          }}
        />
      )}
    </div>
  );
}

export default LanguageSwitcher;