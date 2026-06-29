import { ACTIONS, MAX_TRUST_SCORE } from '@/lib/actions';

interface CompletedAction {
  type: string;
  xp: number;
  timestamp: Date;
}

function computeDecay(lastActiveAt: Date | null): number {
  if (!lastActiveAt) return 0.8;
  const daysSinceActive = Math.floor(
    (Date.now() - lastActiveAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  const decaySteps = Math.floor(daysSinceActive / 90);
  return Math.max(0.8, 1.0 - (decaySteps * 0.1));
}

export function computeTrustScore(
  completedActions: CompletedAction[],
  stellarAnchored: boolean = false,
  lastActiveAt: Date | null = null,
): number {
  let rawScore = 0;

  for (const action of completedActions) {
    const actionDef = Object.values(ACTIONS).find(a => a.id === action.type);
    if (actionDef) rawScore += actionDef.weight;
  }

  // Cap mining_streak contribution at 5 months (5 × weight 5 = 25)
  const miningStreaks = completedActions.filter(a => a.type === 'mining_streak');
  if (miningStreaks.length > 5) {
    rawScore -= (miningStreaks.length - 5) * 5;
  }

  const decay = computeDecay(lastActiveAt);
  const anchorMultiplier = stellarAnchored ? 1.15 : 1.0;

  const score = Math.min(100, Math.max(0, Math.round(
    (rawScore / MAX_TRUST_SCORE) * 100 * decay * anchorMultiplier
  )));

  return score;
}
