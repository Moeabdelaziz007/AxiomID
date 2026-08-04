"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useLanguage } from "@/app/context/language-context";

interface FooterProps {
  minimal?: boolean;
  copyright?: string;
}

/**
 * Renders a localized footer with navigation links, version information, and copyright text.
 *
 * @param minimal - Whether to render the compact footer without navigation.
 * @param copyright - Optional copyright text displayed in place of the default.
 * @returns The rendered footer element.
 */
export default function Footer({ minimal = false, copyright }: FooterProps) {
  const { t } = useLanguage();
  const defaultCopy = "© 2026 AxiomID. All rights reserved.";

  if (minimal) {
    return (
      <footer 
        className="w-full border-t py-6 px-6 text-[10px] font-mono text-center mt-12 bg-surface-deep" 
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
      className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-center mt-16 sm:mt-24 py-8 border-t text-[11px] font-mono z-10 gap-6 px-4 sm:px-6 mx-auto bg-surface-deep transition-colors duration-300"
      style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
    >
      <div className="flex flex-col items-center md:items-start gap-1 text-center md:text-left" style={{ color: 'var(--text-secondary)' }}>
        <span>{copyright || defaultCopy}</span>
        <span className="text-[9px] text-faint uppercase tracking-widest">L0 Authority • Axiom Protocol</span>
      </div>
      <nav aria-label="Footer navigation" className="flex flex-wrap gap-6 justify-center items-center">
        <Link href="/privacy" className="relative text-subtle hover:text-white transition-colors group focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:outline-none rounded">
          {t("nav_privacy")}
          <span className="absolute -bottom-1 left-0 w-0 h-px bg-electric-blue transition-all group-hover:w-full" />
        </Link>
        <Link href="/terms" className="relative text-subtle hover:text-white transition-colors group focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:outline-none rounded">
          {t("nav_terms")}
          <span className="absolute -bottom-1 left-0 w-0 h-px bg-electric-blue transition-all group-hover:w-full" />
        </Link>
        <a 
          href="https://docs.axiomid.app" 
          target="_blank" 
          rel="noopener noreferrer"
          className="relative text-subtle hover:text-white transition-colors group focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:outline-none rounded"
        >
          {t("nav_docs")}
          <span className="absolute -bottom-1 left-0 w-0 h-px bg-electric-blue transition-all group-hover:w-full" />
        </a>
        <a 
          href="https://github.com/pai-list/AxiomID" 
          target="_blank" 
          rel="noopener noreferrer"
          className="relative text-subtle hover:text-white transition-colors group focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:outline-none rounded"
        >
          GitHub
          <span className="absolute -bottom-1 left-0 w-0 h-px bg-electric-blue transition-all group-hover:w-full" />
        </a>
        <a 
          href="https://github.com/pai-list" 
          target="_blank" 
          rel="noopener noreferrer"
          className="relative text-subtle hover:text-white transition-colors group focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:outline-none rounded"
        >
          PAI Universe
          <span className="absolute -bottom-1 left-0 w-0 h-px bg-electric-blue transition-all group-hover:w-full" />
        </a>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-glass border border-glass-hover text-subtle">
          <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
          <span className="text-[9px] uppercase tracking-tighter font-semibold">v{process.env.NEXT_PUBLIC_APP_VERSION || "0.1.2"}</span>
        </div>
      </nav>
    </motion.footer>
  );
}
