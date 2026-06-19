"use client";

import { Puzzle } from "lucide-react";
import { useLanguage } from "@/app/context/language-context";

interface SkillsCardProps {
  skills: Array<{ name: string }>;
}

export function SkillsCard({ skills }: SkillsCardProps) {
  const { t } = useLanguage();
  return (
    <div className="bento-card p-5">
      <h3 className="text-xs uppercase tracking-wider font-semibold mb-4" style={{ color: 'var(--text-muted)' }}>
        <Puzzle className="w-3.5 h-3.5 inline me-1.5" style={{ color: 'var(--text-muted)' }} />
        {t('skills')}
      </h3>
      <div className="flex flex-wrap gap-2">
        {skills.length > 0 ? (
          skills.map((skill) => (
            <span
              key={skill.name}
              className="px-2.5 py-1 rounded-md text-xs font-mono cursor-default"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}
            >
              {skill.name}
            </span>
          ))
        ) : (
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{t('no_skills_installed')}</span>
        )}
      </div>
    </div>
  );
}
