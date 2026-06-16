/**
 * math-physics.ts — Physics-inspired algorithms for AxiomID.
 *
 * Leverages mathematical and physical principles:
 * - Leaky Bucket (fluid dynamics) for rate limiting
 * - Inverse Square Law (gravity) for trust delegation decay
 * - Boltzmann distribution for trust probability
 * - Exponential backoff (radioactive decay) for retry logic
 * - Cosine similarity (vector math) for semantic search
 * - Shannon entropy (information theory) for data freshness
 */

// ═══════════════════════════════════════════════════════════════════════════════
// LEAKY BUCKET (Fluid Dynamics)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Leaky Bucket algorithm — models requests as water flowing into a bucket.
 * Water (requests) flows in at rate `inflowRate`, leaks out at `drainRate`.
 * If bucket overflows (exceeds capacity), requests are rejected.
 *
 * Physics analogy: Water pressure builds up when inflow > drain.
 */
export interface LeakyBucketConfig {
  capacity: number;        // Maximum bucket size (requests)
  drainRate: number;       // Requests drained per second
  inflowRate: number;      // Requests allowed per second
}

export interface LeakyBucketState {
  level: number;           // Current water level (queued requests)
  lastDrain: number;       // Last drain timestamp (ms)
  overflowCount: number;   // Number of times bucket overflowed
}

export function leakyBucketCheck(
  state: LeakyBucketState,
  config: LeakyBucketConfig,
  now: number = Date.now(),
): { allowed: boolean; newState: LeakyBucketState; waitTimeMs: number } {
  const elapsed = (now - state.lastDrain) / 1000; // seconds

  // Drain water (leak) — exponential decay: level = level * e^(-λt)
  // where λ = drainRate / capacity
  const lambda = config.drainRate / config.capacity;
  const drainedLevel = state.level * Math.exp(-lambda * elapsed);

  // Add new request (inflow)
  const newLevel = drainedLevel + 1;

  if (newLevel > config.capacity) {
    // Bucket overflow — calculate wait time for drain
    // Solve: capacity = level * e^(-λt) for t
    // t = -ln(capacity / level) / λ
    const waitTimeMs = Math.ceil(-Math.log(config.capacity / drainedLevel) / lambda * 1000);

    return {
      allowed: false,
      newState: {
        ...state,
        level: Math.min(newLevel, config.capacity),
        overflowCount: state.overflowCount + 1,
      },
      waitTimeMs,
    };
  }

  return {
    allowed: true,
    newState: {
      level: newLevel,
      lastDrain: now,
      overflowCount: state.overflowCount,
    },
    waitTimeMs: 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVERSE SQUARE LAW (Gravity / Electromagnetism)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Inverse Square Law — trust diminishes with the square of distance.
 *
 * Physics analogy: Gravitational force F = G * m1 * m2 / r²
 * Trust delegation: T_delegatee = T_delegator * weight / hops²
 *
 * A delegator 3 hops away has 1/9th the trust influence.
 */
export function inverseSquareDecay(
  sourceTrust: number,
  weight: number,
  hops: number,
  gravitationalConstant: number = 1.0,
): number {
  if (hops <= 0) return sourceTrust * weight;
  return (gravitationalConstant * sourceTrust * weight) / (hops * hops);
}

/**
 * Compute trust propagation through delegation chain using inverse square law.
 *
 * @param chain - Array of { trust, weight } from delegator to delegatee
 * @returns Final trust score after propagation
 */
export function trustPropagation(
  chain: Array<{ trust: number; weight: number }>,
): number {
  if (chain.length === 0) return 0;

  let trust = chain[0].trust;
  for (let i = 1; i < chain.length; i++) {
    trust = inverseSquareDecay(trust, chain[i].weight, i);
  }
  return Math.min(1, trust);
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOLTZMANN DISTRIBUTION (Statistical Mechanics)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Boltzmann distribution — probability of a trust state.
 *
 * Physics analogy: P(state) = e^(-E/kT) / Z
 * where E = energy (inverse of trust), k = Boltzmann constant, T = temperature
 *
 * Higher trust = lower energy = higher probability of being "trusted".
 */
export function boltzmannTrustProbability(
  trustScore: number,
  temperature: number = 1.0,
  boltzmannConstant: number = 1.380649e-23,
): number {
  // Energy is inverse of trust (0 trust = max energy)
  const energy = 1 - trustScore;

  // P(trusted) = e^(-E/kT)
  const exponent = -energy / (boltzmannConstant * temperature);
  return Math.exp(exponent);
}

/**
 * Normalize trust scores using Boltzmann distribution.
 * Produces a probability distribution over trust scores.
 */
export function boltzmannNormalize(
  scores: number[],
  temperature: number = 1.0,
): number[] {
  const energies = scores.map((s) => 1 - s);
  const minEnergy = Math.min(...energies);
  const boltzmannFactors = energies.map((e) =>
    Math.exp(-(e - minEnergy) / temperature)
  );
  const sum = boltzmannFactors.reduce((a, b) => a + b, 0);
  return boltzmannFactors.map((f) => f / sum);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPONENTIAL BACKOFF (Radioactive Decay)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Exponential backoff with jitter — models radioactive decay.
 *
 * Physics analogy: N(t) = N₀ * e^(-λt)
 * Retry delay = baseDelay * 2^attempt * (1 + random jitter)
 *
 * Jitter prevents thundering herd (phase synchronization).
 */
export function exponentialBackoff(
  attempt: number,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 30000,
  jitterFactor: number = 0.3,
): number {
  // Exponential decay: delay = base * 2^attempt
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);

  // Add jitter: random offset to prevent synchronization
  const jitter = exponentialDelay * jitterFactor * (Math.random() * 2 - 1);

  // Clamp to max delay
  return Math.min(maxDelayMs, Math.max(0, exponentialDelay + jitter));
}

/**
 * Calculate retry delay using Fibonacci backoff (golden ratio inspired).
 *
 * Physics analogy: Fibonacci sequence approximates golden ratio φ = 1.618...
 * Each retry waits φ times longer than the previous.
 */
export function fibonacciBackoff(
  attempt: number,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 30000,
): number {
  const PHI = (1 + Math.sqrt(5)) / 2; // Golden ratio
  const delay = baseDelayMs * Math.pow(PHI, attempt);
  return Math.min(maxDelayMs, Math.max(0, delay));
}

// ═══════════════════════════════════════════════════════════════════════════════
// COSINE SIMILARITY (Vector Mathematics)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Cosine similarity between two vectors.
 *
 * Physics analogy: Angle between vectors in n-dimensional space.
 * similarity = (A · B) / (|A| * |B|)
 *
 * Used for semantic search — comparing embedding vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error("Vectors must have same length");

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Euclidean distance between two vectors.
 *
 * Physics analogy: Straight-line distance in n-dimensional space.
 * distance = √(Σ(aᵢ - bᵢ)²)
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error("Vectors must have same length");

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHANNON ENTROPY (Information Theory)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Shannon entropy — measures information content / uncertainty.
 *
 * Physics analogy: Entropy in thermodynamics (disorder).
 * H(X) = -Σ p(x) * log₂(p(x))
 *
 * Used for data freshness scoring — high entropy = diverse/unpredictable data.
 */
export function shannonEntropy(data: string): number {
  if (data.length === 0) return 0;

  const freq = new Map<string, number>();
  for (const char of data) {
    freq.set(char, (freq.get(char) || 0) + 1);
  }

  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / data.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

/**
 * Data freshness score based on entropy and time decay.
 *
 * Physics analogy: Radioactive decay + entropy
 * freshness = entropy * e^(-λt)
 * where λ = decay constant, t = time since creation
 */
export function dataFreshness(
  createdAt: number,
  now: number = Date.now(),
  decayConstant: number = 0.001,
  entropyBonus: number = 0,
): number {
  const ageMs = now - createdAt;
  const timeDecay = Math.exp(-decayConstant * ageMs);
  return Math.min(1, timeDecay + entropyBonus * 0.1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIFFUSION (Brownian Motion)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Simulate Brownian motion for trust score exploration.
 *
 * Physics analogy: Random walk of particles in fluid.
 * Used to explore nearby trust states without deterministic path.
 */
export function brownianStep(
  currentScore: number,
  stepSize: number = 0.05,
  bounds: [number, number] = [0, 1],
): number {
  // Random step from normal distribution (Box-Muller transform)
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

  const newScore = currentScore + z * stepSize;
  return Math.max(bounds[0], Math.min(bounds[1], newScore));
}

/**
 * Simulate multiple Brownian steps to find optimal trust score.
 */
export function brownianSearch(
  initialScore: number,
  objective: (score: number) => number,
  iterations: number = 100,
  stepSize: number = 0.05,
): { score: number; value: number; history: number[] } {
  let currentScore = initialScore;
  let bestScore = initialScore;
  let bestValue = objective(initialScore);
  const history = [initialScore];

  for (let i = 0; i < iterations; i++) {
    const newScore = brownianStep(currentScore, stepSize);
    const newValue = objective(newScore);

    if (newValue > bestValue) {
      bestScore = newScore;
      bestValue = newValue;
    }

    currentScore = newScore;
    history.push(currentScore);
  }

  return { score: bestScore, value: bestValue, history };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HARMONIC OSCILLATOR (Spring Physics)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Damped harmonic oscillator — models trust score oscillation.
 *
 * Physics analogy: x(t) = A * e^(-γt) * cos(ωt + φ)
 * where γ = damping, ω = frequency, φ = phase
 *
 * Used to model trust score fluctuations over time.
 */
export function harmonicOscillator(
  amplitude: number,
  damping: number,
  frequency: number,
  phase: number,
  time: number,
): number {
  return amplitude * Math.exp(-damping * time) * Math.cos(frequency * time + phase);
}

/**
 * Calculate equilibrium position of a damped oscillator.
 * Trust scores converge to equilibrium after oscillations decay.
 */
export function equilibriumPosition(
  initialScore: number,
  targetScore: number,
  damping: number,
  time: number,
): number {
  // Equilibrium is the target score
  // Deviation decays exponentially
  const deviation = (initialScore - targetScore) * Math.exp(-damping * time);
  return targetScore + deviation;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MONTE CARLO TREE SEARCH (MCTS) — Game Theory / AI Planning
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * MCTS Node — represents a state in the trust/agent decision tree.
 *
 * Game theory analogy: Each node is a possible trust configuration.
 * MCTS explores the tree to find optimal trust delegation strategies.
 */
export interface MCTSNode {
  id: string;
  state: Record<string, unknown>;
  visits: number;
  wins: number;
  children: MCTSNode[];
  parent: MCTSNode | null;
  action?: string;
}

/**
 * Create a new MCTS node.
 */
export function createMCTSNode(
  id: string,
  state: Record<string, unknown>,
  parent: MCTSNode | null = null,
  action?: string,
): MCTSNode {
  return { id, state, visits: 0, wins: 0, children: [], parent, action };
}

/**
 * UCB1 (Upper Confidence Bound 1) — balances exploration vs exploitation.
 *
 * Physics analogy: Like a particle exploring energy landscape.
 * UCB1 = wins/visits + C * sqrt(ln(parent_visits) / visits)
 *
 * C = exploration constant (higher = more exploration)
 */
export function ucb1(node: MCTSNode, explorationConstant: number = 1.414): number {
  if (node.visits === 0) return Infinity; // Unvisited nodes get priority
  return (node.wins / node.visits) + explorationConstant * Math.sqrt(
    Math.log(node.parent?.visits || 1) / node.visits
  );
}

/**
 * MCTS Select — traverse tree using UCB1 to find most promising node.
 */
export function mctsSelect(root: MCTSNode): MCTSNode {
  let current = root;
  while (current.children.length > 0) {
    current = current.children.reduce((best, child) =>
      ucb1(child) > ucb1(best) ? child : best
    );
  }
  return current;
}

/**
 * MCTS Expand — add child nodes to a selected node.
 */
export function mctsExpand(
  node: MCTSNode,
  possibleActions: string[],
): MCTSNode {
  const children = possibleActions.map((action) =>
    createMCTSNode(`${node.id}-${action}`, { ...node.state }, node, action)
  );
  node.children = children;
  return children[0] || node;
}

/**
 * MCTS Simulate — random rollout from a node to estimate value.
 * Uses Brownian motion for stochastic exploration.
 */
export function mctsSimulate(
  node: MCTSNode,
  simulateFn: (state: Record<string, unknown>) => number,
  maxSteps: number = 100,
): number {
  let state = { ...node.state };
  let totalReward = 0;

  for (let i = 0; i < maxSteps; i++) {
    // Use Brownian motion to explore state space
    const step = brownianStep(0, 0.1);
    state = { ...state, exploration: step };
    totalReward += simulateFn(state);
  }

  return totalReward / maxSteps;
}

/**
 * MCTS Backpropagate — update node statistics from leaf to root.
 */
export function mctsBackpropagate(
  node: MCTSNode,
  reward: number,
): void {
  let current: MCTSNode | null = node;
  while (current) {
    current.visits++;
    current.wins += reward;
    current = current.parent;
  }
}

/**
 * Full MCTS iteration — select, expand, simulate, backpropagate.
 */
export function mctsIterate(
  root: MCTSNode,
  possibleActions: string[],
  simulateFn: (state: Record<string, unknown>) => number,
): MCTSNode {
  // 1. Select
  const selected = mctsSelect(root);

  // 2. Expand
  const expanded = mctsExpand(selected, possibleActions);

  // 3. Simulate
  const reward = mctsSimulate(expanded, simulateFn);

  // 4. Backpropagate
  mctsBackpropagate(expanded, reward);

  return root;
}

/**
 * Get best action from MCTS root after many iterations.
 */
export function mctsBestAction(
  root: MCTSNode,
  iterations: number = 1000,
  possibleActions: string[],
  simulateFn: (state: Record<string, unknown>) => number,
): string | null {
  for (let i = 0; i < iterations; i++) {
    mctsIterate(root, possibleActions, simulateFn);
  }

  if (root.children.length === 0) return null;

  // Return action with most visits (most confident choice)
  return root.children.reduce((best, child) =>
    child.visits > best.visits ? child : best
  ).action || null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOPOLOGY — Graph Theory / Network Analysis
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Graph node with topology metadata.
 */
export interface TopologyNode {
  id: string;
  label: string;
  degree: number;          // Number of connections
  betweenness: number;     // How often this node lies on shortest paths
  clustering: number;      // How connected are this node's neighbors
}

/**
 * Graph edge with weight.
 */
export interface TopologyEdge {
  source: string;
  target: string;
  weight: number;
}

/**
 * Compute degree centrality — how many direct connections a node has.
 *
 * Network analogy: Hub airports have high degree centrality.
 */
export function degreeCentrality(
  edges: TopologyEdge[],
  nodeId: string,
): number {
  const connections = edges.filter(
    (e) => e.source === nodeId || e.target === nodeId
  );
  return connections.length;
}

/**
 * Compute clustering coefficient — how connected are a node's neighbors.
 *
 * Network analogy: Friends of friends who are also friends.
 * clustering = (actual connections between neighbors) / (possible connections)
 */
export function clusteringCoefficient(
  edges: TopologyEdge[],
  nodeId: string,
): number {
  const neighbors = new Set<string>();
  for (const edge of edges) {
    if (edge.source === nodeId) neighbors.add(edge.target);
    if (edge.target === nodeId) neighbors.add(edge.source);
  }

  if (neighbors.size < 2) return 0;

  let actualConnections = 0;
  const neighborArray = Array.from(neighbors);
  for (let i = 0; i < neighborArray.length; i++) {
    for (let j = i + 1; j < neighborArray.length; j++) {
      const hasConnection = edges.some(
        (e) =>
          (e.source === neighborArray[i] && e.target === neighborArray[j]) ||
          (e.source === neighborArray[j] && e.target === neighborArray[i])
      );
      if (hasConnection) actualConnections++;
    }
  }

  const possibleConnections = (neighbors.size * (neighbors.size - 1)) / 2;
  return actualConnections / possibleConnections;
}

/**
 * Compute betweenness centrality — how often a node lies on shortest paths.
 *
 * Network analogy: Bridges connecting different communities.
 * Uses BFS for shortest path counting.
 */
export function betweennessCentrality(
  nodes: string[],
  edges: TopologyEdge[],
): Map<string, number> {
  const betweenness = new Map<string, number>();
  nodes.forEach((n) => betweenness.set(n, 0));

  for (const source of nodes) {
    // BFS from source
    const distances = new Map<string, number>();
    const predecessors = new Map<string, string[]>();
    const sigma = new Map<string, number>(); // Shortest path count
    const queue: string[] = [source];

    distances.set(source, 0);
    sigma.set(source, 1);

    while (queue.length > 0) {
      const v = queue.shift()!;
      const neighbors = edges
        .filter((e) => e.source === v || e.target === v)
        .map((e) => (e.source === v ? e.target : e.source));

      for (const w of neighbors) {
        if (!distances.has(w)) {
          distances.set(w, (distances.get(v) || 0) + 1);
          queue.push(w);
        }
        if (distances.get(w) === (distances.get(v) || 0) + 1) {
          sigma.set(w, (sigma.get(w) || 0) + (sigma.get(v) || 1));
          if (!predecessors.has(w)) predecessors.set(w, []);
          predecessors.get(w)!.push(v);
        }
      }
    }

    // Accumulate betweenness
    const delta = new Map<string, number>();
    nodes.forEach((n) => delta.set(n, 0));

    // Process nodes in reverse order of distance
    const sortedNodes = nodes
      .filter((n) => distances.has(n))
      .sort((a, b) => (distances.get(b) || 0) - (distances.get(a) || 0));

    for (const w of sortedNodes) {
      const preds = predecessors.get(w) || [];
      for (const v of preds) {
        const contribution = ((sigma.get(v) || 1) / (sigma.get(w) || 1)) * (1 + (delta.get(w) || 0));
        delta.set(v, (delta.get(v) || 0) + contribution);
      }
      if (w !== source) {
        betweenness.set(w, (betweenness.get(w) || 0) + (delta.get(w) || 0));
      }
    }
  }

  return betweenness;
}

/**
 * Detect communities using label propagation.
 *
 * Network analogy: Nodes naturally form clusters based on connections.
 */
export function labelPropagation(
  nodes: string[],
  edges: TopologyEdge[],
  maxIterations: number = 100,
): Map<string, number> {
  const labels = new Map<string, number>();
  nodes.forEach((n, i) => labels.set(n, i)); // Initial: each node is its own community

  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false;

    for (const node of nodes) {
      const neighbors = edges
        .filter((e) => e.source === node || e.target === node)
        .map((e) => (e.source === node ? e.target : e.source));

      if (neighbors.length === 0) continue;

      // Count label frequencies among neighbors
      const labelCounts = new Map<number, number>();
      for (const neighbor of neighbors) {
        const label = labels.get(neighbor) || 0;
        labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
      }

      // Assign most frequent label
      const maxLabel = Array.from(labelCounts.entries())
        .reduce((max, [label, count]) => count > max[1] ? [label, count] : max, [0, 0])[0];

      if (labels.get(node) !== maxLabel) {
        labels.set(node, maxLabel);
        changed = true;
      }
    }

    if (!changed) break;
  }

  return labels;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIMULATION — Monte Carlo / Stochastic Modeling
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Monte Carlo simulation — estimate trust score distribution.
 *
 * Physics analogy: Random sampling to estimate system properties.
 * Runs N simulations with random perturbations to estimate distribution.
 */
export function monteCarloTrustSimulation(
  baseScore: number,
  uncertainty: number,
  simulations: number = 1000,
): {
  mean: number;
  stdDev: number;
  confidence95: [number, number];
  samples: number[];
} {
  const samples: number[] = [];

  for (let i = 0; i < simulations; i++) {
    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    // Perturb score with Gaussian noise
    const perturbedScore = baseScore + z * uncertainty;
    samples.push(Math.max(0, Math.min(1, perturbedScore)));
  }

  // Calculate statistics
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const variance = samples.reduce((sum, s) => sum + (s - mean) ** 2, 0) / samples.length;
  const stdDev = Math.sqrt(variance);

  // 95% confidence interval (±1.96σ)
  const sorted = [...samples].sort((a, b) => a - b);
  const ciLower = sorted[Math.floor(simulations * 0.025)];
  const ciUpper = sorted[Math.floor(simulations * 0.975)];

  return { mean, stdDev, confidence95: [ciLower, ciUpper], samples };
}

/**
 * Agent-based simulation — model trust propagation through a network.
 *
 * Physics analogy: Particle simulation where agents interact and propagate trust.
 */
export function agentBasedSimulation(
  agents: Array<{ id: string; trust: number; connections: string[] }>,
  iterations: number = 50,
  decayFactor: number = 0.9,
): Map<string, number[]> {
  const trustHistory = new Map<string, number[]>();
  const currentTrust = new Map<string, number>();

  // Initialize
  for (const agent of agents) {
    currentTrust.set(agent.id, agent.trust);
    trustHistory.set(agent.id, [agent.trust]);
  }

  // Simulate trust propagation
  for (let iter = 0; iter < iterations; iter++) {
    const newTrust = new Map<string, number>();

    for (const agent of agents) {
      const neighbors = agent.connections
        .map((id) => agents.find((a) => a.id === id))
        .filter(Boolean) as typeof agents;

      if (neighbors.length === 0) {
        newTrust.set(agent.id, currentTrust.get(agent.id) || 0);
        continue;
      }

      // Average neighbor trust, weighted by inverse square distance
      let weightedSum = 0;
      let weightSum = 0;

      for (let i = 0; i < neighbors.length; i++) {
        const weight = 1 / ((i + 1) ** 2); // Inverse square law
        weightedSum += (currentTrust.get(neighbors[i].id) || 0) * weight;
        weightSum += weight;
      }

      const neighborInfluence = weightSum > 0 ? weightedSum / weightSum : 0;
      const newScore = decayFactor * (currentTrust.get(agent.id) || 0) + (1 - decayFactor) * neighborInfluence;

      newTrust.set(agent.id, Math.max(0, Math.min(1, newScore)));
    }

    // Update history
    for (const agent of agents) {
      const score = newTrust.get(agent.id) || 0;
      currentTrust.set(agent.id, score);
      trustHistory.get(agent.id)?.push(score);
    }
  }

  return trustHistory;
}

/**
 * Bootstrap confidence interval — estimate parameter confidence without distribution assumptions.
 *
 * Statistics analogy: Resample data with replacement to estimate uncertainty.
 */
export function bootstrapConfidence(
  data: number[],
  statisticFn: (sample: number[]) => number,
  iterations: number = 1000,
  confidenceLevel: number = 0.95,
): { estimate: number; ciLower: number; ciUpper: number } {
  const estimate = statisticFn(data);
  const bootstrapStats: number[] = [];

  for (let i = 0; i < iterations; i++) {
    // Resample with replacement
    const sample = Array.from({ length: data.length }, () =>
      data[Math.floor(Math.random() * data.length)]
    );
    bootstrapStats.push(statisticFn(sample));
  }

  bootstrapStats.sort((a, b) => a - b);
  const alpha = 1 - confidenceLevel;
  const ciLower = bootstrapStats[Math.floor(iterations * alpha / 2)];
  const ciUpper = bootstrapStats[Math.floor(iterations * (1 - alpha / 2))];

  return { estimate, ciLower, ciUpper };
}

/**
 * Random walk on trust graph — explore trust states stochastically.
 *
 * Physics analogy: Brownian motion on a discrete graph.
 */
export function randomWalkTrust(
  graph: Map<string, string[]>,
  startNode: string,
  steps: number = 100,
): { visitCounts: Map<string, number>; stationaryDistribution: Map<string, number> } {
  const visitCounts = new Map<string, number>();
  let current = startNode;

  for (let i = 0; i < steps; i++) {
    visitCounts.set(current, (visitCounts.get(current) || 0) + 1);
    const neighbors = graph.get(current) || [];
    if (neighbors.length === 0) break;
    current = neighbors[Math.floor(Math.random() * neighbors.length)];
  }

  // Stationary distribution = visit frequency
  const stationaryDistribution = new Map<string, number>();
  for (const [node, count] of visitCounts) {
    stationaryDistribution.set(node, count / steps);
  }

  return { visitCounts, stationaryDistribution };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PILLAR 1 — IDEAL GAS LAW, CARNOT, FICK, FOURIER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Ideal Gas Law — models request pressure in rate limiter.
 *
 * Physics analogy: PV = nRT
 * Pressure × Volume = moles × gas constant × Temperature
 *
 * AxiomID: P = request pressure, V = bucket capacity,
 * n = active requests, T = system load factor
 */
export function idealGasPressure(
  activeRequests: number,
  capacity: number,
  temperature: number,
  gasConstant: number = 1,
): number {
  if (capacity <= 0) return Infinity;
  return (activeRequests * gasConstant * temperature) / capacity;
}

/**
 * Carnot Efficiency — maximum theoretical efficiency of trust scoring.
 *
 * Physics analogy: η = 1 - T_cold / T_hot
 * No heat engine can exceed Carnot efficiency.
 *
 * AxiomID: Maximum achievable trust score given current data quality.
 * T_cold = noise level (uncertainty), T_hot = signal level (confidence)
 */
export function carnotTrustEfficiency(
  signalStrength: number,
  noiseLevel: number,
): number {
  if (signalStrength <= 0) return 0;
  const efficiency = 1 - noiseLevel / signalStrength;
  return Math.max(0, Math.min(1, efficiency));
}

/**
 * Fick's First Law of Diffusion — trust propagates from high to low concentration.
 *
 * Physics analogy: J = -D × dC/dx
 * Flux = -Diffusivity × Concentration gradient
 *
 * AxiomID: Trust diffuses from high-trust nodes to low-trust neighbors.
 * J = trust flux, D = propagation rate, dC/dx = trust gradient
 */
export function fickTrustFlux(
  sourceTrust: number,
  targetTrust: number,
  diffusivity: number = 0.5,
  distance: number = 1,
): number {
  const gradient = (targetTrust - sourceTrust) / distance;
  return -diffusivity * gradient;
}

/**
 * Fick's Second Law — time evolution of trust concentration.
 *
 * Physics analogy: ∂C/∂t = D × ∂²C/∂x²
 *
 * AxiomID: How trust concentration changes over time at each node.
 */
export function fickTrustEvolution(
  trustAtNode: number,
  trustNeighbors: number[],
  timeStep: number = 0.1,
  diffusivity: number = 0.5,
): number {
  if (trustNeighbors.length === 0) return trustAtNode;

  const averageNeighborTrust = trustNeighbors.reduce((a, b) => a + b, 0) / trustNeighbors.length;
  const laplacian = trustAtNode - averageNeighborTrust;
  const delta = diffusivity * laplacian * timeStep;

  return Math.max(0, Math.min(1, trustAtNode - delta));
}

/**
 * Fourier's Heat Equation — trust "heat" propagation through graph.
 *
 * Physics analogy: ∂T/∂t = α × ∇²T
 * Alpha = thermal diffusivity = k / (ρ × cp)
 *
 * AxiomID: Trust heat diffuses through the network.
 * Hot (high trust) nodes heat up cold (low trust) neighbors.
 */
export function fourierTrustHeat(
  nodeTrust: number,
  neighborTrusts: number[],
  thermalDiffusivity: number = 0.3,
  timeStep: number = 0.1,
): number {
  if (neighborTrusts.length === 0) return nodeTrust;

  const averageNeighborTemp = neighborTrusts.reduce((a, b) => a + b, 0) / neighborTrusts.length;
  const laplacian = averageNeighborTemp - nodeTrust;
  const delta = thermalDiffusivity * laplacian * timeStep;

  return Math.max(0, Math.min(1, nodeTrust + delta));
}

/**
 * Thermal Equilibrium — trust system reaches steady state.
 *
 * Physics analogy: ∇²T = 0 (Laplace equation)
 * No net heat flow when temperature gradient is zero.
 *
 * AxiomID: Trust distribution is stable when all nodes have equal trust.
 */
export function thermalEquilibriumError(
  trustDistribution: number[],
): number {
  if (trustDistribution.length <= 1) return 0;
  const mean = trustDistribution.reduce((a, b) => a + b, 0) / trustDistribution.length;
  const variance = trustDistribution.reduce((sum, t) => sum + (t - mean) ** 2, 0) / trustDistribution.length;
  return Math.sqrt(variance);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PILLAR 2 — NYQUIST-SHANNON, HUFFMAN, MUTUAL INFORMATION, SNR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Nyquist-Shannon Sampling Theorem — minimum sync frequency.
 *
 * Physics analogy: fs ≥ 2 × fmax
 * To reconstruct a signal perfectly, sample at least twice its max frequency.
 *
 * AxiomID: Minimum heartbeat frequency to capture all trust changes.
 */
export function nyquistMinSyncRate(
  maxTrustChangeRate: number, // Hz — maximum trust changes per second
): number {
  return 2 * maxTrustChangeRate;
}

/**
 * Shannon-Hartley Theorem — channel capacity for trust transmission.
 *
 * Physics analogy: C = B × log₂(1 + S/N)
 * Channel capacity = Bandwidth × log₂(1 + Signal/Noise)
 *
 * AxiomID: Maximum trust information rate through delegation channel.
 */
export function shannonHartleyCapacity(
  bandwidth: number,
  signalPower: number,
  noisePower: number,
): number {
  if (noisePower <= 0) return Infinity;
  if (signalPower / noisePower <= 0) return 0;
  return bandwidth * Math.log2(1 + signalPower / noisePower);
}

/**
 * Huffman Coding — optimal prefix-free code for trust data compression.
 *
 * Physics analogy: Variable-length coding based on symbol probability.
 * High-probability symbols get short codes, low-probability get long codes.
 *
 * AxiomID: Compress trust delegation data for efficient transmission.
 */
export interface HuffmanNode {
  symbol: string | null;
  frequency: number;
  left: HuffmanNode | null;
  right: HuffmanNode | null;
  code: string;
}

export function buildHuffmanTree(symbols: Map<string, number>): HuffmanNode {
  const nodes: HuffmanNode[] = Array.from(symbols.entries()).map(([symbol, frequency]) => ({
    symbol,
    frequency,
    left: null,
    right: null,
    code: "",
  }));

  while (nodes.length > 1) {
    nodes.sort((a, b) => a.frequency - b.frequency);
    const left = nodes.shift()!;
    const right = nodes.shift()!;

    const parent: HuffmanNode = {
      symbol: null,
      frequency: left.frequency + right.frequency,
      left,
      right,
      code: "",
    };

    nodes.push(parent);
  }

  return nodes[0];
}

export function buildHuffmanCodes(
  node: HuffmanNode,
  prefix: string = "",
  codes: Map<string, string> = new Map(),
): Map<string, string> {
  if (node.symbol !== null) {
    codes.set(node.symbol, prefix);
  }
  if (node.left) buildHuffmanCodes(node.left, prefix + "0", codes);
  if (node.right) buildHuffmanCodes(node.right, prefix + "1", codes);
  return codes;
}

export function huffmanCompress(data: string[], symbolFrequencies: Map<string, number>): { codes: Map<string, string>; encoded: string; compressionRatio: number } {
  const tree = buildHuffmanTree(symbolFrequencies);
  const codes = buildHuffmanCodes(tree);

  const originalBits = data.length * 8; // Assume 8-bit symbols
  let encodedBits = 0;
  for (const symbol of data) {
    const code = codes.get(symbol);
    if (code) encodedBits += code.length;
  }

  return {
    codes,
    encoded: data.map((s) => codes.get(s) || "").join(""),
    compressionRatio: originalBits > 0 ? encodedBits / originalBits : 0,
  };
}

/**
 * Mutual Information — trust correlation between two agents.
 *
 * Physics analogy: I(X;Y) = H(X) - H(X|Y)
 * Measures reduction in uncertainty about X given knowledge of Y.
 *
 * AxiomID: How much trust information is shared between two DIDs.
 */
export function mutualInformation(
  jointDistribution: number[][], // P(X,Y) matrix
): number {
  const nX = jointDistribution.length;
  if (nX === 0) return 0;
  const nY = jointDistribution[0].length;
  if (nY === 0) return 0;

  // Marginal distributions
  const pX = new Array(nX).fill(0);
  const pY = new Array(nY).fill(0);
  let total = 0;

  for (let i = 0; i < nX; i++) {
    for (let j = 0; j < nY; j++) {
      const val = jointDistribution[i][j];
      pX[i] += val;
      pY[j] += val;
      total += val;
    }
  }

  // Normalize
  for (let i = 0; i < nX; i++) pX[i] /= total;
  for (let j = 0; j < nY; j++) pY[j] /= total;

  // MI = ΣΣ P(x,y) × log₂(P(x,y) / (P(x)×P(y)))
  let mi = 0;
  for (let i = 0; i < nX; i++) {
    for (let j = 0; j < nY; j++) {
      const pxy = jointDistribution[i][j] / total;
      if (pxy > 0 && pX[i] > 0 && pY[j] > 0) {
        mi += pxy * Math.log2(pxy / (pX[i] * pY[j]));
      }
    }
  }

  return mi;
}

/**
 * Signal-to-Noise Ratio — trust signal quality metric.
 *
 * Physics analogy: SNR = P_signal / P_noise
 * Higher SNR = cleaner trust signal.
 */
export function trustSignalToNoise(
  signalPower: number,
  noisePower: number,
): number {
  if (noisePower <= 0) return Infinity;
  return signalPower / noisePower;
}

/**
 * Kullback-Leibler Divergence — trust distribution distance.
 *
 * Physics analogy: D_KL(P||Q) = Σ P(x) × log(P(x) / Q(x))
 * Measures how much information is lost when Q approximates P.
 *
 * AxiomID: How different two trust distributions are.
 */
export function klDivergence(
  p: number[],
  q: number[],
): number {
  if (p.length !== q.length) throw new Error("Distributions must have same length");

  let dkl = 0;
  for (let i = 0; i < p.length; i++) {
    if (p[i] > 0 && q[i] > 0) {
      dkl += p[i] * Math.log2(p[i] / q[i]);
    }
  }
  return dkl;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PILLAR 3 — PAGERANK, SPECTRAL CLUSTERING, NASH EQUILIBRIUM, MIN-CUT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * PageRank — recursive trust importance ranking.
 *
 * Physics analogy: A page is important if important pages link to it.
 * PR(A) = (1-d)/N + d × Σ PR(Tᵢ)/C(Tᵢ)
 *
 * AxiomID: A DID is trustworthy if trustworthy DIDs vouch for it.
 */
export function pageRankTrust(
  nodes: string[],
  edges: TopologyEdge[],
  dampingFactor: number = 0.85,
  iterations: number = 100,
): Map<string, number> {
  const n = nodes.length;
  if (n === 0) return new Map();

  // Build adjacency matrix
  const outDegrees = new Map<string, number>();
  const inLinks = new Map<string, string[]>();

  for (const node of nodes) {
    outDegrees.set(node, 0);
    inLinks.set(node, []);
  }

  for (const edge of edges) {
    outDegrees.set(edge.source, (outDegrees.get(edge.source) || 0) + 1);
    const links = inLinks.get(edge.target) || [];
    links.push(edge.source);
    inLinks.set(edge.target, links);
  }

  // Initialize ranks
  const ranks = new Map<string, number>();
  for (const node of nodes) ranks.set(node, 1 / n);

  // Iterate
  for (let iter = 0; iter < iterations; iter++) {
    const newRanks = new Map<string, number>();
    let sinkSum = 0;

    // Handle sink nodes (no outgoing edges)
    for (const node of nodes) {
      if ((outDegrees.get(node) || 0) === 0) {
        sinkSum += (ranks.get(node) || 0) / n;
      }
    }

    for (const node of nodes) {
      let rank = sinkSum;

      // Add contributions from in-links
      for (const inLink of inLinks.get(node) || []) {
        rank += (ranks.get(inLink) || 0) / (outDegrees.get(inLink) || 1);
      }

      rank = (1 - dampingFactor) / n + dampingFactor * rank;
      newRanks.set(node, rank);
    }

    // Update ranks
    for (const node of nodes) {
      ranks.set(node, newRanks.get(node) || 0);
    }
  }

  return ranks;
}

/**
 * Spectral Clustering — community detection using graph Laplacian.
 *
 * Physics analogy: Eigenvalues of Laplacian reveal graph structure.
 * L = D - A (Laplacian = Degree matrix - Adjacency matrix)
 *
 * AxiomID: Find natural trust communities in delegation network.
 */
export function laplacianMatrix(
  nodes: string[],
  edges: TopologyEdge[],
): number[][] {
  const index = new Map<string, number>();
  nodes.forEach((n, i) => index.set(n, i));
  const n = nodes.length;
  const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (const edge of edges) {
    const i = index.get(edge.source);
    const j = index.get(edge.target);
    if (i === undefined || j === undefined) continue;

    // Degree contribution
    L[i][i] += edge.weight;
    L[j][j] += edge.weight;

    // Negative adjacency
    L[i][j] -= edge.weight;
    L[j][i] -= edge.weight;
  }

  return L;
}

/**
 * Power Iteration — find dominant eigenvalue/eigenvector of Laplacian.
 *
 * Used for spectral clustering: the second smallest eigenvector (Fiedler)
 * reveals the optimal community split.
 */
export function powerIteration(
  matrix: number[][],
  iterations: number = 100,
): number[] {
  const n = matrix.length;
  let vector = Array.from({ length: n }, () => Math.random());

  for (let iter = 0; iter < iterations; iter++) {
    // Multiply matrix × vector
    const newVector = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        newVector[i] += matrix[i][j] * vector[j];
      }
    }

    // Normalize
    const norm = Math.sqrt(newVector.reduce((sum, v) => sum + v * v, 0));
    vector = newVector.map((v) => v / (norm || 1));
  }

  return vector;
}

/**
 * Fiedler Vector — second smallest eigenvector for community detection.
 * Nodes with same sign belong to same community.
 */
export function fiedlerPartition(
  nodes: string[],
  edges: TopologyEdge[],
): { communityA: string[]; communityB: string[] } {
  const L = laplacianMatrix(nodes, edges);
  const vector = powerIteration(L, 100);
  const mean = vector.reduce((a, b) => a + b, 0) / vector.length;

  return {
    communityA: nodes.filter((_, i) => vector[i] >= mean),
    communityB: nodes.filter((_, i) => vector[i] < mean),
  };
}

/**
 * Nash Equilibrium — no agent can improve trust unilaterally.
 *
 * Game theory: A strategy profile where no player can benefit
 * by changing their strategy while others keep theirs fixed.
 *
 * AxiomID: A trust configuration where no agent can improve
 * their trust score without others changing theirs.
 */
export function nashEquilibrium(
  agents: Array<{
    id: string;
    currentTrust: number;
    alternativeTrusts: Array<{ trust: number; profit: number }>;
  }>,
): string[] {
  const stableAgents: string[] = [];

  for (const agent of agents) {
    let isStable = true;

    for (const alt of agent.alternativeTrusts) {
      // Check if deviation is profitable
      if (alt.profit > 0) {
        isStable = false;
        break;
      }
    }

    if (isStable) {
      stableAgents.push(agent.id);
    }
  }

  return stableAgents;
}

/**
 * Best Response Dynamics — agents iteratively choose optimal trust.
 *
 * Game theory: Each agent chooses the strategy that maximizes
 * their payoff given others' strategies.
 */
export function bestResponseDynamics(
  agents: Array<{
    id: string;
    strategies: Array<{ label: string; payoff: number }>;
  }>,
): Map<string, string> {
  const bestResponses = new Map<string, string>();

  for (const agent of agents) {
    if (agent.strategies.length === 0) continue;
    const best = agent.strategies.reduce((a, b) => a.payoff > b.payoff ? a : b);
    bestResponses.set(agent.id, best.label);
  }

  return bestResponses;
}

/**
 * Min-Cut Max-Flow — find trust bottlenecks in network.
 *
 * Physics analogy: max flow = min cut (Ford-Fulkerson theorem)
 * The maximum amount of trust flowing through a network equals
 * the minimum capacity cut that separates source from sink.
 *
 * AxiomID: Find the weakest link in a trust delegation chain.
 */
export function minCutTrustBottleneck(
  edges: TopologyEdge[],
  source: string,
  sink: string,
): { maxFlow: number; cutEdges: TopologyEdge[]; bottleneckNodes: string[] } {
  // Build adjacency for Ford-Fulkerson (simplified Edmonds-Karp)
  const graph = new Map<string, Map<string, number>>();

  for (const edge of edges) {
    if (!graph.has(edge.source)) graph.set(edge.source, new Map());
    if (!graph.has(edge.target)) graph.set(edge.target, new Map());
    graph.get(edge.source)!.set(edge.target, (graph.get(edge.source)!.get(edge.target) || 0) + edge.weight);
    if (!graph.get(edge.target)!.has(edge.source)) {
      graph.get(edge.target)!.set(edge.source, 0);
    }
  }

  let maxFlow = 0;
  const cutEdges: TopologyEdge[] = [];
  const visitedNodes = new Set<string>();

  // BFS to find augmenting path
  function bfs(s: string, t: string, parent: Map<string, string | null>): boolean {
    const visited = new Set<string>();
    const queue: string[] = [s];
    visited.add(s);

    while (queue.length > 0) {
      const u = queue.shift()!;
      const neighbors = graph.get(u);

      if (!neighbors) continue;
      for (const [v, capacity] of neighbors) {
        if (!visited.has(v) && capacity > 0) {
          visited.add(v);
          parent.set(v, u);
          queue.push(v);
          if (v === t) return true;
        }
      }
    }

    return false;
  }

  // Edmonds-Karp
  while (true) {
    const parent = new Map<string, string | null>();
    if (!bfs(source, sink, parent)) break;

    let pathFlow = Infinity;
    let v = sink;
    while (v !== source) {
      const u = parent.get(v);
      if (!u) break;
      const capacity = graph.get(u)?.get(v) || 0;
      pathFlow = Math.min(pathFlow, capacity);
      v = u;
    }

    // Update residual graph
    v = sink;
    while (v !== source) {
      const u = parent.get(v);
      if (!u) break;
      const forward = graph.get(u);
      const backward = graph.get(v);
      if (forward) forward.set(v, (forward.get(v) || 0) - pathFlow);
      if (backward) backward.set(u, (backward.get(u) || 0) + pathFlow);
      v = u;
    }

    maxFlow += pathFlow;
  }

  // Find cut edges (edges from reachable to unreachable nodes after max flow)
  const reachable = new Set<string>();
  const dfsQ = [source];
  reachable.add(source);
  while (dfsQ.length > 0) {
    const u = dfsQ.shift()!;
    const neighbors = graph.get(u);
    if (!neighbors) continue;
    for (const [v, capacity] of neighbors) {
      if (!reachable.has(v) && capacity > 0) {
        reachable.add(v);
        dfsQ.push(v);
      }
    }
  }

  for (const edge of edges) {
    if (reachable.has(edge.source) && !reachable.has(edge.target)) {
      cutEdges.push(edge);
      visitedNodes.add(edge.source);
      visitedNodes.add(edge.target);
    }
  }

  return {
    maxFlow,
    cutEdges,
    bottleneckNodes: Array.from(visitedNodes),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PILLAR 4 — LANGEVIN, FOKKER-PLANCK, ISING, KURAMOTO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Langevin Equation — trust dynamics with external forces and noise.
 *
 * Physics analogy: m(d²x/dt²) = -γv + F(t) + η(t)
 * mass × acceleration = damping × velocity + external force + random noise
 *
 * AxiomID: Trust evolves under external influence (delegations, evidence)
 * plus random fluctuations (uncertainty).
 */
export function langevinTrustDynamics(
  currentTrust: number,
  externalForce: number,     // F(t) — evidence/delegation push
  damping: number = 0.1,     // γ — resistance to change
  noiseStrength: number = 0.05, // η — random uncertainty
  mass: number = 1,          // m — inertia (resistance to change)
  timeStep: number = 0.1,   // dt
): { newTrust: number; velocity: number } {
  // Random thermal noise (Gaussian)
  const u1 = Math.random();
  const u2 = Math.random();
  const noise = noiseStrength * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

  // dv/dt = (F - γv + η) / m
  const velocity = externalForce - damping * currentTrust + noise;

  // dx/dt = v
  const newTrust = currentTrust + velocity * timeStep / mass;

  return {
    newTrust: Math.max(0, Math.min(1, newTrust)),
    velocity,
  };
}

/**
 * Langevin Simulation — multi-step trust evolution with Langevin equation.
 */
export function langevinSimulation(
  initialTrust: number,
  externalForce: number,
  damping: number = 0.1,
  noiseStrength: number = 0.05,
  totalTime: number = 10,
  timeStep: number = 0.1,
): { trustHistory: number[]; finalTrust: number } {
  const trustHistory = [initialTrust];
  let trust = initialTrust;

  for (let t = 0; t < totalTime; t += timeStep) {
    const result = langevinTrustDynamics(trust, externalForce, damping, noiseStrength, 1, timeStep);
    trust = result.newTrust;

    // External force decays with time (evidence ages)
    externalForce *= (1 - damping * timeStep);

    trustHistory.push(trust);
  }

  return { trustHistory, finalTrust: trust };
}

/**
 * Fokker-Planck Equation — probability density evolution of trust.
 *
 * Physics analogy: ∂P/∂t = -∂(μP)/∂x + (1/2)∂²(σ²P)/∂x²
 * Drift + Diffusion governs probability density evolution.
 *
 * AxiomID: Evolution of trust score probability distribution.
 */
export function fokkerPlanckTrustEvolution(
  trustGrid: number[],          // Discretized trust space [0,1]
  probabilities: number[],      // Current probability density
  drift: number,                // μ — systematic drift (bias)
  diffusion: number,            // σ — random diffusion (uncertainty)
  timeStep: number = 0.01,     // dt
): number[] {
  const n = trustGrid.length;
  if (n < 3) return probabilities;

  const newProbabilities = new Array(n).fill(0);
  const dx = trustGrid[1] - trustGrid[0];

  // Discretized Fokker-Planck
  for (let i = 0; i < n; i++) {
    // ∂(μP)/∂x term (drift)
    const driftLeft = i > 0 ? drift * probabilities[i - 1] : 0;
    const driftRight = i < n - 1 ? drift * probabilities[i + 1] : 0;
    const driftTerm = -(driftRight - driftLeft) / (2 * dx);

    // ∂²(σ²P)/∂x² term (diffusion)
    const diffusionLeft = i > 0 ? diffusion * diffusion * probabilities[i - 1] : 0;
    const diffusionCenter = diffusion * diffusion * probabilities[i];
    const diffusionRight = i < n - 1 ? diffusion * diffusion * probabilities[i + 1] : 0;
    const diffusionTerm = (diffusionRight - 2 * diffusionCenter + diffusionLeft) / (dx * dx);

    newProbabilities[i] = probabilities[i] + timeStep * (driftTerm + 0.5 * diffusionTerm);

    // Boundary conditions: trust stays in [0, 1]
    if (i === 0 || i === n - 1) {
      newProbabilities[i] = Math.max(0, newProbabilities[i]);
    }
  }

  // Normalize
  const total = newProbabilities.reduce((a, b) => a + b, 0);
  if (total > 0) {
    for (let i = 0; i < n; i++) {
      newProbabilities[i] /= total;
    }
  }

  return newProbabilities;
}

/**
 * Ising Model — trust phase transitions (consensus vs fragmentation).
 *
 * Physics analogy: H = -J Σ sᵢsⱼ - h Σ sᵢ
 * Hamiltonian = -Coupling × Σ(spin×neighbor) - External field × Σ(spin)
 *
 * AxiomID: sᵢ = +1 (trusted), sᵢ = -1 (untrusted)
 * J = coupling strength, h = external trust field
 */
export function isingHamiltonian(
  spins: number[],              // +1 for trusted, -1 for untrusted
  coupling: number,             // J — interaction strength
  externalField: number,        // h — external trust pressure
  adjacencyMatrix: boolean[][], // Who is connected to whom
): number {
  const n = spins.length;
  let hamiltonian = 0;

  // Interaction term: -J × Σ sᵢsⱼ
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (adjacencyMatrix[i][j]) {
        hamiltonian -= coupling * spins[i] * spins[j];
      }
    }
  }

  // External field term: -h × Σ sᵢ
  for (let i = 0; i < n; i++) {
    hamiltonian -= externalField * spins[i];
  }

  return hamiltonian;
}

/**
 * Ising Magnetization — average trust alignment (order parameter).
 *
 * Physics analogy: M = (1/N) × Σ sᵢ
 * M = +1 = all trusted (ferromagnetic), M = 0 = random (paramagnetic)
 */
export function isingMagnetization(spins: number[]): number {
  if (spins.length === 0) return 0;
  return spins.reduce((a, b) => a + b, 0) / spins.length;
}

/**
 * Ising Metropolis Step — Monte Carlo move for Ising model.
 * Accepts/rejects spin flips based on energy change.
 */
export function isingMetropolisStep(
  spins: number[],
  coupling: number,
  externalField: number,
  adjacencyMatrix: boolean[][],
  temperature: number,
): number[] {
  const n = spins.length;
  const i = Math.floor(Math.random() * n);

  // Current Hamiltonian
  const currentH = isingHamiltonian(spins, coupling, externalField, adjacencyMatrix);

  // Flip spin
  const newSpins = [...spins];
  newSpins[i] *= -1;

  // New Hamiltonian
  const newH = isingHamiltonian(newSpins, coupling, externalField, adjacencyMatrix);

  // Metropolis acceptance
  const deltaH = newH - currentH;
  if (deltaH < 0 || Math.random() < Math.exp(-deltaH / temperature)) {
    return newSpins; // Accept flip
  }

  return spins; // Reject flip
}

/**
 * Ising Simulation — simulate trust consensus over time.
 */
export function isingTrustConsensus(
  n: number,
  coupling: number,
  externalField: number,
  temperature: number,
  steps: number = 1000,
): { spins: number[]; magnetization: number[]; finalMagnetization: number } {
  let spins: number[] = Array.from({ length: n }, () => Math.random() < 0.5 ? 1 : -1);

  // Fully connected graph
  const adjacency: boolean[][] = Array.from({ length: n }, () => new Array(n).fill(true));
  for (let i = 0; i < n; i++) adjacency[i][i] = false;

  const magnetizationHistory: number[] = [];

  for (let step = 0; step < steps; step++) {
    spins = isingMetropolisStep(spins, coupling, externalField, adjacency, temperature);
    magnetizationHistory.push(isingMagnetization(spins));
  }

  return {
    spins,
    magnetization: magnetizationHistory,
    finalMagnetization: magnetizationHistory[magnetizationHistory.length - 1],
  };
}

/**
 * Kuramoto Model — trust synchronization among agents.
 *
 * Physics analogy: dθᵢ/dt = ωᵢ + (K/N) × Σ sin(θⱼ - θᵢ)
 * Each oscillator has natural frequency ωᵢ and couples to others with
 * strength K. When coupling is strong enough, oscillators synchronize.
 *
 * AxiomID: θᵢ = trust phase (angle), ωᵢ = natural trust rate,
 * K = coupling = delegation strength
 */
export function kuramotoTrustSync(
  naturalFrequencies: number[],  // ωᵢ — each agent's natural trust rate
  initialPhases: number[],       // θᵢ — initial trust phase angles
  couplingStrength: number,      // K — delegation coupling
  timeStep: number = 0.01,      // dt
  totalTime: number = 10,       // total simulation time
): { phases: number[][]; orderParameter: number[]; finalSync: number } {
  const n = naturalFrequencies.length;
  let phases = [...initialPhases];
  const history: number[][] = [phases];
  const orderParams: number[] = [];

  for (let t = 0; t < totalTime; t += timeStep) {
    const newPhases = new Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          sum += Math.sin(phases[j] - phases[i]);
        }
      }
      newPhases[i] = phases[i] + timeStep * (naturalFrequencies[i] + (couplingStrength / n) * sum);
    }

    phases = newPhases.map((p) => ((p % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI));
    history.push(phases);

    // Kuramoto order parameter: r = |(1/N) × Σ e^{iθⱼ}|
    let realSum = 0;
    let imagSum = 0;
    for (const phase of phases) {
      realSum += Math.cos(phase);
      imagSum += Math.sin(phase);
    }
    const orderParam = Math.sqrt(realSum * realSum + imagSum * imagSum) / n;
    orderParams.push(orderParam);
  }

  return {
    phases: history,
    orderParameter: orderParams,
    finalSync: orderParams[orderParams.length - 1],
  };
}

/**
 * Kuramoto Critical Coupling — minimum coupling for synchronization.
 *
 * Physics analogy: K_critical = 2 / (π × g(0))
 * where g is the distribution of natural frequencies.
 *
 * AxiomID: Minimum delegation strength needed for trust consensus.
 */
export function kuramotoCriticalCoupling(
  naturalFrequencies: number[],
): number {
  if (naturalFrequencies.length < 2) return 0;

  // Estimate frequency distribution at zero using KDE
  const sorted = [...naturalFrequencies].sort((a, b) => a - b);
  const bandwidth = 0.5 * (sorted[Math.floor(sorted.length * 0.75)] - sorted[Math.floor(sorted.length * 0.25)]);

  if (bandwidth <= 0) return Infinity;

  // g(0) ≈ count of frequencies near 0 / (n × bandwidth)
  const nearZero = naturalFrequencies.filter((f) => Math.abs(f) < bandwidth).length;
  const g0 = nearZero / (naturalFrequencies.length * bandwidth);

  if (g0 <= 0) return Infinity;

  return 2 / (Math.PI * g0);
}
