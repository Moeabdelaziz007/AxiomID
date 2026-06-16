"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Fingerprint, ClipboardCopy, ArrowRight } from "lucide-react";

interface QuickLinksCardProps {
  passportSlug: string;
}

export function QuickLinksCard({ passportSlug }: QuickLinksCardProps) {
  const links = [
    {
      label: "View Passport",
      href: `/passport/${passportSlug}` as const,
      icon: <Fingerprint className="w-4 h-4" />,
      color: "hover:text-neon-green hover:border-neon-green/30",
    },
    {
      label: "DID Document",
      href: `/passport/${passportSlug}` as const,
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
      <h3 className="text-sm font-semibold text-white mb-4">Quick Links</h3>
      <div className="space-y-2">
        {links.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className={`flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02] transition-colors group ${link.color}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-gray-400 group-hover:scale-110 transition-transform">{link.icon}</span>
              <span className="text-sm text-gray-400 group-hover:text-white transition-colors">{link.label}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 group-hover:translate-x-1 transition-all" />
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
