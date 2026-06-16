"use client";

import { motion } from "framer-motion";
import { Puzzle } from "lucide-react";
import { useLanguage } from "@/app/context/language-context";

interface SkillsCardProps {
  skills: Array<{ name: string }>;
}

export function SkillsCard({ skills }: SkillsCardProps) {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 }}
      className="bento-card p-5"
    >
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <Puzzle className="w-4 h-4 text-axiom-purple" />
        {t('skills')}
      </h3>
      <div className="flex flex-wrap gap-2">
        {skills.length > 0 ? (
          skills.map((skill) => (
            <motion.span
              key={skill.name}
              whileHover={{ scale: 1.05 }}
              className="px-3 py-1.5 rounded-full bg-axiom-purple/10 text-axiom-purple text-xs font-mono border border-axiom-purple/20 cursor-default"
            >
              {skill.name}
            </motion.span>
          ))
        ) : (
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{t('no_skills_installed')}</span>
        )}
      </div>
    </motion.div>
  );
}
