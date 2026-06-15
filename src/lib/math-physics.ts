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
