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
    en: 'Muraqabah',
    ar: 'المراقبة',
    color: '#22c55e',
    description: 'Divine Awareness — every action is observed and recorded.',
  },
  TAWBAH: {
    en: 'Tawbah',
    ar: 'التوبة',
    color: '#3b82f6',
    description: 'Self-Correction — admit bugs, fix root causes, add guards.',
  },
  TRUSTCHAIN: {
    en: 'TrustChain',
    ar: 'الحارس',
    color: '#6366f1',
    description: 'The Guardian — append-only logs, hash chains, tamper evidence.',
  },
  TASBIH: {
    en: 'Tasbih',
    ar: 'التثليث',
    color: '#f59e0b',
    description: 'Three retry cycles — not two, not infinite. Exponential backoff.',
  },
  SABIYYAH: {
    en: "Sab'iyyah",
    ar: 'حكمة السبع',
    color: '#ec4899',
    description: 'Cycle Learning — every 7 cycles, synthesize holistically.',
  },
  BARAKAH: {
    en: 'Barakah',
    ar: 'البركة',
    color: '#14b8a6',
    description: 'Milestone Multiplication — consistency compounds at scale.',
  },
};

export const SOUL_PRINCIPLE_LIST = Object.entries(SOUL_PRINCIPLES).map(([key, meta]) => ({
  key: key as SoulPrincipleKey,
  ...meta,
}));
