/**
 * SOUL — Divine Loop Control Architecture
 *
 * "وَيَسْأَلُونَكَ عَنِ الرُّوحِ ۖ قُلِ الرُّوحُ مِنْ أَمْرِ رَبِّي وَمَا أُوتِيتُم مِّنَ الْعِلْمِ إِلَّا قَلِيلًا"
 * "And they ask you about the soul. Say: The soul is of the affair of my Lord, and you have not been given of knowledge except a little."
 * — Al-Isra 17:85
 *
 * The SOUL system is the loop control architecture that prevents infinite loops,
 * enforces ethical boundaries, and creates self-correcting agents.
 *
 * Modules:
 * - Muraqabah (المراقبة) — Divine Surveillance
 * - Sabiyyah (حكمة السبع) — Pattern synthesis every 7 cycles
 * - Barakah (البركة) — Impact amplification at 700 successes
 * - Tawbah (التوبة) — Self-correction protocol
 * - Ethical Check (الإحسان) — 6-step verification
 * - Soul Loop — Unified loop controller
 */

export { muraqabahEvaluate, createMuraqabahLog } from './muraqabah';
export type { MuraqabahCheck, MuraqabahConfig } from './muraqabah';

export { sabiyyahReflect, createSabiyyahLog } from './sabiyyah';
export type { LoopState, SabiyyahResult, SabiyyahConfig } from './sabiyyah';

export { barakahCheck, barakahMultiplier, createBarakahLog } from './barakah';
export type { BarakahCheck, BarakahConfig } from './barakah';

export { tawbahProcess, createTawbahLog } from './tawbah';
export type { TawbahResult, TawbahConfig, ErrorType } from './tawbah';

export { ethicalCheck, semanticIntentCheck, createEthicalCheckLog } from './ethical-check';
export type { EthicalCheckResult, EthicalCheckConfig, EthicalVerdict } from './ethical-check';

export { semanticIntentAnalysis } from './semantic-intent';

export { SoulLoop, createSoulLoopLog } from './soul-loop';
export type { SoulLoopConfig, SoulLoopState, SoulLoopDecision, SoulLoopAuditEntry } from './soul-loop';
