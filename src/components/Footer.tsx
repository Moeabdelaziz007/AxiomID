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
        className="w-full border-t py-6 px-6 text-[10px] font-mono text-center mt-12" 
        style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}
      >
        {copyright || defaultCopy}
      </footer>
    );
  }

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-center mt-16 sm:mt-24 py-8 border-t text-xs font-mono z-10 gap-4 px-4 sm:px-6 mx-auto"
      style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
    >
      <div style={{ color: 'var(--text-muted)' }}>{copyright || defaultCopy}</div>
      <nav aria-label="Footer navigation" className="flex flex-wrap gap-4 justify-center">
        <Link href="/privacy" className="text-subtle hover:text-surface transition-colors">{t("nav_privacy")}</Link>
        <Link href="/terms" className="text-subtle hover:text-surface transition-colors">{t("nav_terms")}</Link>
        <span style={{ color: 'var(--text-muted)' }}>v0.1.0</span>
      </nav>
    </motion.footer>
  );
}
