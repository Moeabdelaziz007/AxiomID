"use client";
 
import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Terminal, Trash2, Play, Cpu, Activity, HardDrive } from "lucide-react";
import { useLanguage } from "@/app/context/language-context";
import { useWallet } from "@/app/context/wallet-context";
 
interface TerminalOverlayProps {
  logs: string[];
  walletLogs: string[];
  onClear: () => void;
  onRunTest: () => void;
  onClose: () => void;
}
 
export function TerminalOverlay({ logs, walletLogs, onClear, onRunTest, onClose }: TerminalOverlayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t, language } = useLanguage();
  const { user } = useWallet();
 
  // Simulated state for live telemetry vibes
  const [cpuLoad, setCpuLoad] = useState(42);
  const [memUsage, setMemUsage] = useState(68);
 
  useEffect(() => {
    const interval = setInterval(() => {
      setCpuLoad((prev) => Math.max(10, Math.min(95, prev + (Math.random() * 12 - 6))));
      setMemUsage((prev) => Math.max(50, Math.min(90, prev + (Math.random() * 4 - 2))));
    }, 3000);
    return () => clearInterval(interval);
  }, []);
 
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, walletLogs]);
 
  const getProgressBar = (value: number) => {
    const totalBlocks = 10;
    const filledBlocks = Math.round((value / 100) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    return `[${"█".repeat(filledBlocks)}${"░".repeat(emptyBlocks)}]`;
  };

  const MAX_LOGS = 200;
  const visibleLogs = logs.slice(-MAX_LOGS);
  const visibleWalletLogs = walletLogs.slice(-MAX_LOGS);
 
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed bottom-[72px] left-0 right-0 z-40 backdrop-blur-xl h-[60vh] sm:h-[45vh] overflow-hidden flex flex-col border-t border-white/10"
      style={{ 
        paddingBottom: "env(safe-area-inset-bottom, 0px)", 
        background: "rgba(3, 3, 5, 0.98)",
        boxShadow: "0 -12px 50px -15px rgba(0, 212, 255, 0.2)"
      }}
    >
      {/* ── TOP TELEMETRY BAR ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-1.5 bg-[#08080c] border-b border-white/5 font-mono text-[9px] text-faint">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-emerald-400">
            <Activity className="w-3 h-3 animate-pulse" />
            <span>SYS: ACTIVE</span>
          </span>
          <span className="flex items-center gap-1 text-electric-blue">
            <Cpu className="w-3 h-3" />
            <span>CPU: {getProgressBar(cpuLoad)} {Math.round(cpuLoad)}%</span>
          </span>
          <span className="flex items-center gap-1 text-axiom-purple font-semibold">
            <HardDrive className="w-3 h-3" />
            <span>MEM: {getProgressBar(memUsage)} {Math.round(memUsage)}%</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span>DID: {user?.did ? `${user.did.slice(0, 18)}...` : "UNRESOLVED"}</span>
          <span className="hidden sm:inline border-l border-white/10 pl-3">NODE: 4001/TCP</span>
        </div>
      </div>
 
      {/* ── INTERACTIVE TUI PANELS ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* PANEL 1: Left Telemetry & System Specs (Lazygit Style) */}
        <div className="w-64 border-r border-white/5 bg-black/40 p-4 font-mono text-[10px] space-y-4 hidden md:block select-none text-subtle">
          <div>
            <div className="text-electric-blue font-bold mb-1.5 flex items-center gap-1">
              <span>┌─ SYSTEM CONFIG </span>
              <span className="flex-1 border-t border-dashed border-white/10 ml-1"></span>
            </div>
            <div className="space-y-1 pl-2">
              <div>HOST: <code>did:axiom:l0-gate</code></div>
              <div>OS: <code>WebAssembly MicroVM</code></div>
              <div>RUNTIME: <code>Node v16.2.9</code></div>
              <div>ENVIRONMENT: <code>{process.env.NODE_ENV || "development"}</code></div>
            </div>
          </div>
 
          <div>
            <div className="text-neon-green font-bold mb-1.5 flex items-center gap-1">
              <span>┌─ SECURITY TRUST </span>
              <span className="flex-1 border-t border-dashed border-white/10 ml-1"></span>
            </div>
            <div className="space-y-1 pl-2">
              <div>L0 SECURITY: <code>HIGH_SHIELD</code></div>
              <div>PROVENANCE: <code>SIGNED</code></div>
              <div>ATTEMPTS: <code>RATE_LIMITED</code></div>
              <div>ATTENTIVENESS: <code>9.8/10</code></div>
            </div>
          </div>
 
          <div>
            <div className="text-axiom-purple font-bold mb-1.5 flex items-center gap-1">
              <span>┌─ ACTIVE MODULES </span>
              <span className="flex-1 border-t border-dashed border-white/10 ml-1"></span>
            </div>
            <div className="space-y-1 pl-2">
              <div>⎔ <code>pg-connector.mcp</code> [UP]</div>
              <div>⎔ <code>github-operator.mcp</code> [UP]</div>
              <div>⎔ <code>verify-stamp.did</code> [UP]</div>
            </div>
          </div>
        </div>
 
        {/* PANEL 2: Central Interactive Log Terminal */}
        <div className="flex-1 flex flex-col min-w-0 bg-black/20">
          {/* Header Controls */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#0a0a0f]">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-neon-green" />
              <span className="text-xs font-mono font-bold text-surface tracking-wider">{t('terminal_title')}</span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/5 text-faint">
                {logs.length + walletLogs.length} LOGS
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={onClear}
                className="text-[10px] font-mono transition-all px-3 py-1.5 rounded border border-white/5 hover:border-white/20 hover:bg-white/5 flex items-center gap-1.5"
                style={{ color: "var(--text-muted)" }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t('terminal_clear')}
              </button>
              <button
                onClick={onRunTest}
                className="text-[10px] font-mono text-neon-green transition-all px-3 py-1.5 rounded border border-neon-green/20 hover:border-neon-green/40 hover:bg-neon-green/10 flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                {t('terminal_run_test')}
              </button>
              <button
                onClick={onClose}
                className="transition-colors ms-1 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5"
                style={{ color: 'var(--text-muted)' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
 
          {/* Scrollable Logs Output */}
          <div ref={scrollRef} className="overflow-y-auto flex-1 p-4 font-mono text-[10px] leading-relaxed scrollbar-thin space-y-1.5 selection:bg-neon-green/20">
            {visibleLogs.map((line, i) => (
              <div key={`init-${i}`} className="flex items-start gap-2 border-l border-white/5 pl-2">
                <span className="text-electric-blue select-none shrink-0">⎔</span>
                <span className="text-subtle">{line}</span>
              </div>
            ))}
            
            {visibleWalletLogs.map((line, i) => (
              <div key={`wallet-${i}`} className="flex items-start gap-2 border-l border-neon-green/20 pl-2">
                <span className="text-neon-green select-none shrink-0">⚡</span>
                <span className="text-neon-green/80">{line}</span>
              </div>
            ))}
 
            {walletLogs.length === 0 && logs.length <= 1 && (
              <div className="italic mt-2 flex items-center gap-2 text-faint">
                <span className="animate-ping w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>{t('terminal_waiting')}</span>
              </div>
            )}
            
            {/* Blinking cursor */}
            <div className="flex items-center gap-1 mt-3">
              <span className="text-neon-green select-none font-bold">❯</span>
              <span className="w-2.5 h-4 bg-neon-green/70 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
 
      {/* ── BOTTOM TUI KEYBINDINGS HELP BAR (Lazygit Style) ── */}
      <div className="bg-[#050508] border-t border-white/5 px-4 py-2 font-mono text-[9px] text-faint select-none">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <span><kbd className="bg-white/10 text-surface px-1 rounded mr-1 font-sans">Esc</kbd> {language === "ar" ? "إغلاق" : "Exit"}</span>
          <span><kbd className="bg-neon-green/20 text-neon-green px-1 rounded mr-1 font-sans">Space</kbd> {t('terminal_run_test')}</span>
          <span><kbd className="bg-white/10 text-surface px-1 rounded mr-1 font-sans">Ctrl+L</kbd> {t('terminal_clear')}</span>
          <span className="hidden sm:inline"><kbd className="bg-white/10 text-surface px-1 rounded mr-1 font-sans">F1</kbd> {language === "ar" ? "دليل المساعدة" : "Help Docs"}</span>
          <span className="hidden sm:inline"><kbd className="bg-white/10 text-surface px-1 rounded mr-1 font-sans">Tab</kbd> {language === "ar" ? "تبديل النوافذ" : "Switch Pane"}</span>
        </div>
      </div>
    </motion.div>
  );
}
