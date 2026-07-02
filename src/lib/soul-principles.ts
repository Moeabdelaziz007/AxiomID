/**
 * SOUL Protocol — Skill Alignment Metadata
 *
 * Maps each SOUL principle to its Arabic name, color, and description.
 * Used by SoulBadge component and skill filters.
 */

export type SoulPrincipleKey = 'MURAQABAH' | 'TAWBAH' | 'TRUSTCHAIN' | 'TASBIH' | 'SABIYYAH' | 'BARAKAH';

export interface SoulPrincipleMeta {
  en: string;
  ar: string;
  color: string;
  description: string;
}

export const SOUL_PRINCIPLES: Record<SoulPrincipleKey, SoulPrincipleMeta> = {
  MURAQABAH: {
    en: 'Vigilance',
    ar: 'اليقظة',
    color: '#22c55e',
    description: 'Divine Awareness — every action is observed and recorded.',
  },
  TAWBAH: {
    en: 'Correction',
    ar: 'التصحيح',
    color: '#3b82f6',
    description: 'Self-Correction — admit bugs, fix root causes, add guards.',
  },
  TRUSTCHAIN: {
    en: 'Ledger',
    ar: 'السجل',
    color: '#6366f1',
    description: 'The Guardian — append-only logs, hash chains, tamper evidence.',
  },
  TASBIH: {
    en: 'Triad',
    ar: 'الثلاثية',
    color: '#f59e0b',
    description: 'Three retry cycles — not two, not infinite. Exponential backoff.',
  },
  SABIYYAH: {
    en: 'Septet',
    ar: 'السباعية',
    color: '#ec4899',
    description: 'Cycle Learning — every 7 cycles, synthesize holistically.',
  },
  BARAKAH: {
    en: 'Compounding',
    ar: 'التراكم',
    color: '#14b8a6',
    description: 'Milestone Multiplication — consistency compounds at scale.',
  },
};

export const SOUL_PRINCIPLE_LIST = Object.entries(SOUL_PRINCIPLES).map(([key, meta]) => ({
  key: key as SoulPrincipleKey,
  ...meta,
}));
