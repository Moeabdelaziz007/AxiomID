/**
 * AlphaPi v0.1 — Loop Engine
 *
 * The 7-step reflection loop: OBSERVE → REFLECT → GENERATE → EVALUATE
 * → SELECT → RECORD → REPEAT
 *
 * Research basis:
 * - Reflexion (arxiv:2303.11366): verbal reflection on feedback → episodic memory → better decisions
 * - Anthropic Global Workspace (2026): counterfactual reflection shapes behavior
 * - Self-Improvements Survey (arxiv:2607.13104): self-induced update operator on scaffold
 * - SAHOO (arxiv:2603.06333): drift detection prevents alignment drift
 * - Self-Repair (arxiv:2306.09896): external signals (tests) matter more than self-judgment
 */

// Lightweight SHA-256 substitute for TrustChain integrity.
// Uses a simple FNV-1a hash for environments without node:crypto.
// In production, replace with @pai/reputation TrustChain's real hash.
function simpleHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // Extend to 64-char hex-like string for consistency
  const base = (hash >>> 0).toString(16).padStart(8, "0");
  return base.repeat(8);
}
import type {
  AlphaPiConfig,
  Candidate,
  EvaluationResult,
  LoopRecord,
  LoopResult,
  Reflection,
  StateSnapshot,
} from "./types.js";
import {
  computeReward,
  computeScore,
  detectDrift,
  isPlateau,
} from "./reward.js";

/**
 * Observer interface — how the loop reads the world.
 * Implement this to connect AlphaPi to your system (CI, tests, trust score).
 */
export interface Observer {
  observe(target: string): Promise<StateSnapshot>;
}

/**
 * Reflector interface — how the loop generates counterfactual reflections.
 * Implement this with an LLM call (e.g., DeepSeek, GLM, Claude).
 */
export interface Reflector {
  reflect(state: StateSnapshot, goal: string): Promise<Reflection>;
}

/**
 * Generator interface — how the loop produces candidate improvements.
 * Implement this with an LLM that generates code/config changes.
 */
export interface Generator {
  generate(reflection: Reflection, state: StateSnapshot, count: number): Promise<Candidate[]>;
}

/**
 * Evaluator interface — how the loop tests candidates.
 * Implement this to run tests, lint, type-check on each candidate.
 */
export interface Evaluator {
  evaluate(candidate: Candidate, state: StateSnapshot): Promise<EvaluationResult>;
}

/**
 * Recorder interface — how the loop records to TrustChain.
 * Implement this to connect to @pai/reputation TrustChain.
 */
export interface Recorder {
  record(record: LoopRecord): Promise<void>;
}

/**
 * The AlphaPi Loop Engine.
 *
 * Usage:
 *   const loop = new AlphaPiLoop({
 *     observer: new MyObserver(),
 *     reflector: new MyReflector(),
 *     generator: new MyGenerator(),
 *     evaluator: new MyEvaluator(),
 *     recorder: new MyRecorder(),
 *     config: { ...DEFAULT_CONFIG, goal: "Improve test pass rate to 95%" },
 *   });
 *   const result = await loop.run();
 */
export class AlphaPiLoop {
  constructor(
    private readonly deps: {
      observer: Observer;
      reflector: Reflector;
      generator: Generator;
      evaluator: Evaluator;
      recorder?: Recorder;
    },
    private readonly config: AlphaPiConfig,
  ) {}

  /**
   * Run the loop until: goal achieved, plateau, max iterations, or drift.
   */
  async run(): Promise<LoopResult> {
    const records: LoopRecord[] = [];
    const rewards: number[] = [];
    let previousHash: string | null = null;
    let currentState = await this.deps.observer.observe(this.config.target);
    const initialScore = this.scoreState(currentState);
    let bestIteration = 0;
    let bestReward = -Infinity;
    let consecutivePlateau = 0;

    for (let i = 1; i <= this.config.maxIterations; i++) {
      // Step 1: OBSERVE
      currentState = await this.deps.observer.observe(this.config.target);

      // Step 2: REFLECT
      const reflection = await this.deps.reflector.reflect(currentState, this.config.goal);

      // Step 3: GENERATE
      const candidates = await this.deps.generator.generate(
        reflection,
        currentState,
        this.config.candidateCount,
      );

      // Step 4: EVALUATE
      const evaluations: EvaluationResult[] = [];
      for (const candidate of candidates) {
        const evalResult = await this.deps.evaluator.evaluate(candidate, currentState);

        // Drift detection (SAHOO)
        if (this.config.driftDetection) {
          const drift = detectDrift(evalResult, currentState.testPassRate);
          evalResult.driftDetected = drift.detected;
          evalResult.driftDetails = drift.details;
        }

        // Compute composite score
        evalResult.score = computeScore(
          evalResult.testPassRate,
          evalResult.lintErrors,
          evalResult.typeErrors,
          evalResult.trustDelta,
          this.config.rewardWeights,
        );

        evaluations.push(evalResult);
      }

      // Step 5: SELECT (highest score, no drift)
      let selectedIndex = -1;
      let bestScore = -Infinity;
      for (let j = 0; j < evaluations.length; j++) {
        if (evaluations[j].driftDetected) continue; // skip drifted candidates
        if (evaluations[j].score > bestScore) {
          bestScore = evaluations[j].score;
          selectedIndex = j;
        }
      }

      // Step 6: RECORD
      const reward =
        selectedIndex >= 0
          ? computeReward(currentState, evaluations[selectedIndex])
          : 0;

      rewards.push(reward);

      if (reward > bestReward) {
        bestReward = reward;
        bestIteration = i;
      }

      const record: LoopRecord = {
        iteration: i,
        goal: this.config.goal,
        observedState: currentState,
        reflection,
        candidates,
        evaluations,
        selectedIndex,
        expected: selectedIndex >= 0 ? candidates[selectedIndex].description : "No improvement found",
        actual:
          selectedIndex >= 0
            ? `Score: ${evaluations[selectedIndex].score.toFixed(3)}, Reward: ${reward.toFixed(4)}`
            : "No non-drifted candidate selected",
        reward,
        driftDetected: selectedIndex >= 0 ? evaluations[selectedIndex].driftDetected : false,
        timestamp: new Date().toISOString(),
        hash: "",
        previousHash,
      };

      // Compute hash for TrustChain integrity
      record.hash = this.computeHash(record);
      previousHash = record.hash;

      if (this.config.recordToTrustChain && this.deps.recorder) {
        await this.deps.recorder.record(record);
      }

      records.push(record);

      // Step 7: Check stop conditions
      // Goal achieved?
      if (this.isGoalAchieved(currentState, evaluations, selectedIndex)) {
        return this.buildResult(records, currentState, rewards, "goal_achieved", bestIteration);
      }

      // Plateau?
      if (isPlateau(rewards, this.config.plateauThreshold, this.config.plateauPatience)) {
        return this.buildResult(records, currentState, rewards, "plateau", bestIteration);
      }

      // Drift in selected candidate?
      if (selectedIndex >= 0 && evaluations[selectedIndex].driftDetected) {
        consecutivePlateau++;
        if (consecutivePlateau >= this.config.plateauPatience) {
          return this.buildResult(records, currentState, rewards, "drift", bestIteration);
        }
      } else {
        consecutivePlateau = 0;
      }
    }

    return this.buildResult(records, currentState, rewards, "max_iterations", bestIteration);
  }

  private scoreState(state: StateSnapshot): number {
    return computeScore(
      state.testPassRate,
      state.lintErrors,
      state.typeErrors,
      0,
      this.config.rewardWeights,
    );
  }

  private isGoalAchieved(
    state: StateSnapshot,
    evaluations: EvaluationResult[],
    selectedIndex: number,
  ): boolean {
    // Simple heuristic: if goal contains a percentage and we reached it
    const goalMatch = this.config.goal.match(/(\d+(?:\.\d+)?)%/);
    if (goalMatch && selectedIndex >= 0) {
      const target = parseFloat(goalMatch[1]) / 100;
      return evaluations[selectedIndex].testPassRate >= target;
    }
    // If no explicit target, consider goal achieved if reward > 0.1
    return selectedIndex >= 0 && evaluations[selectedIndex].score > 0.95;
  }

  private computeHash(record: LoopRecord): string {
    const content = JSON.stringify({
      i: record.iteration,
      g: record.goal,
      s: record.reward,
      t: record.timestamp,
      p: record.previousHash,
    });
    return simpleHash(content);
  }

  private buildResult(
    records: LoopRecord[],
    finalState: StateSnapshot,
    rewards: number[],
    stopReason: LoopResult["stopReason"],
    bestIteration: number,
  ): LoopResult {
    const totalReward = rewards.reduce((a, b) => a + b, 0);
    const initialScore = records.length > 0
      ? this.scoreState(records[0].observedState)
      : 0;
    const finalScore = this.scoreState(finalState);

    return {
      records,
      finalState,
      totalReward,
      stopReason,
      bestIteration,
      improved: finalScore > initialScore,
    };
  }
}
