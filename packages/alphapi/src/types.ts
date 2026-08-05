/**
 * AlphaPi v0.1 — Core Types
 *
 * The 7-step reflection loop for self-improving agent skills.
 * Research basis: Reflexion (arxiv:2303.11366), Anthropic Global Workspace (2026),
 * Self-Improvements Survey (arxiv:2607.13104), SAHOO drift detection (arxiv:2603.06333).
 *
 * @pai/alphapi — Pi Agentic Infrastructure
 */

// ─── State Observation ───────────────────────────────────────────────

export interface StateSnapshot {
  /** Timestamp of observation (ISO 8601) */
  timestamp: string;
  /** What is being improved (e.g., "packages/atom", "skill:pi-kya-verify") */
  target: string;
  /** Current test pass rate 0..1 */
  testPassRate: number;
  /** Lint errors count (0 = clean) */
  lintErrors: number;
  /** TypeScript errors count (0 = clean) */
  typeErrors: number;
  /** Current trust score 0..1 (from TrustChain / EigenvectorReputation) */
  trustScore: number;
  /** CI status: "passing" | "failing" | "unknown" */
  ciStatus: "passing" | "failing" | "unknown";
  /** External review comments (CodeRabbit, Gemini, human) — summary */
  reviewSignals: ReviewSignal[];
  /** Git SHA of current state */
  gitSha: string;
}

export interface ReviewSignal {
  source: "coderabbit" | "gemini" | "human" | "ci";
  severity: "P0" | "P1" | "P2" | "info";
  message: string;
  resolved: boolean;
}

// ─── Reflection ──────────────────────────────────────────────────────

export interface Reflection {
  /** The counterfactual question asked: "If asked about X, what would I say?" */
  question: string;
  /** The agent's verbal reflection (natural language) */
  text: string;
  /** Concepts surfaced in the workspace (analogous to J-space tokens) */
  concepts: string[];
  /** Confidence in the reflection 0..1 */
  confidence: number;
}

// ─── Candidate Generation ────────────────────────────────────────────

export interface Candidate {
  /** Unique ID for this candidate */
  id: string;
  /** What change is proposed (natural language description) */
  description: string;
  /** The actual code/config change (diff or full content) */
  patch: string;
  /** Which reflection concept motivated this candidate */
  motivatedBy: string;
  /** Predicted score (before evaluation) */
  predictedScore: number;
}

// ─── Evaluation ──────────────────────────────────────────────────────

export interface EvaluationResult {
  candidateId: string;
  /** Did it pass the original tests? */
  passesOriginalTests: boolean;
  /** Test pass rate after applying this candidate 0..1 */
  testPassRate: number;
  /** Lint errors after applying */
  lintErrors: number;
  /** Type errors after applying */
  typeErrors: number;
  /** Trust score delta (after - before) */
  trustDelta: number;
  /** Composite score 0..1 */
  score: number;
  /** Was drift detected? (from SAHOO) */
  driftDetected: boolean;
  /** Drift details if detected */
  driftDetails: string | null;
}

// ─── Loop Record (TrustChain entry) ──────────────────────────────────

export interface LoopRecord {
  /** Iteration number (starts at 1) */
  iteration: number;
  /** The goal of this loop (e.g., "Improve test pass rate to 95%") */
  goal: string;
  /** State at start of iteration */
  observedState: StateSnapshot;
  /** The reflection generated */
  reflection: Reflection;
  /** All candidates considered */
  candidates: Candidate[];
  /** Evaluation results for each candidate */
  evaluations: EvaluationResult[];
  /** Index of selected candidate in candidates array (-1 = none selected) */
  selectedIndex: number;
  /** What we expected to happen */
  expected: string;
  /** What actually happened */
  actual: string;
  /** Reward = score_after - score_before */
  reward: number;
  /** Whether drift was detected in the selected candidate */
  driftDetected: boolean;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** SHA-256 hash of this record (for TrustChain integrity) */
  hash: string;
  /** Hash of previous record (null for first) */
  previousHash: string | null;
}

// ─── Loop Configuration ──────────────────────────────────────────────

export interface AlphaPiConfig {
  /** The goal statement for this loop */
  goal: string;
  /** Target being improved */
  target: string;
  /** Max iterations before stopping */
  maxIterations: number;
  /** Stop if reward is below this for N consecutive iterations */
  plateauThreshold: number;
  /** Number of consecutive low-reward iterations before stopping */
  plateauPatience: number;
  /** Number of candidates to generate per iteration */
  candidateCount: number;
  /** Reward function weights (must sum to 1.0) */
  rewardWeights: RewardWeights;
  /** Drift detection enabled */
  driftDetection: boolean;
  /** TrustChain recording enabled */
  recordToTrustChain: boolean;
}

export interface RewardWeights {
  /** Weight for test pass rate (default: 0.5) */
  testPassRate: number;
  /** Weight for lint cleanliness (default: 0.2) */
  lintClean: number;
  /** Weight for type-check cleanliness (default: 0.15) */
  typeCheckClean: number;
  /** Weight for trust score delta (default: 0.15) */
  trustDelta: number;
}

// ─── Loop Result ─────────────────────────────────────────────────────

export interface LoopResult {
  /** All iterations executed */
  records: LoopRecord[];
  /** Final state after loop completed */
  finalState: StateSnapshot;
  /** Total reward accumulated */
  totalReward: number;
  /** Why the loop stopped */
  stopReason: "goal_achieved" | "plateau" | "max_iterations" | "drift" | "error";
  /** Best iteration (highest reward) */
  bestIteration: number;
  /** Did the loop improve the target? */
  improved: boolean;
}

// ─── Default Config ──────────────────────────────────────────────────

export const DEFAULT_CONFIG: AlphaPiConfig = {
  goal: "",
  target: "",
  maxIterations: 10,
  plateauThreshold: 0.01,
  plateauPatience: 3,
  candidateCount: 3,
  rewardWeights: {
    testPassRate: 0.5,
    lintClean: 0.2,
    typeCheckClean: 0.15,
    trustDelta: 0.15,
  },
  driftDetection: true,
  recordToTrustChain: true,
};
