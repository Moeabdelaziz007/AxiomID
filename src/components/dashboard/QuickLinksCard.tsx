"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Fingerprint, ClipboardCopy, ArrowRight } from "lucide-react";
import { useLanguage } from "@/app/context/language-context";

interface QuickLinksCardProps {
  passportSlug: string;
  did?: string;
}

export function QuickLinksCard({ passportSlug, did }: QuickLinksCardProps) {
  const { t } = useLanguage();
  const links = [
    {
      label: t('view_passport'),
      href: `/passport/${passportSlug}` as const,
      icon: <Fingerprint className="w-4 h-4" />,
      color: "hover:text-neon-green hover:border-neon-green/30",
    },
    {
      label: t('did_document'),
      href: did ? `/api/did-document?did=${encodeURIComponent(did)}` : "/api/did-document",
      icon: <ClipboardCopy className="w-4 h-4" />,
      color: "hover:text-electric-blue hover:border-electric-blue/30",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="bento-card p-5"
    >
      <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{t('quick_links')}</h3>
      <div className="space-y-2">
        {links.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className={`flex items-center justify-between p-3 rounded-xl border transition-colors group ${link.color}`}
            style={{ borderColor: 'var(--card-border)', background: 'rgba(255,255,255,0.02)' }}
          >
            <div className="flex items-center gap-3">
              <span className="group-hover:scale-110 transition-transform" style={{ color: 'var(--text-muted)' }}>{link.icon}</span>
              <span className="text-sm transition-colors" style={{ color: 'var(--text-secondary)' }}>{link.label}</span>
            </div>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-all" style={{ color: 'var(--text-muted)' }} />
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
