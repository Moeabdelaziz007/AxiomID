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

/**
 * Evaluates a leaky-bucket rate limit check for a request.
 *
 * @param state - The current bucket state.
 * @param config - The bucket capacity and drain settings.
 * @param now - The timestamp used to measure elapsed time.
 * @returns An object containing whether the request is allowed, the updated bucket state, and the wait time in milliseconds before another request can be accepted.
 */
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
 * Applies inverse-square decay to a trust value across hops.
 *
 * @param sourceTrust - The trust value being propagated
 * @param weight - The influence weight applied to the source trust
 * @param hops - The number of hops from the source
 * @param gravitationalConstant - The decay scaling factor
 * @returns The decayed trust value; when `hops` is less than or equal to zero, the result is `sourceTrust * weight`
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
 * Propagates trust across a delegation chain.
 *
 * @param chain - Ordered trust and weight entries, starting with the source trust value
 * @returns The propagated trust score, capped at `1`
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
 * Computes the Boltzmann weight for a trust score.
 *
 * @param trustScore - Trust value used to derive the energy term
 * @param temperature - Temperature controlling the sharpness of the distribution
 * @param boltzmannConstant - Constant used in the exponent calculation
 * @returns The unnormalized Boltzmann weight for the given trust score
 */
export function boltzmannTrustProbability(
  trustScore: number,
  temperature: number = 1.0,
  boltzmannConstant: number = 1.0,
): number {
  // Temperature and the Boltzmann constant must be positive for the
  // distribution to be well-defined; otherwise the exponent is invalid.
  if (temperature <= 0 || boltzmannConstant <= 0) {
    throw new Error("temperature and boltzmannConstant must be positive");
  }

  // Energy is inverse of trust (0 trust = max energy)
  const energy = 1 - trustScore;

  // P(trusted) = e^(-E/kT)
  const exponent = -energy / (boltzmannConstant * temperature);
  return Math.exp(exponent);
}

/**
 * Converts trust scores into a normalized Boltzmann probability distribution.
 *
 * @param scores - The trust scores to normalize
 * @param temperature - The temperature controlling how sharply probabilities are concentrated
 * @returns An array of probabilities that sums to 1
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
 * Calculates a retry delay that grows exponentially with random jitter.
 *
 * @param attempt - The retry attempt number
 * @param baseDelayMs - The starting delay in milliseconds
 * @param maxDelayMs - The maximum delay in milliseconds
 * @param jitterFactor - The fraction of the delay used to randomize the result
 * @returns The computed delay in milliseconds
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
 * Computes a retry delay that increases by powers of the golden ratio.
 *
 * @param attempt - The retry attempt index
 * @param baseDelayMs - The starting delay in milliseconds
 * @param maxDelayMs - The maximum delay in milliseconds
 * @returns The delay in milliseconds, clamped to the range from `0` to `maxDelayMs`.
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
 * Measures the cosine similarity of two vectors.
 *
 * @param a - The first vector
 * @param b - The second vector
 * @returns The cosine similarity score, or `0` if either vector has zero magnitude
 * @throws Error if the vectors have different lengths
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
 * Computes the Euclidean distance between two vectors.
 *
 * @param a - The first vector
 * @param b - The second vector
 * @returns The straight-line distance between `a` and `b`
 * @throws {Error} If the vectors have different lengths
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
 * Calculates the Shannon entropy of a string.
 *
 * @param data - The input string
 * @returns The entropy of `data` in bits
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
 * Scores how fresh a piece of data is based on its age and entropy bonus.
 *
 * @param createdAt - Creation timestamp in milliseconds
 * @param now - Current timestamp in milliseconds
 * @param decayConstant - Exponential decay rate applied to the age
 * @param entropyBonus - Additional score contribution from entropy
 * @returns The freshness score, capped at `1`
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
 * Generates a random step for a score and clamps it to the given bounds.
 *
 * @param currentScore - The starting score
 * @param stepSize - The scale of the random change
 * @param bounds - The inclusive lower and upper limits for the result
 * @returns The adjusted score within `bounds`
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
 * Finds the highest-scoring value by evaluating random Brownian steps.
 *
 * @param initialScore - The starting score
 * @param objective - The function used to score each candidate value
 * @param iterations - The number of candidate steps to evaluate
 * @param stepSize - The magnitude of each random step
 * @returns The best score found, its objective value, and the full score history
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
 * Calculates the displacement of a damped harmonic oscillator at a given time.
 *
 * @returns The oscillator displacement at `time`.
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
 * Computes the damped equilibrium position between two scores.
 *
 * @param initialScore - The starting score
 * @param targetScore - The equilibrium score
 * @param damping - The decay rate applied to the deviation
 * @param time - The elapsed time
 * @returns The score after the deviation decays toward `targetScore`
 */
export function equilibriumPosition(
  initialScore: number,
  targetScore: number,
  damping: number,
  time: number,
): number {
  // Deviation decays exponentially (higher damping → faster convergence to target)
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
 * Creates a Monte Carlo tree search node.
 *
 * @param id - Node identifier
 * @param state - Initial state stored in the node
 * @param parent - Parent node in the search tree
 * @param action - Action that led to this node
 * @returns A node with zero visits, zero wins, no children, and the provided linkage
 */
export function createMCTSNode(
  id: string,
  state: Record<string, unknown> = {},
  parent: MCTSNode | null = null,
  action?: string,
): MCTSNode {
  return { id, state, visits: 0, wins: 0, children: [], parent, action };
}

/**
 * Computes the UCB1 score for a Monte Carlo tree search node.
 *
 * @param node - The node to score
 * @param explorationConstant - The exploration weight applied to the uncertainty term
 * @returns `Infinity` if the node has not been visited, otherwise the UCB1 score
 */
export function ucb1(node: MCTSNode, explorationConstant: number = 1.414): number {
  if (node.visits === 0) return Infinity; // Unvisited nodes get priority
  return (node.wins / node.visits) + explorationConstant * Math.sqrt(
    Math.log(node.parent?.visits || 1) / node.visits
  );
}

/**
 * Selects the most promising node in an MCTS tree.
 *
 * @param root - The starting node for selection
 * @returns The leaf node reached by repeatedly choosing the child with the highest UCB1 score
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
 * Expands a node with one child per possible action.
 *
 * @param node - The node to expand
 * @param possibleActions - The actions used to create child nodes
 * @returns The first created child, or `node` when no actions are provided
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
 * Estimates a rollout reward for a node by sampling simulated states.
 *
 * @param node - The node whose state initializes the rollout.
 * @param simulateFn - Evaluates a rollout state and returns its reward.
 * @param maxSteps - The number of rollout samples to average.
 * @returns The average reward from the simulated rollouts.
 */
export function mctsSimulate(
  node: MCTSNode,
  simulateFn: (state: Record<string, unknown>) => number,
  maxSteps: number = 100,
): number {
  if (maxSteps <= 0) return 0;
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
 * Propagates a reward through a node and all of its ancestors.
 *
 * @param node - The node where backpropagation starts
 * @param reward - The reward added to each visited node
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
 * Performs one Monte Carlo Tree Search iteration on the root node.
 *
 * @param root - The tree root to update
 * @param possibleActions - Actions used to expand the selected node
 * @param simulateFn - Evaluates a simulated state and produces a reward
 * @returns The updated root node
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
 * Selects the most visited action from the root after repeated MCTS iterations.
 *
 * @param root - The search tree root
 * @param iterations - The number of MCTS iterations to run
 * @param possibleActions - The actions used to expand the tree
 * @param simulateFn - Computes the reward for a simulated state
 * @returns The action associated with the most visited child, or `null` if the root has no children
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
 * Computes the number of edges incident to a node.
 *
 * @param nodeId - The node to measure
 * @returns The count of edges connected to `nodeId`
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
 * Computes the clustering coefficient for a node.
 *
 * @param edges - Graph edges used to identify the node's neighbors
 * @param nodeId - The node whose local clustering is measured
 * @returns The ratio of existing connections among the node's neighbors to the number of possible connections
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
 * Computes betweenness centrality scores for a graph's nodes.
 *
 * @param nodes - Node IDs to include in the result
 * @param edges - Graph edges treated as undirected for shortest-path traversal
 * @returns A map from node ID to its betweenness centrality score
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
 * Groups nodes by propagating the most common neighboring label.
 *
 * @param nodes - The node identifiers to label
 * @param edges - The graph edges used to determine neighbors
 * @param maxIterations - The maximum number of propagation rounds to run
 * @returns A map from node id to assigned community label
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
 * Simulates trust scores with Gaussian noise and summarizes the results.
 *
 * @param baseScore - The starting trust score
 * @param uncertainty - The standard deviation of the perturbation
 * @param simulations - The number of samples to generate
 * @returns The sample mean, population standard deviation, 95% confidence interval, and sampled scores
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
 * Simulates trust updates across a network of connected agents.
 *
 * @param agents - Agents with their initial trust values and connected agent ids
 * @param iterations - Number of update rounds to run
 * @param decayFactor - Weight applied to each agent's current trust during updates
 * @returns A map from agent id to its trust values over time, including the initial value
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
 * Estimates a statistic and a bootstrap confidence interval.
 *
 * @param data - The input sample
 * @param statisticFn - Computes the statistic for a sample
 * @param iterations - The number of bootstrap resamples
 * @param confidenceLevel - The confidence level between 0 and 1
 * @returns The estimated statistic and confidence interval bounds
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
 * Performs a random walk over a trust graph.
 *
 * @param graph - Adjacency list of outgoing neighbors for each node
 * @param startNode - Node where the walk begins
 * @param steps - Maximum number of steps to take
 * @returns The per-node visit counts and normalized visit frequencies
 */
export function randomWalkTrust(
  graph: Map<string, string[]>,
  startNode: string,
  steps: number = 100,
): { visitCounts: Map<string, number>; stationaryDistribution: Map<string, number> } {
  const visitCounts = new Map<string, number>();
  let current = startNode;
  let totalVisits = 0;

  for (let i = 0; i < steps; i++) {
    visitCounts.set(current, (visitCounts.get(current) || 0) + 1);
    totalVisits++;
    const neighbors = graph.get(current) || [];
    if (neighbors.length === 0) break;
    current = neighbors[Math.floor(Math.random() * neighbors.length)];
  }

  // Stationary distribution = visit frequency. Normalize by the number of
  // visits actually taken so the distribution always sums to 1, even when
  // the walk hits a dead-end before completing all steps.
  const stationaryDistribution = new Map<string, number>();
  // Stationary distribution = visit frequency
  const stationaryDistribution = new Map<string, number>();
  const totalVisits = Array.from(visitCounts.values()).reduce((sum, count) => sum + count, 0);
  for (const [node, count] of visitCounts) {
    stationaryDistribution.set(node, totalVisits > 0 ? count / totalVisits : 0);
  }

  return { visitCounts, stationaryDistribution };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PILLAR 1 — IDEAL GAS LAW, CARNOT, FICK, FOURIER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculates pressure from active requests, capacity, and temperature.
 *
 * @param activeRequests - The number of active requests
 * @param capacity - The available bucket capacity
 * @param temperature - The system load factor
 * @param gasConstant - The scaling constant used in the calculation
 * @returns The computed pressure, or `Infinity` when `capacity` is less than or equal to zero
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
 * Calculates trust efficiency from signal strength and noise level.
 *
 * @param signalStrength - The reference signal strength
 * @param noiseLevel - The noise level relative to `signalStrength`
 * @returns `0` when `signalStrength` is less than or equal to `0`; otherwise, the efficiency value clamped to the range from `0` to `1`
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
 * Computes the trust flux between two nodes.
 *
 * @param sourceTrust - Trust level at the source node
 * @param targetTrust - Trust level at the target node
 * @param diffusivity - Rate at which trust spreads between nodes
 * @param distance - Distance between the two nodes
 * @returns The signed trust flux from source to target
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
 * Evolves a node's trust toward the average trust of its neighbors.
 *
 * @param trustAtNode - The node's current trust value
 * @param trustNeighbors - Trust values from neighboring nodes
 * @param timeStep - The update step size
 * @param diffusivity - The strength of neighbor influence
 * @returns The updated trust value, clamped to the range from 0 to 1
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
 * Updates a node's trust using the average trust of its neighbors.
 *
 * @param thermalDiffusivity - The strength of the adjustment toward neighboring trust
 * @param timeStep - The size of the simulation step
 * @returns The updated trust value, clamped between `0` and `1`
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
 * Measures how far a trust distribution is from equilibrium.
 *
 * @param trustDistribution - Trust values to evaluate
 * @returns The population standard deviation of `trustDistribution`
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
 * Computes the minimum synchronization rate required for a given trust change rate.
 *
 * @param maxTrustChangeRate - Maximum trust changes per second
 * @returns Twice `maxTrustChangeRate`
 */
export function nyquistMinSyncRate(
  maxTrustChangeRate: number, // Hz — maximum trust changes per second
): number {
  return 2 * maxTrustChangeRate;
}

/**
 * Computes the Shannon-Hartley channel capacity.
 *
 * @param bandwidth - The channel bandwidth
 * @param signalPower - The signal power
 * @param noisePower - The noise power
 * @returns The maximum achievable capacity, `Infinity` when `noisePower` is less than or equal to `0`, or `0` when the signal-to-noise ratio is less than or equal to `0`
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

/**
 * Builds a Huffman tree from symbol frequencies.
 *
 * @param symbols - Map of symbols to their frequencies
 * @returns The root node of the Huffman tree
 */
export function buildHuffmanTree(symbols: Map<string, number>): HuffmanNode {
  if (symbols.size === 0) {
    throw new Error("Cannot build a Huffman tree from an empty symbol set");
  }

  const nodes: HuffmanNode[] = Array.from(symbols.entries()).map(([symbol, frequency]) => ({
    symbol,
    frequency,
    left: null,
    right: null,
    code: "",
  }));

  // A single-symbol alphabet needs a parent so the symbol gets a 1-bit code
  // ("0") instead of an empty (lossy) code.
  if (nodes.length === 1) {
    const only = nodes[0];
    return {
      symbol: null,
      frequency: only.frequency,
      left: only,
      right: null,
      code: "",
    };
  }

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

/**
 * Builds Huffman codes from a tree.
 *
 * @param node - The Huffman tree node to traverse
 * @param prefix - The code prefix for the current branch
 * @param codes - The map used to collect symbol codes
 * @returns The map of symbols to Huffman codes
 */
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

/**
 * Encodes symbols with a Huffman code derived from symbol frequencies.
 *
 * @param data - Symbols to encode
 * @param symbolFrequencies - Symbol frequency map used to build the Huffman tree
 * @returns The generated Huffman codes, encoded bit string, and encoded-to-original bit ratio
 */
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
 * Computes the mutual information between two discrete distributions.
 *
 * @param jointDistribution - Joint probability matrix for the two variables
 * @returns The mutual information in bits
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
  if (total === 0) return 0;
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
 * Computes the ratio of signal power to noise power.
 *
 * @param signalPower - The signal power
 * @param noisePower - The noise power
 * @returns The signal-to-noise ratio, or `Infinity` if `noisePower` is less than or equal to zero
 */
export function trustSignalToNoise(
  signalPower: number,
  noisePower: number,
): number {
  if (noisePower <= 0) return Infinity;
  return signalPower / noisePower;
}

/**
 * Computes the Kullback-Leibler divergence between two distributions.
 *
 * @param p - The reference distribution
 * @param q - The comparison distribution
 * @returns The divergence from `p` to `q`
 * @throws Error if the distributions have different lengths
 */
export function klDivergence(
  p: number[],
  q: number[],
): number {
  if (p.length !== q.length) throw new Error("Distributions must have same length");

  let dkl = 0;
  for (let i = 0; i < p.length; i++) {
    if (p[i] > 0 && q[i] === 0) return Infinity;
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
 * Computes PageRank-style trust scores for a directed network.
 *
 * @param nodes - The node identifiers to rank.
 * @param edges - The directed links between nodes.
 * @param dampingFactor - The share of rank retained from linked nodes on each iteration.
 * @param iterations - The number of rank-update passes to perform.
 * @returns A map from node identifier to its trust score.
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
 * Builds the weighted graph Laplacian matrix for the given nodes and edges.
 *
 * @param nodes - Node IDs in the order used for the matrix
 * @param edges - Weighted edges to include in the Laplacian
 * @returns The dense Laplacian matrix in node order
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
 * Approximates the dominant eigenvector of a square matrix.
 *
 * @param matrix - The matrix to analyze
 * @param iterations - The number of refinement steps to perform
 * @returns The normalized eigenvector estimate
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
 * Splits the graph's nodes into two communities using the dominant Laplacian
 * eigenvector as a partition heuristic.
 *
 * NOTE: This uses `powerIteration`, which yields the dominant (largest)
 * eigenvector of the Laplacian — NOT the true Fiedler vector (the eigenvector
 * of the second-smallest eigenvalue). It is a coarse spectral heuristic, not a
 * spectral bisection. Renamed from `fiedlerPartition` to avoid implying the
 * latter.
 *
 * @returns An object containing the nodes assigned to `communityA` and `communityB`.
 */
export function spectralPartition(
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
 * Identifies agents with no profitable unilateral deviation.
 *
 * @param agents - Agents to evaluate
 * @returns The IDs of agents whose alternative trust options all have non-positive profit
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
 * Selects the highest-payoff strategy for each agent.
 *
 * @param agents - Agents with their available strategies
 * @returns A map from agent ID to the label of its best strategy
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
 * Computes the maximum flow and corresponding minimum cut between two nodes in a trust network.
 *
 * @param edges - Directed weighted edges in the network
 * @param source - Node where flow starts
 * @param sink - Node where flow ends
 * @returns The maximum flow, the edges crossing the minimum cut, and the nodes incident to those edges
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

  /**
   * Finds an augmenting path in the residual graph.
   *
   * @param s - The source node
   * @param t - The sink node
   * @param parent - Records the predecessor of each visited node in the найден path
   * @returns `true` if a path to `t` is found, `false` otherwise
   */
  function bfs(s: string, t: string, parent: Map<string, string | null>): boolean {
    const visited = new Set<string>();
    const queue: string[] = [s];
    visited.add(s);
    const EPSILON = 1e-9;

    while (queue.length > 0) {
      const u = queue.shift()!;
      const neighbors = graph.get(u);

      if (!neighbors) continue;
      for (const [v, capacity] of neighbors) {
        if (!visited.has(v) && capacity > EPSILON) {
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
 * Advances trust using a Langevin-style dynamics model.
 *
 * @param currentTrust - The current trust value
 * @param externalForce - The applied external influence
 * @param damping - The resistance to change
 * @param noiseStrength - The magnitude of random fluctuation
 * @param mass - The inertia term
 * @param timeStep - The integration step size
 * @returns The updated trust value and instantaneous velocity
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
 * Simulates trust evolution with a decaying external force.
 *
 * @param initialTrust - Starting trust value
 * @param externalForce - Initial driving force applied at each step
 * @returns The trust history and the final trust value
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
 * Evolves a trust distribution over a discretized grid by one Fokker-Planck time step.
 *
 * @param trustGrid - Discretized trust values
 * @param probabilities - Probability density at each trust value
 * @param drift - Systematic drift applied across the grid
 * @param diffusion - Diffusion strength applied across the grid
 * @param timeStep - Time increment used for the update
 * @returns The updated probability density, normalized when possible
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

  // Guard against mismatched inputs and degenerate grids that would otherwise
  // produce NaN/Infinity values.
  if (probabilities.length !== n) {
    throw new Error("probabilities and trustGrid must have the same length");
  }
  const dx = trustGrid[1] - trustGrid[0];
  if (dx === 0) {
    throw new Error("trustGrid must have a non-zero spacing");
  }

  const newProbabilities = new Array(n).fill(0);

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
    newProbabilities[i] = Math.max(0, newProbabilities[i]);
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
 * Computes the Ising Hamiltonian for a spin configuration.
 *
 * @param spins - Spin values for each node
 * @param coupling - Interaction strength between connected spins
 * @param externalField - External field strength
 * @param adjacencyMatrix - Connectivity matrix for the system
 * @returns The total Hamiltonian value
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
 * Computes the average spin value for an Ising state.
 *
 * @param spins - Spin values for the current state
 * @returns The mean of `spins`, or `0` when `spins` is empty
 */
export function isingMagnetization(spins: number[]): number {
  if (spins.length === 0) return 0;
  return spins.reduce((a, b) => a + b, 0) / spins.length;
}

/**
 * Performs one Metropolis update of an Ising spin configuration.
 *
 * @param spins - Current spin state
 * @param coupling - Interaction strength between adjacent spins
 * @param externalField - External field applied to the selected spin
 * @param adjacencyMatrix - Adjacency matrix describing spin couplings
 * @param temperature - Sampling temperature that controls flip acceptance
 * @returns A new spin array with one accepted flip, or the original array if the flip is rejected
 */
export function isingMetropolisStep(
  spins: number[],
  coupling: number,
  externalField: number,
  adjacencyMatrix: boolean[][],
  temperature: number,
): number[] {
  const n = spins.length;
  if (n === 0) return spins;
  const i = Math.floor(Math.random() * n);

  // Local energy change: dH = 2 * s_i * (J * Σ s_j + h)
  // O(N) instead of O(N²) by computing only local interactions
  let neighborSum = 0;
  for (let j = 0; j < n; j++) {
    if (adjacencyMatrix[i][j]) {
      neighborSum += spins[j];
    }
  }
  const deltaH = 2 * spins[i] * (coupling * neighborSum + externalField);

  // Metropolis acceptance
  if (deltaH < 0 || Math.random() < Math.exp(-deltaH / temperature)) {
    const newSpins = [...spins];
    newSpins[i] *= -1;
    return newSpins; // Accept flip
  }

  return spins; // Reject flip
}

/**
 * Simulates a fully connected Ising system and records magnetization over time.
 *
 * @param n - The number of spins
 * @param coupling - The interaction strength between spins
 * @param externalField - The external field applied to each spin
 * @param temperature - The simulation temperature
 * @param steps - The number of Metropolis updates to run
 * @returns The final spin configuration, magnetization history, and last magnetization value
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
 * Simulates Kuramoto phase synchronization over time.
 *
 * @param naturalFrequencies - Natural angular frequencies for each oscillator
 * @param initialPhases - Initial phase angles for each oscillator
 * @param couplingStrength - Coupling strength between oscillators
 * @param timeStep - Time increment used for each update
 * @param totalTime - Total duration of the simulation
 * @returns The phase history, synchronization order parameter history, and final synchronization value
 */
export function kuramotoTrustSync(
  naturalFrequencies: number[],  // ωᵢ — each agent's natural trust rate
  initialPhases: number[],       // θᵢ — initial trust phase angles
  couplingStrength: number,      // K — delegation coupling
  timeStep: number = 0.01,      // dt
  totalTime: number = 10,       // total simulation time
): { phases: number[][]; orderParameter: number[]; finalSync: number } {
  const n = naturalFrequencies.length;
  if (initialPhases.length !== n) {
    throw new Error("naturalFrequencies and initialPhases must have the same length");
  }
  if (timeStep <= 0) {
    throw new Error("timeStep must be positive");
  }

  let phases = [...initialPhases];
  const history: number[][] = [phases];
  const orderParams: number[] = [];

  // Seed an initial order parameter so finalSync is well-defined even when
  // totalTime <= 0 results in zero iterations.
  {
    let realSum = 0;
    let imagSum = 0;
    for (const phase of phases) {
      realSum += Math.cos(phase);
      imagSum += Math.sin(phase);
    }
    orderParams.push(n > 0 ? Math.sqrt(realSum * realSum + imagSum * imagSum) / n : 0);
  }

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
 * Estimates the coupling threshold for phase synchronization.
 *
 * @param naturalFrequencies - Oscillator frequencies used to estimate the frequency density near zero
 * @returns The estimated critical coupling strength
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
