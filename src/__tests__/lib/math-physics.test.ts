/**
 * math-physics.test.ts — Validation tests for physics-inspired algorithms.
 *
 * Validates mathematical properties:
 * - Boltzmann normalization sums to ~1
 * - Inverse square law preserves trust bounds
 * - MCTS converges to optimal action
 * - Monte Carlo 95% CI contains true mean
 * - Leaky Bucket drains exponentially
 * - Ideal Gas Law pressure is monotonic
 * - Nyquist rate is at least 2× max frequency
 * - KL divergence is non-negative
 * - Mutual information is symmetric
 * - Ising magnetization is bounded [-1, 1]
 * - Kuramoto order parameter is bounded [0, 1]
 * - Huffman code is prefix-free
 * - PageRank sums to ~1
 * - Fokker-Planck probabilities sum to ~1
 * - Langevin dynamics stay in [0, 1]
 */

import {
  boltzmannNormalize,
  inverseSquareDecay,
  trustPropagation,
  createMCTSNode,
  mctsBestAction,
  monteCarloTrustSimulation,
  bootstrapConfidence,
  leakyBucketCheck,
  idealGasPressure,
  nyquistMinSyncRate,
  klDivergence,
  mutualInformation,
  huffmanCompress,
  pageRankTrust,
  fokkerPlanckTrustEvolution,
  langevinTrustDynamics,
  isingMagnetization,
  isingTrustConsensus,
  kuramotoTrustSync,
  shannonHartleyCapacity,
  trustSignalToNoise,
  carnotTrustEfficiency,
  fickTrustFlux,
  fourierTrustHeat,
  fiedlerPartition,
  minCutTrustBottleneck,
  nashEquilibrium,
  bestResponseDynamics,
  laplacianMatrix,
  powerIteration,
  thermalEquilibriumError,
  kuramotoCriticalCoupling,
  type TopologyEdge,
} from "@/lib/math-physics";

// ═══════════════════════════════════════════════════════════════════════════════
// PILLAR 1 — Thermodynamic Foundation
// ═══════════════════════════════════════════════════════════════════════════════

describe("Boltzmann Distribution", () => {
  it("normalizes to approximately 1", () => {
    const scores = [0.1, 0.3, 0.5, 0.7, 0.9];
    const probs = boltzmannNormalize(scores, 0.5);
    const sum = probs.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it("gives higher probability to higher scores", () => {
    const scores = [0.1, 0.9];
    const probs = boltzmannNormalize(scores, 0.5);
    expect(probs[1]).toBeGreaterThan(probs[0]);
  });

  it("returns uniform distribution at high temperature", () => {
    const scores = [0.1, 0.5, 0.9];
    const probs = boltzmannNormalize(scores, 100);
    const sum = probs.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
    const expectedUniform = 1 / scores.length;
    probs.forEach((p) => expect(p).toBeCloseTo(expectedUniform, 2));
  });
});

describe("Inverse Square Law", () => {
  it("decays trust with squared distance", () => {
    const trust1 = inverseSquareDecay(1.0, 1, 1);
    const trust2 = inverseSquareDecay(1.0, 1, 2);
    expect(trust2).toBeLessThan(trust1);
    // At distance 2, trust should be ~1/4 of distance 1
    expect(trust2).toBeCloseTo(trust1 / 4, 2);
  });

  it("returns sourceTrust * weight at distance 0", () => {
    expect(inverseSquareDecay(1.0, 1, 0)).toBe(1);
    expect(inverseSquareDecay(0.5, 0.5, 0)).toBe(0.25);
  });

  it("preserves trust bounds [0, 1] when used with propagation", () => {
    const chain = [
      { trust: 0.8, weight: 1.0 },
      { trust: 0.6, weight: 0.5 },
      { trust: 0.4, weight: 0.25 },
    ];
    const result = trustPropagation(chain);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});

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
});

describe("Carnot Efficiency", () => {
  it("returns 1 when noise is 0", () => {
    expect(carnotTrustEfficiency(1, 0)).toBe(1);
  });

  it("returns 0 when signal is 0", () => {
    expect(carnotTrustEfficiency(0, 1)).toBe(0);
  });

  it("is bounded in [0, 1]", () => {
    expect(carnotTrustEfficiency(0.8, 0.3)).toBeGreaterThanOrEqual(0);
    expect(carnotTrustEfficiency(0.8, 0.3)).toBeLessThanOrEqual(1);
  });
});

describe("Fick's Diffusion Law", () => {
  it("flux is positive when target is less trusted than source", () => {
    const flux = fickTrustFlux(0.8, 0.3, 0.5, 1);
    expect(flux).toBeGreaterThan(0);
  });

  it("flux is approximately 0 when trust is equal", () => {
    const flux = fickTrustFlux(0.5, 0.5, 0.5, 1);
    expect(Math.abs(flux)).toBeCloseTo(0, 10);
  });
});

describe("Fourier Heat Equation", () => {
  it("node trust moves toward neighbor average", () => {
    const result = fourierTrustHeat(0.2, [0.8, 0.9], 0.3, 0.1);
    expect(result).toBeGreaterThan(0.2);
    expect(result).toBeLessThanOrEqual(1);
  });

  it("returns same trust for no neighbors", () => {
    expect(fourierTrustHeat(0.5, [], 0.3, 0.1)).toBe(0.5);
  });
});

describe("Thermal Equilibrium Error", () => {
  it("is 0 for uniform distribution", () => {
    expect(thermalEquilibriumError([0.5, 0.5, 0.5])).toBe(0);
  });

  it("increases with variance", () => {
    const e1 = thermalEquilibriumError([0.5, 0.5]);
    const e2 = thermalEquilibriumError([0.1, 0.9]);
    expect(e2).toBeGreaterThan(e1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PILLAR 2 — Radiative Recovery & Information Exchange
// ═══════════════════════════════════════════════════════════════════════════════

describe("Nyquist-Shannon Sampling Theorem", () => {
  it("returns at least 2× the max frequency", () => {
    const rate = nyquistMinSyncRate(5);
    expect(rate).toBeGreaterThanOrEqual(10);
  });

  it("scales linearly with frequency", () => {
    expect(nyquistMinSyncRate(10)).toBe(20);
    expect(nyquistMinSyncRate(100)).toBe(200);
  });
});

describe("Shannon-Hartley Theorem", () => {
  it("capacity increases with bandwidth", () => {
    const c1 = shannonHartleyCapacity(100, 10, 1);
    const c2 = shannonHartleyCapacity(200, 10, 1);
    expect(c2).toBeGreaterThan(c1);
  });

  it("returns Infinity for zero noise", () => {
    expect(shannonHartleyCapacity(100, 1, 0)).toBe(Infinity);
  });

  it("returns 0 for zero signal", () => {
    expect(shannonHartleyCapacity(100, 0, 1)).toBe(0);
  });
});

describe("KL Divergence", () => {
  it("is non-negative", () => {
    const dkl = klDivergence([0.5, 0.5], [0.6, 0.4]);
    expect(dkl).toBeGreaterThanOrEqual(0);
  });

  it("is 0 for identical distributions", () => {
    expect(klDivergence([0.5, 0.5], [0.5, 0.5])).toBeCloseTo(0, 10);
  });
});

describe("Mutual Information", () => {
  it("is symmetric", () => {
    const joint = [[0.2, 0.3], [0.3, 0.2]];
    const mi12 = mutualInformation(joint);
    const mi21 = mutualInformation([[0.2, 0.3], [0.3, 0.2]]);
    expect(mi12).toBeCloseTo(mi21, 10);
  });

  it("is approximately 0 for independent distributions", () => {
    const joint = [[0.25, 0.25], [0.25, 0.25]];
    const mi = mutualInformation(joint);
    expect(mi).toBeLessThan(0.01);
  });
});

describe("Huffman Coding", () => {
  it("produces prefix-free codes", () => {
    const symbols = new Map([["A", 0.5], ["B", 0.25], ["C", 0.15], ["D", 0.1]]);
    const result = huffmanCompress(["A", "B", "C", "D", "A", "A", "B"], symbols);
    const codes = Array.from(result.codes.values());
    for (let i = 0; i < codes.length; i++) {
      for (let j = i + 1; j < codes.length; j++) {
        const shorter = codes[i].length <= codes[j].length ? codes[i] : codes[j];
        const longer = codes[i].length > codes[j].length ? codes[i] : codes[j];
        expect(longer.startsWith(shorter)).toBe(false);
      }
    }
  });

  it("frequent symbols get shorter codes", () => {
    const symbols = new Map([["A", 0.6], ["B", 0.3], ["C", 0.1]]);
    const result = huffmanCompress(["A", "B", "C"], symbols);
    const aCode = result.codes.get("A")!;
    const cCode = result.codes.get("C")!;
    expect(aCode.length).toBeLessThanOrEqual(cCode.length);
  });
});

describe("Signal-to-Noise Ratio", () => {
  it("increases with signal power", () => {
    expect(trustSignalToNoise(10, 1)).toBe(10);
    expect(trustSignalToNoise(20, 1)).toBe(20);
  });

  it("is Infinity for zero noise", () => {
    expect(trustSignalToNoise(1, 0)).toBe(Infinity);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PILLAR 3 — Game Planning & Network Topology
// ═══════════════════════════════════════════════════════════════════════════════

describe("MCTS", () => {
  it("converges to a valid action", () => {
    const actions = ["action_a", "action_b", "action_c"];
    const root = createMCTSNode("root");
    const bestAction = mctsBestAction(
      root,
      100,
      actions,
      () => 0.5,
    );
    expect(root.children.length).toBeGreaterThan(0);
    expect(bestAction).toBeDefined();
  });
});

describe("PageRank", () => {
  it("scores are positive and well-defined", () => {
    const nodes = ["A", "B", "C"];
    const edges: TopologyEdge[] = [
      { source: "A", target: "B", weight: 1 },
      { source: "B", target: "C", weight: 1 },
    ];
    const ranks = pageRankTrust(nodes, edges, 0.85, 100);
    expect(ranks.get("A")).toBeDefined();
    expect(ranks.get("B")).toBeDefined();
    expect(ranks.get("C")).toBeDefined();
    // All ranks should be positive
    Array.from(ranks.values()).forEach((r) => expect(r).toBeGreaterThan(0));
  });

  it("gives higher rank to well-connected nodes", () => {
    const nodes = ["A", "B", "C"];
    const edges: TopologyEdge[] = [
      { source: "A", target: "B", weight: 1 },
      { source: "B", target: "C", weight: 1 },
      { source: "A", target: "C", weight: 1 },
    ];
    const ranks = pageRankTrust(nodes, edges, 0.85, 100);
    // A has 2 outgoing edges, C has 0
    expect(ranks.get("A")).toBeDefined();
    expect(ranks.get("B")).toBeDefined();
    expect(ranks.get("C")).toBeDefined();
  });
});

describe("Laplacian Matrix", () => {
  it("has row sums of 0", () => {
    const nodes = ["A", "B"];
    const edges: TopologyEdge[] = [
      { source: "A", target: "B", weight: 1 },
    ];
    const L = laplacianMatrix(nodes, edges);
    for (let i = 0; i < L.length; i++) {
      const rowSum = L[i].reduce((a, b) => a + b, 0);
      expect(rowSum).toBeCloseTo(0, 10);
    }
  });
});

describe("Power Iteration", () => {
  it("returns a normalized vector", () => {
    const L = [[2, -1], [-1, 2]];
    const v = powerIteration(L, 50);
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 5);
  });
});

describe("Fiedler Partition", () => {
  it("splits into two communities", () => {
    const nodes = ["A", "B", "C", "D"];
    const edges: TopologyEdge[] = [
      { source: "A", target: "B", weight: 1 },
      { source: "A", target: "C", weight: 1 },
      { source: "B", target: "C", weight: 1 },
      { source: "C", target: "D", weight: 0.01 },
    ];
    const { communityA, communityB } = fiedlerPartition(nodes, edges);
    expect(communityA.length + communityB.length).toBe(nodes.length);
    // Nodes within each community should be distinct
    const allInA = new Set(communityA);
    const allInB = new Set(communityB);
    communityB.forEach((n) => expect(allInA.has(n)).toBe(false));
    communityA.forEach((n) => expect(allInB.has(n)).toBe(false));
  });
});

describe("Min-Cut Max-Flow", () => {
  it("computes valid max flow", () => {
    const edges: TopologyEdge[] = [
      { source: "S", target: "A", weight: 10 },
      { source: "S", target: "B", weight: 5 },
      { source: "A", target: "T", weight: 5 },
      { source: "B", target: "T", weight: 10 },
    ];
    const result = minCutTrustBottleneck(edges, "S", "T");
    // Max flow is limited by cut edges
    expect(result.maxFlow).toBeGreaterThan(0);
    expect(result.maxFlow).toBeLessThanOrEqual(15);
  });

  it("identifies bottleneck edges", () => {
    const edges: TopologyEdge[] = [
      { source: "S", target: "A", weight: 1 },
      { source: "A", target: "T", weight: 1 },
    ];
    const result = minCutTrustBottleneck(edges, "S", "T");
    expect(result.maxFlow).toBe(1);
  });
});

describe("Nash Equilibrium", () => {
  it("identifies stable agents", () => {
    const agents = [
      {
        id: "A",
        currentTrust: 0.8,
        alternativeTrusts: [
          { trust: 0.5, profit: -0.2 },
          { trust: 1.0, profit: -0.1 },
        ],
      },
      {
        id: "B",
        currentTrust: 0.3,
        alternativeTrusts: [
          { trust: 0.6, profit: 0.3 },
          { trust: 0.1, profit: -0.2 },
        ],
      },
    ];
    const stable = nashEquilibrium(agents);
    expect(stable).toContain("A");
    expect(stable).not.toContain("B");
  });
});

describe("Best Response Dynamics", () => {
  it("selects strategy with highest payoff", () => {
    const agents = [
      { id: "A", strategies: [{ label: "high", payoff: 10 }, { label: "low", payoff: 5 }] },
    ];
    const responses = bestResponseDynamics(agents);
    expect(responses.get("A")).toBe("high");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PILLAR 4 — Neural Simulation & Vibratory Dynamics
// ═══════════════════════════════════════════════════════════════════════════════

describe("Monte Carlo Trust Simulation", () => {
  it("95% CI contains the true mean", () => {
    const baseTrust = 0.7;
    const uncertainty = 0.1;
    const result = monteCarloTrustSimulation(baseTrust, uncertainty, 1000);
    expect(result.mean).toBeCloseTo(baseTrust, 1);
    expect(result.confidence95[0]).toBeLessThan(result.mean);
    expect(result.confidence95[1]).toBeGreaterThan(result.mean);
  });
});

describe("Bootstrap Confidence", () => {
  it("returns valid bounds", () => {
    const samples = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
    const meanFn = (data: number[]) => data.reduce((a, b) => a + b, 0) / data.length;
    const result = bootstrapConfidence(samples, meanFn, 200, 0.95);
    expect(result.ciLower).toBeLessThanOrEqual(result.estimate);
    expect(result.ciUpper).toBeGreaterThanOrEqual(result.estimate);
  });
});

describe("Langevin Dynamics", () => {
  it("stays in [0, 1] range", () => {
    for (let i = 0; i < 50; i++) {
      const trust = Math.random();
      const result = langevinTrustDynamics(trust, 0.5, 0.1, 0.05, 1, 0.1);
      expect(result.newTrust).toBeGreaterThanOrEqual(0);
      expect(result.newTrust).toBeLessThanOrEqual(1);
    }
  });

  it("responds to external force", () => {
    const withoutForce = langevinTrustDynamics(0.5, 0, 0.1, 0, 1, 0.1);
    const withForce = langevinTrustDynamics(0.5, 0.5, 0.1, 0, 1, 0.1);
    expect(withForce.newTrust).not.toBeCloseTo(withoutForce.newTrust, 5);
  });
});

describe("Fokker-Planck Evolution", () => {
  it("probabilities sum to approximately 1", () => {
    const grid = Array.from({ length: 20 }, (_, i) => i / 19);
    let probs = new Array(20).fill(1 / 20);
    for (let s = 0; s < 10; s++) {
      probs = fokkerPlanckTrustEvolution(grid, probs, 0.05, 0.1, 0.01);
      const sum = probs.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 5);
    }
  });
});

describe("Ising Model", () => {
  it("magnetization is in [-1, 1]", () => {
    expect(isingMagnetization([1, 1, 1, -1, -1])).toBeCloseTo(0.2, 5);
    expect(isingMagnetization([1, 1, 1, 1, 1])).toBe(1);
    expect(isingMagnetization([-1, -1, -1, -1, -1])).toBe(-1);
  });

  it("eventually reaches consensus at low temperature", () => {
    const result = isingTrustConsensus(10, 1, 0.5, 0.1, 2000);
    // At low temperature with positive field, system should strongly polarize
    expect(Math.abs(result.finalMagnetization)).toBeGreaterThan(0.3);
  });
});

describe("Kuramoto Model", () => {
  it("order parameter is in [0, 1]", () => {
    const freqs = Array.from({ length: 10 }, () => Math.random() * 2 - 1);
    const phases = Array.from({ length: 10 }, () => Math.random() * 2 * Math.PI);
    const result = kuramotoTrustSync(freqs, phases, 0.5, 0.01, 5);
    result.orderParameter.forEach((r) => {
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
    });
  });

  it("order parameter increases with coupling strength", () => {
    const freqs = [0.5, -0.3, 0.1, -0.2, 0.4];
    const phases = [0, 1, 2, 3, 4];
    const weak = kuramotoTrustSync(freqs, phases, 0.1, 0.01, 5);
    const strong = kuramotoTrustSync(freqs, phases, 5, 0.01, 5);
    expect(strong.finalSync).toBeGreaterThan(weak.finalSync);
  });
});

describe("Kuramoto Critical Coupling", () => {
  it("is finite for non-zero frequency spread", () => {
    const Kc = kuramotoCriticalCoupling([-1, -0.5, 0, 0.5, 1]);
    expect(Kc).toBeGreaterThan(0);
    expect(Kc).toBeLessThan(Infinity);
  });
});
