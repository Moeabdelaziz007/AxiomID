"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useLanguage } from "@/app/context/language-context";

interface FooterProps {
  minimal?: boolean;
  copyright?: string;
}

/**
 * Shared Footer component for all AxiomID pages.
 * Supports standard navigation links and a minimal mode for legal/utility pages.
 */
export default function Footer({ minimal = false, copyright }: FooterProps) {
  const { t } = useLanguage();
  const defaultCopy = "© 2026 AxiomID. All rights reserved.";

  if (minimal) {
    return (
      <footer 
        className="w-full border-t py-6 px-6 text-[10px] font-mono text-center mt-12 bg-[#10131a]" 
        style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
      >
        {copyright || defaultCopy}
      </footer>
    );
  }

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "100px" }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-center mt-16 sm:mt-24 py-8 border-t text-[11px] font-mono z-10 gap-6 px-4 sm:px-6 mx-auto bg-[#10131a] transition-colors duration-300"
      style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
    >
      <div className="flex flex-col items-center md:items-start gap-1 text-center md:text-left" style={{ color: 'var(--text-secondary)' }}>
        <span>{copyright || defaultCopy}</span>
        <span className="text-[9px] text-zinc-400 uppercase tracking-widest">Built by Mohamed Abdelaziz · Open Source on GitHub</span>
      </div>
      <nav aria-label="Footer navigation" className="flex flex-wrap gap-6 justify-center items-center">
        <Link href="/privacy" className="relative text-zinc-300 hover:text-white transition-colors group focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:outline-none rounded">
          {t("nav_privacy")}
          <span className="absolute -bottom-1 left-0 w-0 h-px bg-electric-blue transition-all group-hover:w-full" />
        </Link>
        <Link href="/terms" className="relative text-zinc-300 hover:text-white transition-colors group focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:outline-none rounded">
          {t("nav_terms")}
          <span className="absolute -bottom-1 left-0 w-0 h-px bg-electric-blue transition-all group-hover:w-full" />
        </Link>
        <a
          href="https://github.com/Moeabdelaziz007/AxiomID"
          target="_blank"
          rel="noopener noreferrer"
          className="relative text-zinc-300 hover:text-white transition-colors group focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:outline-none rounded flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.305-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
          GitHub
          <span className="absolute -bottom-1 left-0 w-0 h-px bg-electric-blue transition-all group-hover:w-full" />
        </a>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-300">
          <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
          <span className="text-[9px] uppercase tracking-tighter font-semibold">v{process.env.NEXT_PUBLIC_APP_VERSION || "0.1.2"}</span>
        </div>
      </nav>
    </motion.footer>
  );
}
