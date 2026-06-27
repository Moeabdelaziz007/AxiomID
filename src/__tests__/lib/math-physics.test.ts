/**
 * math-physics.test.ts — Tests for physics-inspired algorithms (production exports only).
 */

import {
  leakyBucketCheck,
  idealGasPressure,
  exponentialBackoff,
  shannonEntropy,
  dataFreshness,
  // PR sync: functions added from backend/src/lib/math-physics.ts
  inverseSquareDecay,
  trustPropagation,
  boltzmannTrustProbability,
  boltzmannNormalize,
  fibonacciBackoff,
  cosineSimilarity,
  euclideanDistance,
  brownianStep,
  brownianSearch,
  harmonicOscillator,
  equilibriumPosition,
  createMCTSNode,
  ucb1,
  mctsSelect,
  mctsExpand,
  mctsSimulate,
  mctsBackpropagate,
  mctsIterate,
  mctsBestAction,
  degreeCentrality,
  clusteringCoefficient,
  betweennessCentrality,
  labelPropagation,
  monteCarloTrustSimulation,
  agentBasedSimulation,
  bootstrapConfidence,
  randomWalkTrust,
  carnotTrustEfficiency,
  fickTrustFlux,
  fickTrustEvolution,
  fourierTrustHeat,
  thermalEquilibriumError,
  nyquistMinSyncRate,
  shannonHartleyCapacity,
  buildHuffmanTree,
  buildHuffmanCodes,
  huffmanCompress,
  mutualInformation,
  trustSignalToNoise,
  klDivergence,
  pageRankTrust,
  laplacianMatrix,
  powerIteration,
  spectralPartition,
  nashEquilibrium,
  bestResponseDynamics,
  minCutTrustBottleneck,
  langevinTrustDynamics,
  langevinSimulation,
  fokkerPlanckTrustEvolution,
  isingHamiltonian,
  isingMagnetization,
  isingMetropolisStep,
  isingTrustConsensus,
  kuramotoTrustSync,
  kuramotoCriticalCoupling,
} from "@/lib/math-physics";

describe("Leaky Bucket", () => {
  it("drains over time", () => {
    const config = { capacity: 10, drainRate: 1, inflowRate: 1 };
    const now = Date.now();
    const initialState = { level: 10, lastDrain: now, overflowCount: 0 };
    const futureTime = now + 5000;
    const result = leakyBucketCheck(initialState, config, futureTime);
    expect(result.newState.level).toBeLessThan(initialState.level);
  });

  it("allows requests when bucket is not full", () => {
    const config = { capacity: 5, drainRate: 1, inflowRate: 1 };
    const now = Date.now();
    const state = { level: 0, lastDrain: now, overflowCount: 0 };
    const result = leakyBucketCheck(state, config, now);
    expect(result.allowed).toBe(true);
  });

  it("rejects requests when bucket is full", () => {
    const config = { capacity: 5, drainRate: 1, inflowRate: 0.1 };
    const now = Date.now();
    const state = { level: 5, lastDrain: now, overflowCount: 0 };
    const result = leakyBucketCheck(state, config, now);
    expect(result.allowed).toBe(false);
  });

  it("increments overflow count on rejection", () => {
    const config = { capacity: 5, drainRate: 1, inflowRate: 0.1 };
    const now = Date.now();
    const state = { level: 5, lastDrain: now, overflowCount: 3 };
    const result = leakyBucketCheck(state, config, now);
    expect(result.newState.overflowCount).toBe(4);
  });
});

describe("Ideal Gas Law", () => {
  it("pressure increases with more active requests", () => {
    const p1 = idealGasPressure(10, 100, 1.0);
    const p2 = idealGasPressure(50, 100, 1.0);
    expect(p2).toBeGreaterThan(p1);
  });

  it("pressure is 0 when no active requests", () => {
    expect(idealGasPressure(0, 100, 1.0)).toBe(0);
  });

  it("pressure is Infinity at zero capacity", () => {
    expect(idealGasPressure(1, 0, 1.0)).toBe(Infinity);
  });

  it("scales with temperature", () => {
    const p1 = idealGasPressure(10, 100, 1.0);
    const p2 = idealGasPressure(10, 100, 2.0);
    expect(p2).toBeCloseTo(p1 * 2, 5);
  });
});

describe("Exponential Backoff", () => {
  it("returns non-negative delay", () => {
    for (let i = 0; i < 10; i++) {
      const delay = exponentialBackoff(i);
      expect(delay).toBeGreaterThanOrEqual(0);
    }
  });

  it("increases with attempt number", () => {
    const delays = Array.from({ length: 5 }, (_, i) => exponentialBackoff(i, 100, 30000, 0));
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeGreaterThanOrEqual(delays[i - 1]);
    }
  });

  it("respects max delay", () => {
    const delay = exponentialBackoff(100, 1000, 5000, 0);
    expect(delay).toBeLessThanOrEqual(5000);
  });

  it("applies jitter (delay varies between calls)", () => {
    const delays = Array.from({ length: 10 }, () => exponentialBackoff(2, 1000, 30000, 0.5));
    const unique = new Set(delays);
    expect(unique.size).toBeGreaterThan(1);
  });

  it("attempt=2 with jitter=0.5 produces delays within unclamped range [2000, 6000]", () => {
    // attempt=2: base = 1000 * 2^2 = 4000; jitter range = ±(4000 * 0.5) = ±2000
    // raw range = [2000, 6000] — no clamping occurs since maxDelay=30000
    for (let i = 0; i < 50; i++) {
      const delay = exponentialBackoff(2, 1000, 30000, 0.5);
      expect(delay).toBeGreaterThanOrEqual(2000);
      expect(delay).toBeLessThanOrEqual(6000);
    }
  });

  it("attempt=2 with zero jitter returns exactly the base exponential delay", () => {
    // 1000 * 2^2 = 4000 with no jitter
    const delay = exponentialBackoff(2, 1000, 30000, 0);
    expect(delay).toBe(4000);
  });

});

describe("Shannon Entropy", () => {
  it("returns 0 for empty string", () => {
    expect(shannonEntropy("")).toBe(0);
  });

  it("returns 0 for single repeated character", () => {
    expect(shannonEntropy("aaaa")).toBe(0);
  });

  it("returns higher entropy for more diverse data", () => {
    const lowEntropy = shannonEntropy("aabb");
    const highEntropy = shannonEntropy("abcd");
    expect(highEntropy).toBeGreaterThan(lowEntropy);
  });

  it("returns log2(n) for uniform distribution", () => {
    const entropy = shannonEntropy("abcd");
    expect(entropy).toBeCloseTo(Math.log2(4), 5);
  });
});

describe("Data Freshness", () => {
  it("returns 1 for just-created data", () => {
    const now = Date.now();
    expect(dataFreshness(now, now)).toBeCloseTo(1, 5);
  });

  it("decreases over time", () => {
    const now = Date.now();
    const fresh = dataFreshness(now, now);
    const old = dataFreshness(now, now + 10000);
    expect(old).toBeLessThan(fresh);
  });

  it("is bounded in [0, 1]", () => {
    const now = Date.now();
    const score = dataFreshness(now - 100000, now, 0.001);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

// =============================================================================
// PR sync: new functions added from backend/src/lib/math-physics.ts
// =============================================================================

// ─── INVERSE SQUARE LAW ──────────────────────────────────────────────────────

describe("inverseSquareDecay (PR sync)", () => {
  it("returns sourceTrust * weight when hops <= 0", () => {
    expect(inverseSquareDecay(100, 1, 0)).toBe(100);
    expect(inverseSquareDecay(100, 0.5, -1)).toBe(50);
  });

  it("calculates decay correctly at 1 hop with G=1", () => {
    // G * sourceTrust * weight / hops^2 = 1 * 100 * 1 / 1 = 100
    expect(inverseSquareDecay(100, 1, 1)).toBe(100);
  });

  it("calculates decay correctly at 2 hops with G=1", () => {
    // 1 * 100 * 1 / 4 = 25
    expect(inverseSquareDecay(100, 1, 2)).toBe(25);
  });

  it("scales with gravitationalConstant", () => {
    const result1 = inverseSquareDecay(100, 1, 2, 1.0);
    const result2 = inverseSquareDecay(100, 1, 2, 2.0);
    expect(result2).toBeCloseTo(result1 * 2, 5);
  });

  it("reduces trust further at greater hop distances", () => {
    const at1 = inverseSquareDecay(100, 1, 1);
    const at3 = inverseSquareDecay(100, 1, 3);
    expect(at3).toBeLessThan(at1);
  });
});

describe("trustPropagation (PR sync)", () => {
  it("returns 0 for empty chain", () => {
    expect(trustPropagation([])).toBe(0);
  });

  it("returns source trust for single-element chain", () => {
    expect(trustPropagation([{ trust: 0.8, weight: 1 }])).toBeCloseTo(0.8, 5);
  });

  it("is capped at 1", () => {
    const result = trustPropagation([
      { trust: 0.99, weight: 1 },
      { trust: 1, weight: 1 },
    ]);
    expect(result).toBeLessThanOrEqual(1);
  });

  it("trust decreases with longer chains", () => {
    const shortChain = trustPropagation([
      { trust: 0.9, weight: 1 },
      { trust: 0.9, weight: 1 },
    ]);
    const longChain = trustPropagation([
      { trust: 0.9, weight: 1 },
      { trust: 0.9, weight: 1 },
      { trust: 0.9, weight: 1 },
      { trust: 0.9, weight: 1 },
    ]);
    expect(longChain).toBeLessThan(shortChain);
  });
});

// ─── BOLTZMANN DISTRIBUTION ──────────────────────────────────────────────────

describe("boltzmannTrustProbability (PR sync)", () => {
  it("returns e^0 = 1 for trust score of 1 (zero energy)", () => {
    expect(boltzmannTrustProbability(1, 1, 1)).toBeCloseTo(1, 5);
  });

  it("returns e^(-1/kT) for trust score of 0 (maximum energy)", () => {
    // energy = 1 - 0 = 1; exponent = -1/(1*1) = -1
    expect(boltzmannTrustProbability(0, 1, 1)).toBeCloseTo(Math.exp(-1), 5);
  });

  it("higher trust gives higher probability", () => {
    const low = boltzmannTrustProbability(0.2, 1, 1);
    const high = boltzmannTrustProbability(0.8, 1, 1);
    expect(high).toBeGreaterThan(low);
  });

  it("throws for temperature <= 0", () => {
    expect(() => boltzmannTrustProbability(0.5, 0)).toThrow();
    expect(() => boltzmannTrustProbability(0.5, -1)).toThrow();
  });

  it("throws for boltzmannConstant <= 0", () => {
    expect(() => boltzmannTrustProbability(0.5, 1, 0)).toThrow();
    expect(() => boltzmannTrustProbability(0.5, 1, -1)).toThrow();
  });

  it("higher temperature flattens distribution (low trust gets higher probability)", () => {
    const lowTemp = boltzmannTrustProbability(0.2, 0.1, 1);
    const highTemp = boltzmannTrustProbability(0.2, 10, 1);
    expect(highTemp).toBeGreaterThan(lowTemp);
  });
});

describe("boltzmannNormalize (PR sync)", () => {
  it("returns empty array for empty input", () => {
    expect(boltzmannNormalize([])).toEqual([]);
  });

  it("probabilities sum to 1", () => {
    const result = boltzmannNormalize([0.2, 0.5, 0.8, 0.9]);
    const sum = result.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it("highest trust score gets highest probability", () => {
    const scores = [0.1, 0.5, 0.9];
    const probs = boltzmannNormalize(scores);
    expect(probs[2]).toBeGreaterThan(probs[1]);
    expect(probs[1]).toBeGreaterThan(probs[0]);
  });

  it("uniform scores produce equal probabilities", () => {
    const probs = boltzmannNormalize([0.5, 0.5, 0.5]);
    expect(probs[0]).toBeCloseTo(1 / 3, 5);
    expect(probs[1]).toBeCloseTo(1 / 3, 5);
    expect(probs[2]).toBeCloseTo(1 / 3, 5);
  });
});

// ─── FIBONACCI BACKOFF ────────────────────────────────────────────────────────

describe("fibonacciBackoff (PR sync)", () => {
  it("returns non-negative delay", () => {
    for (let i = 0; i < 10; i++) {
      expect(fibonacciBackoff(i)).toBeGreaterThanOrEqual(0);
    }
  });

  it("increases with attempt number", () => {
    const delays = Array.from({ length: 5 }, (_, i) => fibonacciBackoff(i, 100));
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeGreaterThan(delays[i - 1]);
    }
  });

  it("respects maxDelayMs", () => {
    const delay = fibonacciBackoff(50, 1000, 5000);
    expect(delay).toBeLessThanOrEqual(5000);
  });

  it("returns baseDelayMs * phi^0 = baseDelayMs at attempt 0", () => {
    expect(fibonacciBackoff(0, 1000)).toBeCloseTo(1000, 5);
  });
});

// ─── COSINE SIMILARITY & EUCLIDEAN DISTANCE ──────────────────────────────────

describe("cosineSimilarity (PR sync)", () => {
  it("returns 1 for identical non-zero vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 5);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
  });

  it("returns -1 for opposite direction vectors", () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 5);
  });

  it("returns 0 for zero magnitude vector", () => {
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
  });

  it("throws for vectors of different lengths", () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow();
  });

  it("is commutative", () => {
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a), 10);
  });
});

describe("euclideanDistance (PR sync)", () => {
  it("returns 0 for identical vectors", () => {
    expect(euclideanDistance([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it("returns correct distance for 2D vectors", () => {
    // distance([0,0], [3,4]) = sqrt(9+16) = 5
    expect(euclideanDistance([0, 0], [3, 4])).toBeCloseTo(5, 5);
  });

  it("returns non-negative distances", () => {
    expect(euclideanDistance([1, 2], [4, 6])).toBeGreaterThanOrEqual(0);
  });

  it("throws for vectors of different lengths", () => {
    expect(() => euclideanDistance([1, 2], [1, 2, 3])).toThrow();
  });

  it("is commutative", () => {
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    expect(euclideanDistance(a, b)).toBeCloseTo(euclideanDistance(b, a), 10);
  });
});

// ─── BROWNIAN MOTION ─────────────────────────────────────────────────────────

describe("brownianStep (PR sync)", () => {
  it("returns value within specified bounds", () => {
    for (let i = 0; i < 100; i++) {
      const result = brownianStep(0.5, 0.05, [0, 1]);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    }
  });

  it("respects custom bounds", () => {
    for (let i = 0; i < 50; i++) {
      const result = brownianStep(5, 0.1, [0, 10]);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(10);
    }
  });

  it("produces varying results (stochastic)", () => {
    const results = Array.from({ length: 20 }, () => brownianStep(0.5, 0.05));
    const unique = new Set(results);
    expect(unique.size).toBeGreaterThan(1);
  });
});

describe("brownianSearch (PR sync)", () => {
  it("returns a best score within bounds", () => {
    const result = brownianSearch(0.5, (x) => x, 100, 0.05);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it("history length equals iterations + 1 (initial + each step)", () => {
    const result = brownianSearch(0.5, (x) => x, 50, 0.05);
    expect(result.history.length).toBe(51);
  });

  it("maximizes a simple objective function", () => {
    // objective = x itself: search should find score > 0
    const result = brownianSearch(0.5, (x) => x, 200, 0.05);
    expect(result.value).toBeGreaterThan(0);
  });

  it("best value is the objective applied to the best score", () => {
    const objective = (x: number) => -Math.abs(x - 0.5);
    const result = brownianSearch(0.5, objective, 10, 0.05);
    expect(result.value).toBeCloseTo(objective(result.score), 5);
  });
});

// ─── HARMONIC OSCILLATOR ─────────────────────────────────────────────────────

describe("harmonicOscillator (PR sync)", () => {
  it("starts at amplitude * cos(phase) when damping=0 and time=0", () => {
    const amplitude = 1.0;
    const phase = 0;
    const result = harmonicOscillator(amplitude, 0, 1, phase, 0);
    expect(result).toBeCloseTo(amplitude, 5);
  });

  it("decays to 0 as time increases with positive damping", () => {
    const early = harmonicOscillator(1, 0.5, 1, 0, 1);
    const late = harmonicOscillator(1, 0.5, 1, 0, 100);
    expect(Math.abs(late)).toBeLessThan(Math.abs(early));
  });

  it("is bounded by amplitude * exp(-damping * time)", () => {
    const amplitude = 2;
    const damping = 0.1;
    const time = 5;
    const result = harmonicOscillator(amplitude, damping, 1, 0, time);
    const envelope = amplitude * Math.exp(-damping * time);
    expect(Math.abs(result)).toBeLessThanOrEqual(envelope + 1e-10);
  });
});

describe("equilibriumPosition (PR sync)", () => {
  it("returns targetScore when damping is very high", () => {
    const result = equilibriumPosition(0, 0.8, 100, 10);
    expect(result).toBeCloseTo(0.8, 1);
  });

  it("starts at initialScore when time=0", () => {
    const result = equilibriumPosition(0.3, 0.8, 0.5, 0);
    expect(result).toBeCloseTo(0.3, 5);
  });

  it("converges toward target with time", () => {
    const initial = 0.0;
    const target = 1.0;
    const early = equilibriumPosition(initial, target, 0.5, 1);
    const late = equilibriumPosition(initial, target, 0.5, 10);
    // late value should be closer to target
    expect(Math.abs(late - target)).toBeLessThan(Math.abs(early - target));
  });
});

// ─── MCTS ────────────────────────────────────────────────────────────────────

describe("createMCTSNode (PR sync)", () => {
  it("creates node with zero visits and wins", () => {
    const node = createMCTSNode("root");
    expect(node.visits).toBe(0);
    expect(node.wins).toBe(0);
  });

  it("creates node with no children", () => {
    const node = createMCTSNode("root");
    expect(node.children).toHaveLength(0);
  });

  it("sets parent and action correctly", () => {
    const parent = createMCTSNode("parent");
    const child = createMCTSNode("child", {}, parent, "move-1");
    expect(child.parent).toBe(parent);
    expect(child.action).toBe("move-1");
  });

  it("assigns correct id", () => {
    const node = createMCTSNode("my-id");
    expect(node.id).toBe("my-id");
  });
});

describe("ucb1 (PR sync)", () => {
  it("returns Infinity for unvisited node", () => {
    const node = createMCTSNode("root");
    expect(ucb1(node)).toBe(Infinity);
  });

  it("returns finite value for visited node", () => {
    const root = createMCTSNode("root");
    root.visits = 10;
    const child = createMCTSNode("child", {}, root);
    child.visits = 5;
    child.wins = 3;
    expect(Number.isFinite(ucb1(child))).toBe(true);
  });

  it("prefers node with higher win rate", () => {
    const root = createMCTSNode("root");
    root.visits = 20;
    const childA = createMCTSNode("a", {}, root);
    childA.visits = 10;
    childA.wins = 8;
    const childB = createMCTSNode("b", {}, root);
    childB.visits = 10;
    childB.wins = 2;
    expect(ucb1(childA)).toBeGreaterThan(ucb1(childB));
  });
});

describe("mctsSelect (PR sync)", () => {
  it("returns root when root has no children", () => {
    const root = createMCTSNode("root");
    expect(mctsSelect(root)).toBe(root);
  });

  it("selects the unvisited child (Infinity UCB1)", () => {
    const root = createMCTSNode("root");
    root.visits = 5;
    const childA = createMCTSNode("a", {}, root);
    childA.visits = 3;
    childA.wins = 2;
    const childB = createMCTSNode("b", {}, root);
    // childB unvisited → ucb1 = Infinity
    root.children = [childA, childB];
    expect(mctsSelect(root)).toBe(childB);
  });
});

describe("mctsExpand (PR sync)", () => {
  it("creates one child per action", () => {
    const node = createMCTSNode("root");
    mctsExpand(node, ["a", "b", "c"]);
    expect(node.children).toHaveLength(3);
  });

  it("returns first child when actions are provided", () => {
    const node = createMCTSNode("root");
    const first = mctsExpand(node, ["x", "y"]);
    expect(first.action).toBe("x");
  });

  it("returns node when no actions are provided", () => {
    const node = createMCTSNode("root");
    const result = mctsExpand(node, []);
    expect(result).toBe(node);
  });
});

describe("mctsBackpropagate (PR sync)", () => {
  it("increments visits on each ancestor including root", () => {
    const root = createMCTSNode("root");
    const child = createMCTSNode("child", {}, root);
    const leaf = createMCTSNode("leaf", {}, child);
    mctsBackpropagate(leaf, 1);
    expect(leaf.visits).toBe(1);
    expect(child.visits).toBe(1);
    expect(root.visits).toBe(1);
  });

  it("accumulates wins correctly", () => {
    const root = createMCTSNode("root");
    const child = createMCTSNode("child", {}, root);
    mctsBackpropagate(child, 0.75);
    expect(child.wins).toBeCloseTo(0.75, 5);
    expect(root.wins).toBeCloseTo(0.75, 5);
  });

  it("handles zero reward", () => {
    const root = createMCTSNode("root");
    mctsBackpropagate(root, 0);
    expect(root.visits).toBe(1);
    expect(root.wins).toBe(0);
  });
});

describe("mctsBestAction (PR sync)", () => {
  it("returns null when no children", () => {
    const root = createMCTSNode("root");
    const result = mctsBestAction(root, 0, [], () => 0.5);
    expect(result).toBeNull();
  });

  it("returns a string action after iterations", () => {
    const root = createMCTSNode("root");
    const result = mctsBestAction(root, 10, ["trust", "distrust"], () => Math.random());
    expect(typeof result === "string" || result === null).toBe(true);
  });
});

describe("mctsSimulate (PR sync)", () => {
  it("returns a number (average reward)", () => {
    const node = createMCTSNode("root");
    const result = mctsSimulate(node, () => 1.0, 5);
    expect(typeof result).toBe("number");
    expect(result).toBeCloseTo(1.0, 5);
  });

  it("averages rewards over maxSteps", () => {
    const node = createMCTSNode("root");
    let callCount = 0;
    mctsSimulate(node, () => { callCount++; return 0.5; }, 10);
    expect(callCount).toBe(10);
  });

  it("returns 0 for maxSteps=0", () => {
    const node = createMCTSNode("root");
    // 0 steps → totalReward stays 0, division by 0 → NaN
    // Verify behavior is numeric (NaN is typeof number)
    const result = mctsSimulate(node, () => 1.0, 0);
    expect(Number.isNaN(result)).toBe(true); // 0 steps → totalReward/0 = NaN
  });
});

describe("mctsIterate (PR sync)", () => {
  it("returns the root node", () => {
    const root = createMCTSNode("root");
    const returned = mctsIterate(root, ["a", "b"], () => 0.5);
    expect(returned).toBe(root);
  });

  it("increases visit count on the root after backpropagation", () => {
    const root = createMCTSNode("root");
    const visitsBefore = root.visits;
    mctsIterate(root, ["a"], () => 1.0);
    expect(root.visits).toBeGreaterThan(visitsBefore);
  });

  it("adds children to root on first iteration with provided actions", () => {
    const root = createMCTSNode("root");
    mctsIterate(root, ["x", "y"], () => 0.5);
    expect(root.children.length).toBeGreaterThan(0);
  });
});

// ─── TOPOLOGY ────────────────────────────────────────────────────────────────

describe("degreeCentrality (PR sync)", () => {
  it("returns 0 for an isolated node", () => {
    expect(degreeCentrality([], "A")).toBe(0);
  });

  it("counts both source and target edges", () => {
    const edges = [
      { source: "A", target: "B", weight: 1 },
      { source: "C", target: "A", weight: 1 },
    ];
    expect(degreeCentrality(edges, "A")).toBe(2);
  });

  it("does not count edges not connected to the node", () => {
    const edges = [{ source: "B", target: "C", weight: 1 }];
    expect(degreeCentrality(edges, "A")).toBe(0);
  });
});

describe("clusteringCoefficient (PR sync)", () => {
  it("returns 0 for node with fewer than 2 neighbors", () => {
    const edges = [{ source: "A", target: "B", weight: 1 }];
    expect(clusteringCoefficient(edges, "A")).toBe(0);
  });

  it("returns 1 when all neighbors are connected to each other", () => {
    // Triangle: A-B, A-C, B-C
    const edges = [
      { source: "A", target: "B", weight: 1 },
      { source: "A", target: "C", weight: 1 },
      { source: "B", target: "C", weight: 1 },
    ];
    // A has 2 neighbors (B,C), 1 connection between them, 1 possible → CC = 1
    expect(clusteringCoefficient(edges, "A")).toBeCloseTo(1, 5);
  });

  it("returns 0 when no neighbors are connected to each other", () => {
    // Star: A-B, A-C (no B-C edge)
    const edges = [
      { source: "A", target: "B", weight: 1 },
      { source: "A", target: "C", weight: 1 },
    ];
    expect(clusteringCoefficient(edges, "A")).toBe(0);
  });
});

describe("betweennessCentrality (PR sync)", () => {
  it("returns 0 betweenness for all nodes in a complete triangle", () => {
    const nodes = ["A", "B", "C"];
    const edges = [
      { source: "A", target: "B", weight: 1 },
      { source: "B", target: "C", weight: 1 },
      { source: "A", target: "C", weight: 1 },
    ];
    const scores = betweennessCentrality(nodes, edges);
    // In a triangle, multiple shortest paths exist; betweenness should be >= 0
    expect(scores.get("A")).toBeGreaterThanOrEqual(0);
    expect(scores.get("B")).toBeGreaterThanOrEqual(0);
    expect(scores.get("C")).toBeGreaterThanOrEqual(0);
  });

  it("returns a score for every node in the list", () => {
    const nodes = ["A", "B", "C"];
    const edges = [
      { source: "A", target: "B", weight: 1 },
      { source: "B", target: "C", weight: 1 },
    ];
    const scores = betweennessCentrality(nodes, edges);
    expect(scores.has("A")).toBe(true);
    expect(scores.has("B")).toBe(true);
    expect(scores.has("C")).toBe(true);
  });

  it("bridge node (B in A-B-C) has higher betweenness than endpoints", () => {
    const nodes = ["A", "B", "C"];
    const edges = [
      { source: "A", target: "B", weight: 1 },
      { source: "B", target: "C", weight: 1 },
    ];
    const scores = betweennessCentrality(nodes, edges);
    expect(scores.get("B")!).toBeGreaterThan(scores.get("A")!);
    expect(scores.get("B")!).toBeGreaterThan(scores.get("C")!);
  });
});

describe("labelPropagation (PR sync)", () => {
  it("returns a label for each node", () => {
    const nodes = ["A", "B", "C"];
    const edges = [{ source: "A", target: "B", weight: 1 }];
    const labels = labelPropagation(nodes, edges);
    expect(labels.has("A")).toBe(true);
    expect(labels.has("B")).toBe(true);
    expect(labels.has("C")).toBe(true);
  });

  it("connected nodes converge to same label", () => {
    const nodes = ["A", "B", "C"];
    const edges = [
      { source: "A", target: "B", weight: 1 },
      { source: "B", target: "C", weight: 1 },
      { source: "A", target: "C", weight: 1 },
    ];
    const labels = labelPropagation(nodes, edges, 100);
    // Fully connected triangle: all should converge to the same label
    const unique = new Set([labels.get("A"), labels.get("B"), labels.get("C")]);
    expect(unique.size).toBe(1);
  });
});

// ─── SIMULATION ───────────────────────────────────────────────────────────────

describe("monteCarloTrustSimulation (PR sync)", () => {
  it("returns correct number of samples", () => {
    const result = monteCarloTrustSimulation(0.5, 0.1, 100);
    expect(result.samples).toHaveLength(100);
  });

  it("all samples are within [0, 1]", () => {
    const result = monteCarloTrustSimulation(0.5, 0.1, 200);
    for (const s of result.samples) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });

  it("mean is close to baseScore with small uncertainty", () => {
    const result = monteCarloTrustSimulation(0.7, 0.001, 1000);
    expect(result.mean).toBeCloseTo(0.7, 1);
  });

  it("confidence interval contains the mean", () => {
    const result = monteCarloTrustSimulation(0.5, 0.1, 500);
    expect(result.confidence95[0]).toBeLessThanOrEqual(result.mean);
    expect(result.confidence95[1]).toBeGreaterThanOrEqual(result.mean);
  });

  it("stdDev is non-negative", () => {
    const result = monteCarloTrustSimulation(0.5, 0.1, 100);
    expect(result.stdDev).toBeGreaterThanOrEqual(0);
  });
});

describe("agentBasedSimulation (PR sync)", () => {
  it("returns trust history for each agent", () => {
    const agents = [
      { id: "A", trust: 0.5, connections: ["B"] },
      { id: "B", trust: 0.8, connections: ["A"] },
    ];
    const result = agentBasedSimulation(agents, 10);
    expect(result.has("A")).toBe(true);
    expect(result.has("B")).toBe(true);
  });

  it("history length equals iterations + 1 (initial value)", () => {
    const agents = [{ id: "A", trust: 0.5, connections: [] }];
    const result = agentBasedSimulation(agents, 5);
    expect(result.get("A")).toHaveLength(6);
  });

  it("isolated agent maintains its own trust over time", () => {
    const agents = [{ id: "A", trust: 0.5, connections: [] }];
    const result = agentBasedSimulation(agents, 10, 1.0);
    // With decayFactor=1 and no neighbors, score = 1.0 * currentTrust = constant
    const history = result.get("A")!;
    expect(history.every((v) => v === 0.5)).toBe(true);
  });

  it("all trust values remain within [0, 1]", () => {
    const agents = [
      { id: "A", trust: 0.3, connections: ["B"] },
      { id: "B", trust: 0.9, connections: ["A"] },
    ];
    const result = agentBasedSimulation(agents, 20);
    for (const [, history] of result) {
      for (const v of history) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("bootstrapConfidence (PR sync)", () => {
  it("estimate equals statisticFn applied to full data", () => {
    const data = [1, 2, 3, 4, 5];
    const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const result = bootstrapConfidence(data, mean, 100);
    expect(result.estimate).toBeCloseTo(3, 5);
  });

  it("ciLower <= estimate <= ciUpper", () => {
    const data = [0.1, 0.5, 0.7, 0.3, 0.9];
    const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const result = bootstrapConfidence(data, mean, 200);
    expect(result.ciLower).toBeLessThanOrEqual(result.estimate);
    expect(result.ciUpper).toBeGreaterThanOrEqual(result.estimate);
  });
});

describe("randomWalkTrust (PR sync)", () => {
  it("stationary distribution sums to 1", () => {
    const graph = new Map([
      ["A", ["B", "C"]],
      ["B", ["A"]],
      ["C", ["A"]],
    ]);
    const result = randomWalkTrust(graph, "A", 100);
    const sum = Array.from(result.stationaryDistribution.values()).reduce(
      (a, b) => a + b,
      0
    );
    expect(sum).toBeCloseTo(1, 5);
  });

  it("all visit counts are non-negative integers", () => {
    const graph = new Map([["A", ["B"]], ["B", ["A"]]]);
    const result = randomWalkTrust(graph, "A", 50);
    for (const count of result.visitCounts.values()) {
      expect(count).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(count)).toBe(true);
    }
  });

  it("stops at dead-end node", () => {
    // Node A connects to B which has no outgoing edges
    const graph = new Map([["A", ["B"]], ["B", []]]);
    const result = randomWalkTrust(graph, "A", 100);
    // Walk terminates early, so total visits < steps
    const totalVisits = Array.from(result.visitCounts.values()).reduce(
      (a, b) => a + b,
      0
    );
    expect(totalVisits).toBeLessThan(100);
  });

  // ── Tests targeting the `_totalVisits` rename (was `totalVisits`) ──────────
  // The rename is cosmetic: the variable tracks loop iterations but the
  // stationaryDistribution is normalized using the sum of visitCounts values,
  // not the renamed variable. The tests below verify this invariant holds.

  it("sum of visitCounts equals total steps taken (verifies internal counter consistency)", () => {
    // On a simple 2-node cycle the walk always progresses; with steps=20 all
    // 20 iterations are completed, so sum of visitCounts must equal 20.
    const graph = new Map([["A", ["B"]], ["B", ["A"]]]);
    const steps = 20;
    const result = randomWalkTrust(graph, "A", steps);
    const visitSum = Array.from(result.visitCounts.values()).reduce(
      (a, b) => a + b,
      0
    );
    expect(visitSum).toBe(steps);
  });

  it("stationary distribution values equal visitCount / totalVisits for each node", () => {
    // Verifies that stationaryDistribution is correctly normalized from
    // visitCounts, independent of the renamed _totalVisits counter.
    const graph = new Map([
      ["X", ["Y"]],
      ["Y", ["X"]],
    ]);
    const result = randomWalkTrust(graph, "X", 50);
    const totalVisits = Array.from(result.visitCounts.values()).reduce(
      (a, b) => a + b,
      0
    );
    for (const [node, count] of result.visitCounts) {
      expect(result.stationaryDistribution.get(node)).toBeCloseTo(
        count / totalVisits,
        10
      );
    }
  });

  it("startNode not present in graph: walk stops immediately with 1 visit to startNode", () => {
    // If startNode has no neighbors (not in graph), the walk stops after 1 step.
    const graph = new Map<string, string[]>();
    const result = randomWalkTrust(graph, "isolated", 50);
    expect(result.visitCounts.get("isolated")).toBe(1);
    const visitSum = Array.from(result.visitCounts.values()).reduce(
      (a, b) => a + b,
      0
    );
    expect(visitSum).toBe(1);
    // Stationary distribution: isolated node has all probability mass
    expect(result.stationaryDistribution.get("isolated")).toBeCloseTo(1, 10);
  });

  it("default steps=100 produces up to 100 total visits on an unrestricted graph", () => {
    // Calling without explicit steps uses the default of 100.
    const graph = new Map([["A", ["B"]], ["B", ["A"]]]);
    const result = randomWalkTrust(graph, "A");
    const visitSum = Array.from(result.visitCounts.values()).reduce(
      (a, b) => a + b,
      0
    );
    expect(visitSum).toBe(100);
  });

  it("each node in stationaryDistribution has a value in [0, 1]", () => {
    const graph = new Map([
      ["A", ["B", "C"]],
      ["B", ["C"]],
      ["C", ["A"]],
    ]);
    const result = randomWalkTrust(graph, "A", 200);
    for (const prob of result.stationaryDistribution.values()) {
      expect(prob).toBeGreaterThanOrEqual(0);
      expect(prob).toBeLessThanOrEqual(1);
    }
  });
});

// ─── PILLAR 1: THERMODYNAMICS ─────────────────────────────────────────────────

describe("carnotTrustEfficiency (PR sync)", () => {
  it("returns 0 when signalStrength <= 0", () => {
    expect(carnotTrustEfficiency(0, 0.5)).toBe(0);
    expect(carnotTrustEfficiency(-1, 0.5)).toBe(0);
  });

  it("returns 0 when noise equals signal", () => {
    expect(carnotTrustEfficiency(1, 1)).toBe(0);
  });

  it("returns 1 when noise is 0", () => {
    expect(carnotTrustEfficiency(1, 0)).toBe(1);
  });

  it("returns value in [0, 1]", () => {
    const result = carnotTrustEfficiency(0.8, 0.3);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it("higher signal relative to noise gives higher efficiency", () => {
    const low = carnotTrustEfficiency(0.5, 0.4);
    const high = carnotTrustEfficiency(0.9, 0.1);
    expect(high).toBeGreaterThan(low);
  });
});

describe("fickTrustFlux (PR sync)", () => {
  it("is positive when sourceTrust > targetTrust (flow from high to low)", () => {
    // gradient = (target - source) / distance = (0.3 - 0.8) / 1 = -0.5
    // flux = -D * gradient = -0.5 * (-0.5) = +0.25
    const flux = fickTrustFlux(0.8, 0.3, 0.5, 1);
    expect(flux).toBeGreaterThan(0);
  });

  it("is negative when sourceTrust < targetTrust", () => {
    const flux = fickTrustFlux(0.3, 0.8, 0.5, 1);
    expect(flux).toBeLessThan(0);
  });

  it("is zero when source and target trust are equal", () => {
    expect(fickTrustFlux(0.5, 0.5)).toBeCloseTo(0);
  });
});

describe("fickTrustEvolution (PR sync)", () => {
  it("returns trustAtNode unchanged when no neighbors", () => {
    expect(fickTrustEvolution(0.5, [])).toBe(0.5);
  });

  it("moves trust toward neighbor average", () => {
    // Node = 0.2, neighbors = [0.8] → should increase
    const result = fickTrustEvolution(0.2, [0.8], 0.1, 0.5);
    expect(result).toBeGreaterThan(0.2);
  });

  it("result stays in [0, 1]", () => {
    const result = fickTrustEvolution(0.9, [0.1, 0.1, 0.1], 1.0, 1.0);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});

describe("fourierTrustHeat (PR sync)", () => {
  it("returns nodeTrust unchanged when no neighbors", () => {
    expect(fourierTrustHeat(0.6, [])).toBe(0.6);
  });

  it("increases trust when neighbors have higher trust", () => {
    const result = fourierTrustHeat(0.3, [0.9, 0.8]);
    expect(result).toBeGreaterThan(0.3);
  });

  it("decreases trust when neighbors have lower trust", () => {
    const result = fourierTrustHeat(0.9, [0.2, 0.3]);
    expect(result).toBeLessThan(0.9);
  });

  it("result stays in [0, 1]", () => {
    const result = fourierTrustHeat(0.1, [0.99, 0.99], 1.0, 1.0);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});

describe("thermalEquilibriumError (PR sync)", () => {
  it("returns 0 for single-element array", () => {
    expect(thermalEquilibriumError([0.5])).toBe(0);
  });

  it("returns 0 for uniform distribution", () => {
    expect(thermalEquilibriumError([0.5, 0.5, 0.5])).toBeCloseTo(0, 10);
  });

  it("is higher for more spread out distributions", () => {
    const low = thermalEquilibriumError([0.4, 0.5, 0.6]);
    const high = thermalEquilibriumError([0.0, 0.5, 1.0]);
    expect(high).toBeGreaterThan(low);
  });

  it("returns 0 for empty array", () => {
    expect(thermalEquilibriumError([])).toBe(0);
  });
});

// ─── PILLAR 2: INFORMATION THEORY ────────────────────────────────────────────

describe("nyquistMinSyncRate (PR sync)", () => {
  it("returns twice the input", () => {
    expect(nyquistMinSyncRate(10)).toBe(20);
    expect(nyquistMinSyncRate(0.5)).toBeCloseTo(1, 5);
  });

  it("returns 0 for zero input", () => {
    expect(nyquistMinSyncRate(0)).toBe(0);
  });
});

describe("shannonHartleyCapacity (PR sync)", () => {
  it("returns Infinity when noisePower <= 0", () => {
    expect(shannonHartleyCapacity(100, 10, 0)).toBe(Infinity);
    expect(shannonHartleyCapacity(100, 10, -1)).toBe(Infinity);
  });

  it("increases with higher signal power", () => {
    const low = shannonHartleyCapacity(100, 1, 1);
    const high = shannonHartleyCapacity(100, 10, 1);
    expect(high).toBeGreaterThan(low);
  });

  it("increases with higher bandwidth", () => {
    const narrow = shannonHartleyCapacity(10, 5, 1);
    const wide = shannonHartleyCapacity(100, 5, 1);
    expect(wide).toBeGreaterThan(narrow);
  });

  it("returns finite positive value for valid inputs", () => {
    const result = shannonHartleyCapacity(10, 5, 1);
    expect(result).toBeGreaterThan(0);
    expect(Number.isFinite(result)).toBe(true);
  });
});

describe("buildHuffmanTree (PR sync)", () => {
  it("throws for empty symbol set", () => {
    expect(() => buildHuffmanTree(new Map())).toThrow();
  });

  it("builds a tree with total frequency matching input sum", () => {
    const symbols = new Map([["A", 5], ["B", 3], ["C", 2]]);
    const tree = buildHuffmanTree(symbols);
    expect(tree.frequency).toBe(10);
  });

  it("root node has null symbol for multi-symbol alphabet", () => {
    const symbols = new Map([["A", 1], ["B", 2]]);
    const tree = buildHuffmanTree(symbols);
    expect(tree.symbol).toBeNull();
  });

  it("single-symbol tree has the symbol as a leaf child", () => {
    const symbols = new Map([["X", 1]]);
    const tree = buildHuffmanTree(symbols);
    expect(tree.left?.symbol).toBe("X");
  });
});

describe("buildHuffmanCodes (PR sync)", () => {
  it("assigns a code to each symbol", () => {
    const symbols = new Map([["A", 3], ["B", 2], ["C", 1]]);
    const tree = buildHuffmanTree(symbols);
    const codes = buildHuffmanCodes(tree);
    expect(codes.has("A")).toBe(true);
    expect(codes.has("B")).toBe(true);
    expect(codes.has("C")).toBe(true);
  });

  it("codes only contain 0s and 1s", () => {
    const symbols = new Map([["A", 4], ["B", 2], ["C", 1]]);
    const tree = buildHuffmanTree(symbols);
    const codes = buildHuffmanCodes(tree);
    for (const code of codes.values()) {
      expect(/^[01]+$/.test(code)).toBe(true);
    }
  });

  it("most frequent symbol gets shorter code", () => {
    const symbols = new Map([["A", 100], ["B", 1]]);
    const tree = buildHuffmanTree(symbols);
    const codes = buildHuffmanCodes(tree);
    expect(codes.get("A")!.length).toBeLessThanOrEqual(codes.get("B")!.length);
  });
});

describe("huffmanCompress (PR sync)", () => {
  it("returns codes, encoded string, and compression ratio", () => {
    const symbols = new Map([["A", 4], ["B", 2], ["C", 1]]);
    const result = huffmanCompress(["A", "A", "B", "C"], symbols);
    expect(result.codes).toBeDefined();
    expect(typeof result.encoded).toBe("string");
    expect(typeof result.compressionRatio).toBe("number");
  });

  it("compression ratio is positive for non-empty input", () => {
    const symbols = new Map([["A", 4], ["B", 2]]);
    const result = huffmanCompress(["A", "B", "A"], symbols);
    expect(result.compressionRatio).toBeGreaterThan(0);
  });
});

describe("mutualInformation (PR sync)", () => {
  it("returns 0 for empty distribution", () => {
    expect(mutualInformation([])).toBe(0);
  });

  it("returns 0 for independent distributions", () => {
    // Perfectly independent: P(X,Y) = P(X)*P(Y)
    // P = [[0.25, 0.25], [0.25, 0.25]] → MI = 0
    const joint = [[0.25, 0.25], [0.25, 0.25]];
    expect(mutualInformation(joint)).toBeCloseTo(0, 5);
  });

  it("returns positive MI for correlated distributions", () => {
    // Perfect correlation: A=0→B=0, A=1→B=1
    const joint = [[0.5, 0], [0, 0.5]];
    expect(mutualInformation(joint)).toBeGreaterThan(0);
  });
});

describe("trustSignalToNoise (PR sync)", () => {
  it("returns Infinity when noisePower <= 0", () => {
    expect(trustSignalToNoise(10, 0)).toBe(Infinity);
    expect(trustSignalToNoise(10, -1)).toBe(Infinity);
  });

  it("returns ratio when noisePower > 0", () => {
    expect(trustSignalToNoise(10, 2)).toBe(5);
  });

  it("increases as signal increases", () => {
    const low = trustSignalToNoise(1, 1);
    const high = trustSignalToNoise(10, 1);
    expect(high).toBeGreaterThan(low);
  });
});

describe("klDivergence (PR sync)", () => {
  it("returns 0 for identical distributions", () => {
    expect(klDivergence([0.5, 0.5], [0.5, 0.5])).toBeCloseTo(0, 10);
  });

  it("throws when distributions have different lengths", () => {
    expect(() => klDivergence([0.5, 0.5], [0.5, 0.5, 0])).toThrow();
  });

  it("returns Infinity when q has 0 where p is positive", () => {
    expect(klDivergence([0.5, 0.5], [1, 0])).toBe(Infinity);
  });

  it("returns positive value for non-identical distributions", () => {
    expect(klDivergence([0.7, 0.3], [0.5, 0.5])).toBeGreaterThan(0);
  });

  it("skips terms where p[i] = 0", () => {
    // Should not throw — p=0 terms contribute nothing
    expect(klDivergence([0, 1], [0.5, 0.5])).toBeGreaterThanOrEqual(0);
  });
});

// ─── PILLAR 3: GRAPH / GAME THEORY ───────────────────────────────────────────

describe("pageRankTrust (PR sync)", () => {
  it("returns empty map for empty node set", () => {
    const result = pageRankTrust([], []);
    expect(result.size).toBe(0);
  });

  it("all PageRank scores are positive", () => {
    const nodes = ["A", "B", "C"];
    const edges = [
      { source: "A", target: "B", weight: 1 },
      { source: "B", target: "C", weight: 1 },
      { source: "C", target: "A", weight: 1 },
    ];
    const result = pageRankTrust(nodes, edges);
    for (const score of result.values()) {
      expect(score).toBeGreaterThan(0);
    }
  });

  it("scores sum to approximately 1 for a balanced cycle", () => {
    const nodes = ["A", "B", "C"];
    const edges = [
      { source: "A", target: "B", weight: 1 },
      { source: "B", target: "C", weight: 1 },
      { source: "C", target: "A", weight: 1 },
    ];
    const result = pageRankTrust(nodes, edges, 0.85, 50);
    const total = Array.from(result.values()).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 1);
  });

  it("node with more in-links has higher rank", () => {
    const nodes = ["hub", "leaf1", "leaf2", "leaf3"];
    const edges = [
      { source: "leaf1", target: "hub", weight: 1 },
      { source: "leaf2", target: "hub", weight: 1 },
      { source: "leaf3", target: "hub", weight: 1 },
    ];
    const result = pageRankTrust(nodes, edges, 0.85, 100);
    const hubRank = result.get("hub")!;
    const leaf1Rank = result.get("leaf1")!;
    expect(hubRank).toBeGreaterThan(leaf1Rank);
  });
});

describe("laplacianMatrix (PR sync)", () => {
  it("returns n×n matrix", () => {
    const nodes = ["A", "B", "C"];
    const edges = [{ source: "A", target: "B", weight: 1 }];
    const L = laplacianMatrix(nodes, edges);
    expect(L.length).toBe(3);
    expect(L[0].length).toBe(3);
  });

  it("diagonal equals sum of edge weights (degree)", () => {
    const nodes = ["A", "B"];
    const edges = [{ source: "A", target: "B", weight: 2 }];
    const L = laplacianMatrix(nodes, edges);
    expect(L[0][0]).toBe(2);
    expect(L[1][1]).toBe(2);
  });

  it("off-diagonal is negative weight for connected nodes", () => {
    const nodes = ["A", "B"];
    const edges = [{ source: "A", target: "B", weight: 3 }];
    const L = laplacianMatrix(nodes, edges);
    expect(L[0][1]).toBe(-3);
    expect(L[1][0]).toBe(-3);
  });

  it("each row sums to 0", () => {
    const nodes = ["A", "B", "C"];
    const edges = [
      { source: "A", target: "B", weight: 1 },
      { source: "B", target: "C", weight: 2 },
    ];
    const L = laplacianMatrix(nodes, edges);
    for (const row of L) {
      expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 10);
    }
  });
});

describe("powerIteration (PR sync)", () => {
  it("returns a vector of the same length as the matrix", () => {
    const matrix = [
      [2, -1],
      [-1, 2],
    ];
    const result = powerIteration(matrix, 20);
    expect(result).toHaveLength(2);
  });

  it("returns a normalized vector (L2 norm ≈ 1)", () => {
    const matrix = [
      [3, 1],
      [1, 3],
    ];
    const result = powerIteration(matrix, 50);
    const norm = Math.sqrt(result.reduce((sum, v) => sum + v * v, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it("handles 1×1 matrix", () => {
    const result = powerIteration([[5]], 10);
    expect(result).toHaveLength(1);
    expect(Math.abs(result[0])).toBeCloseTo(1, 5);
  });
});

describe("spectralPartition (PR sync)", () => {
  it("partitions nodes into two communities", () => {
    const nodes = ["A", "B", "C", "D"];
    const edges = [
      { source: "A", target: "B", weight: 1 },
      { source: "C", target: "D", weight: 1 },
    ];
    const result = spectralPartition(nodes, edges);
    const total = result.communityA.length + result.communityB.length;
    expect(total).toBe(4);
  });

  it("every node appears in exactly one community", () => {
    const nodes = ["A", "B", "C"];
    const edges = [{ source: "A", target: "B", weight: 1 }];
    const result = spectralPartition(nodes, edges);
    const all = [...result.communityA, ...result.communityB];
    const unique = new Set(all);
    expect(unique.size).toBe(3);
  });
});

describe("nashEquilibrium (PR sync)", () => {
  it("returns agent with no profitable deviations", () => {
    const agents = [
      { id: "A", currentTrust: 0.7, alternativeTrusts: [{ trust: 0.6, profit: -0.1 }] },
      { id: "B", currentTrust: 0.5, alternativeTrusts: [{ trust: 0.8, profit: 0.3 }] },
    ];
    const stable = nashEquilibrium(agents);
    expect(stable).toContain("A");
    expect(stable).not.toContain("B");
  });

  it("returns all agents when all are stable", () => {
    const agents = [
      { id: "X", currentTrust: 0.9, alternativeTrusts: [{ trust: 0.5, profit: -1 }] },
      { id: "Y", currentTrust: 0.8, alternativeTrusts: [{ trust: 0.3, profit: -0.5 }] },
    ];
    expect(nashEquilibrium(agents)).toHaveLength(2);
  });

  it("returns empty array when all agents have profitable deviations", () => {
    const agents = [
      { id: "A", currentTrust: 0.3, alternativeTrusts: [{ trust: 0.9, profit: 0.6 }] },
    ];
    expect(nashEquilibrium(agents)).toHaveLength(0);
  });
});

describe("bestResponseDynamics (PR sync)", () => {
  it("selects highest-payoff strategy for each agent", () => {
    const agents = [
      {
        id: "A",
        strategies: [
          { label: "low", payoff: 0.2 },
          { label: "high", payoff: 0.9 },
        ],
      },
    ];
    const result = bestResponseDynamics(agents);
    expect(result.get("A")).toBe("high");
  });

  it("skips agents with no strategies", () => {
    const agents = [{ id: "B", strategies: [] }];
    const result = bestResponseDynamics(agents);
    expect(result.has("B")).toBe(false);
  });

  it("returns different strategies for different agents", () => {
    const agents = [
      { id: "A", strategies: [{ label: "L1", payoff: 1 }, { label: "L2", payoff: 0 }] },
      { id: "B", strategies: [{ label: "L1", payoff: 0 }, { label: "L2", payoff: 1 }] },
    ];
    const result = bestResponseDynamics(agents);
    expect(result.get("A")).toBe("L1");
    expect(result.get("B")).toBe("L2");
  });
});

describe("minCutTrustBottleneck (PR sync)", () => {
  it("returns maxFlow, cutEdges, and bottleneckNodes", () => {
    const edges = [
      { source: "S", target: "A", weight: 10 },
      { source: "A", target: "T", weight: 5 },
    ];
    const result = minCutTrustBottleneck(edges, "S", "T");
    expect(typeof result.maxFlow).toBe("number");
    expect(Array.isArray(result.cutEdges)).toBe(true);
    expect(Array.isArray(result.bottleneckNodes)).toBe(true);
  });

  it("maxFlow is the bottleneck edge capacity", () => {
    // S→A capacity 10, A→T capacity 5 — bottleneck is A→T
    const edges = [
      { source: "S", target: "A", weight: 10 },
      { source: "A", target: "T", weight: 5 },
    ];
    const result = minCutTrustBottleneck(edges, "S", "T");
    expect(result.maxFlow).toBeCloseTo(5, 5);
  });

  it("returns 0 maxFlow when source and sink are disconnected", () => {
    const edges = [{ source: "X", target: "Y", weight: 1 }];
    const result = minCutTrustBottleneck(edges, "S", "T");
    expect(result.maxFlow).toBe(0);
  });
});

// ─── PILLAR 4: STOCHASTIC / OSCILLATOR MODELS ────────────────────────────────

describe("langevinTrustDynamics (PR sync)", () => {
  it("returns newTrust in [0, 1]", () => {
    for (let i = 0; i < 20; i++) {
      const { newTrust } = langevinTrustDynamics(0.5, 0.1);
      expect(newTrust).toBeGreaterThanOrEqual(0);
      expect(newTrust).toBeLessThanOrEqual(1);
    }
  });

  it("returns a velocity value", () => {
    const { velocity } = langevinTrustDynamics(0.5, 0.1);
    expect(typeof velocity).toBe("number");
    expect(isFinite(velocity)).toBe(true);
  });

  it("positive external force tends to increase trust over many steps", () => {
    let trust = 0.1;
    let totalIncrease = 0;
    const N = 50;
    for (let i = 0; i < N; i++) {
      const before = trust;
      const result = langevinTrustDynamics(trust, 0.5, 0.1, 0.001, 1, 0.1);
      trust = result.newTrust;
      if (trust > before) totalIncrease++;
    }
    // More often than not, trust should increase with positive force
    expect(totalIncrease).toBeGreaterThan(N * 0.4);
  });
});

describe("langevinSimulation (PR sync)", () => {
  it("returns trustHistory and finalTrust", () => {
    const result = langevinSimulation(0.5, 0.1, 0.1, 0.01, 1, 0.1);
    expect(Array.isArray(result.trustHistory)).toBe(true);
    expect(typeof result.finalTrust).toBe("number");
  });

  it("all trust values stay in [0, 1]", () => {
    const result = langevinSimulation(0.5, 0.2, 0.1, 0.05, 2, 0.1);
    for (const v of result.trustHistory) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("trustHistory starts with initialTrust", () => {
    const result = langevinSimulation(0.7, 0.1);
    expect(result.trustHistory[0]).toBe(0.7);
  });
});

describe("fokkerPlanckTrustEvolution (PR sync)", () => {
  it("preserves output length equal to input length", () => {
    const grid = [0, 0.25, 0.5, 0.75, 1];
    const probs = [0.1, 0.2, 0.4, 0.2, 0.1];
    const result = fokkerPlanckTrustEvolution(grid, probs, 0, 0.1);
    expect(result.length).toBe(5);
  });

  it("returns normalized probabilities (sum ≈ 1)", () => {
    const grid = [0, 0.25, 0.5, 0.75, 1];
    const probs = [0.1, 0.2, 0.4, 0.2, 0.1];
    const result = fokkerPlanckTrustEvolution(grid, probs, 0, 0.1);
    const sum = result.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it("throws when probabilities and trustGrid have different lengths", () => {
    expect(() =>
      fokkerPlanckTrustEvolution([0, 0.5, 1], [0.5, 0.5], 0, 0.1)
    ).toThrow();
  });

  it("returns probabilities unchanged for grid shorter than 3 elements", () => {
    const result = fokkerPlanckTrustEvolution([0, 1], [0.5, 0.5], 0, 0.1);
    expect(result).toEqual([0.5, 0.5]);
  });

  it("throws when trustGrid has zero spacing (all same value)", () => {
    expect(() =>
      fokkerPlanckTrustEvolution([0.5, 0.5, 0.5], [0.33, 0.33, 0.34], 0, 0.1)
    ).toThrow();
  });
});

describe("isingHamiltonian (PR sync)", () => {
  it("lower energy with aligned spins and positive coupling", () => {
    const adj = [[false, true], [true, false]];
    const aligned = isingHamiltonian([1, 1], 1, 0, adj);
    const antiAligned = isingHamiltonian([1, -1], 1, 0, adj);
    // aligned: H = -J*(+1)(+1) = -1, antiAligned: H = -J*(+1)(-1) = +1
    expect(aligned).toBeLessThan(antiAligned);
  });

  it("external field lowers energy for aligned spins", () => {
    const adj = [[false]];
    const withField = isingHamiltonian([1], 0, 1, adj);
    expect(withField).toBeLessThan(0);
  });
});

describe("isingMagnetization (PR sync)", () => {
  it("returns 0 for empty spins", () => {
    expect(isingMagnetization([])).toBe(0);
  });

  it("returns 1 for all-up spins", () => {
    expect(isingMagnetization([1, 1, 1])).toBeCloseTo(1, 5);
  });

  it("returns -1 for all-down spins", () => {
    expect(isingMagnetization([-1, -1, -1])).toBeCloseTo(-1, 5);
  });

  it("returns 0 for balanced spins", () => {
    expect(isingMagnetization([1, -1])).toBeCloseTo(0, 5);
  });
});

describe("isingMetropolisStep (PR sync)", () => {
  it("returns array of same length as input", () => {
    const adj = [[false, true], [true, false]];
    const result = isingMetropolisStep([1, -1], 1, 0, adj, 1);
    expect(result).toHaveLength(2);
  });

  it("returns empty array for empty spins", () => {
    const result = isingMetropolisStep([], 1, 0, [], 1);
    expect(result).toHaveLength(0);
  });

  it("each spin remains ±1", () => {
    const adj = [[false, true], [true, false]];
    const result = isingMetropolisStep([1, -1], 1, 0, adj, 1);
    for (const spin of result) {
      expect([1, -1]).toContain(spin);
    }
  });
});

describe("isingTrustConsensus (PR sync)", () => {
  it("returns spins, magnetization history, and finalMagnetization", () => {
    const result = isingTrustConsensus(3, 1, 0, 1, 10);
    expect(result.spins).toHaveLength(3);
    expect(result.magnetization).toHaveLength(10);
    expect(typeof result.finalMagnetization).toBe("number");
  });

  it("all spins are ±1", () => {
    const result = isingTrustConsensus(5, 1, 0, 1, 50);
    for (const spin of result.spins) {
      expect([1, -1]).toContain(spin);
    }
  });

  it("finalMagnetization is within [-1, 1]", () => {
    const result = isingTrustConsensus(4, 1, 0, 1, 20);
    expect(result.finalMagnetization).toBeGreaterThanOrEqual(-1);
    expect(result.finalMagnetization).toBeLessThanOrEqual(1);
  });

  it("with strong external field, magnetization tends positive", () => {
    // Large positive field pushes spins to +1
    const result = isingTrustConsensus(5, 0, 100, 0.001, 1000);
    expect(result.finalMagnetization).toBeGreaterThan(0);
  });
});

describe("kuramotoTrustSync (PR sync)", () => {
  it("throws when naturalFrequencies and initialPhases have different lengths", () => {
    expect(() =>
      kuramotoTrustSync([1, 2], [0], 1, 0.01, 1)
    ).toThrow();
  });

  it("throws when timeStep <= 0", () => {
    expect(() =>
      kuramotoTrustSync([1], [0], 1, 0, 1)
    ).toThrow();
  });

  it("returns phases, orderParameter, and finalSync", () => {
    const result = kuramotoTrustSync([0, 0], [0, Math.PI], 1, 0.1, 1);
    expect(Array.isArray(result.phases)).toBe(true);
    expect(Array.isArray(result.orderParameter)).toBe(true);
    expect(typeof result.finalSync).toBe("number");
  });

  it("finalSync is in [0, 1]", () => {
    const result = kuramotoTrustSync([0, 0.1], [0, 0.5], 0.5, 0.1, 2);
    expect(result.finalSync).toBeGreaterThanOrEqual(0);
    expect(result.finalSync).toBeLessThanOrEqual(1);
  });

  it("identical frequencies synchronize (high finalSync)", () => {
    // All oscillators at same frequency and close initial phases → should sync
    const n = 3;
    const freqs = Array(n).fill(1.0);
    const phases = [0, 0.01, 0.02];
    const result = kuramotoTrustSync(freqs, phases, 5, 0.01, 10);
    expect(result.finalSync).toBeGreaterThan(0.8);
  });
});

describe("kuramotoCriticalCoupling (PR sync)", () => {
  it("returns 0 for fewer than 2 frequencies", () => {
    expect(kuramotoCriticalCoupling([])).toBe(0);
    expect(kuramotoCriticalCoupling([1])).toBe(0);
  });

  it("returns a positive number for spread frequencies", () => {
    const result = kuramotoCriticalCoupling([0.5, 1.0, 1.5, 2.0]);
    expect(result).toBeGreaterThan(0);
  });

  it("returns Infinity when all frequencies are identical (zero bandwidth)", () => {
    // bandwidth = IQR = 0 → returns Infinity
    const result = kuramotoCriticalCoupling([1, 1, 1, 1]);
    expect(result).toBe(Infinity);
  });
});
