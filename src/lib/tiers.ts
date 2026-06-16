export type Tier = 'Visitor' | 'Citizen' | 'Validator' | 'Sovereign';

export const TIERS = {
  Visitor: 0,
  Citizen: 100,
  Validator: 500,
  Sovereign: 1000,
};

export const TIER_COLORS: Record<Tier, string> = {
  Visitor: '#64748b',
  Citizen: '#00ff41',
  Validator: '#00d4ff',
  Sovereign: '#a855f7',
};

export function getTierColor(tier: Tier): string {
  return TIER_COLORS[tier] ?? TIER_COLORS.Visitor;
}

export function getScoreColor(score: number): string {
  if (score >= 80) return '#00ff41';
  if (score >= 60) return '#00d4ff';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

export function calculateTier(xp: number): Tier {
  if (xp >= TIERS.Sovereign) return 'Sovereign';
  if (xp >= TIERS.Validator) return 'Validator';
  if (xp >= TIERS.Citizen) return 'Citizen';
  return 'Visitor';
}

export function getLevelProgress(xp: number, tier: Tier): number {
    let nextXP = 0;
    let currentThreshold = 0;

    switch (tier) {
      case 'Visitor':
        currentThreshold = TIERS.Visitor;
        nextXP = TIERS.Citizen;
        break;
      case 'Citizen':
        currentThreshold = TIERS.Citizen;
        nextXP = TIERS.Validator;
        break;
      case 'Validator':
        currentThreshold = TIERS.Validator;
        nextXP = TIERS.Sovereign;
        break;
      case 'Sovereign':
        return 100; // Max level
    }

    const range = nextXP - currentThreshold;
    const progress = xp - currentThreshold;
    return Math.min(100, Math.max(0, (progress / range) * 100));
}

export function getNextLevelXP(tier: Tier): number | null {
    switch (tier) {
      case 'Visitor': return TIERS.Citizen;
      case 'Citizen': return TIERS.Validator;
      case 'Validator': return TIERS.Sovereign;
      default: return null;
    }
}

