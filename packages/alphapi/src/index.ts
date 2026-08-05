/**
 * AlphaPi v0.1 — Public API
 *
 * @pai/alphapi — The reflection loop engine for self-improving agent skills.
 */

export { AlphaPiLoop } from "./loop.js";
export type {
  Observer,
  Reflector,
  Generator,
  Evaluator,
  Recorder,
} from "./loop.js";

export {
  computeScore,
  computeReward,
  computeLintScore,
  computeTypeCheckScore,
  clamp01,
  detectDrift,
  isPlateau,
  DEFAULT_WEIGHTS,
} from "./reward.js";

export type {
  StateSnapshot,
  ReviewSignal,
  Reflection,
  Candidate,
  EvaluationResult,
  LoopRecord,
  AlphaPiConfig,
  RewardWeights,
  LoopResult,
} from "./types.js";

export { DEFAULT_CONFIG } from "./types.js";
