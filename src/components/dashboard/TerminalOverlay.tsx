"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Terminal, Trash2, Play } from "lucide-react";
import { useLanguage } from "@/app/context/language-context";

interface TerminalOverlayProps {
  logs: string[];
  walletLogs: string[];
  onClear: () => void;
  onRunTest: () => void;
  onClose: () => void;
}

export function TerminalOverlay({ logs, walletLogs, onClear, onRunTest, onClose }: TerminalOverlayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, walletLogs]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-[72px] left-0 right-0 z-40 backdrop-blur-md max-h-[50vh] sm:max-h-[40vh] overflow-hidden flex flex-col border-t"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", background: "color-mix(in srgb, var(--bg-card) 95%, transparent)", borderColor: "var(--card-border)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "var(--card-border)" }}>
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-neon-green" />
          <span className="text-xs font-mono text-neon-green">{t('terminal_title')}</span>
          <span className="text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>
            {logs.length + walletLogs.length} {t('terminal_entries')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onClear}
            className="text-[10px] font-mono transition-colors px-2.5 py-1.5 rounded border hover:bg-white/5 flex items-center gap-1.5"
            style={{ color: "var(--text-muted)", borderColor: "var(--card-border)" }}
          >
            <Trash2 className="w-3 h-3" />
            {t('terminal_clear')}
          </button>
          <button
            onClick={onRunTest}
            className="text-[10px] font-mono text-neon-green transition-colors px-2.5 py-1.5 rounded border border-neon-green/20 hover:border-neon-green/40 hover:bg-neon-green/5 flex items-center gap-1.5"
          >
            <Play className="w-3 h-3" />
            {t('terminal_run_test')}
          </button>
          <button
            onClick={onClose}
            className="transition-colors ms-1 min-w-[32px] h-8 flex items-center justify-center"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Log content */}
      <div ref={scrollRef} className="overflow-y-auto flex-1 p-4 font-mono text-[11px] leading-relaxed">
        {logs.map((line, i) => (
          <div key={`init-${i}`} className="flex items-start gap-2">
            <span className="text-faint select-none shrink-0">{'>'}</span>
            <span style={{ color: "var(--text-muted)" }}>{line}</span>
          </div>
        ))}
        {walletLogs.map((line, i) => (
          <div key={`wallet-${i}`} className="flex items-start gap-2">
            <span className="text-neon-green/60 select-none shrink-0">{'>'}</span>
            <span className="text-neon-green/80">{line}</span>
          </div>
        ))}
        {walletLogs.length === 0 && logs.length <= 1 && (
          <div className="italic mt-2" style={{ color: "var(--text-muted)" }}>
            {t('terminal_waiting')}
          </div>
        )}
        {/* Blinking cursor */}
        <div className="flex items-center gap-1 mt-1">
          <span className="text-neon-green select-none">{'>'}</span>
          <span className="w-2 h-4 bg-neon-green/60 animate-pulse" />
        </div>
      </div>
    </motion.div>
  );
}
