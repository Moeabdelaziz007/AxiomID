// ============================================================
// PAI-7-LOOP: Feedback-Driven Self-Improving Router
// Source: Kimi k2.6 gift — NOT mystical, pure control theory.
// tsc: KVNamespace defined locally (workers-types loaded via wrangler build)

// Cloudflare KV binding interface (resolved by wrangler at build/deploy time)
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}
// Engineering: epsilon-greedy bandit + EMA weight updates
// ============================================================

export interface LoopMetrics {
  timestamp: number;
  provider: string;
  model: string;
  latencyMs: number;
  costPer1M: number;
  success: boolean;
  errorType?: string;
  userRating?: number; // 1-5
}

export interface ProviderScore {
  providerId: string;
  totalCalls: number;
  successRate: number;
  avgLatency: number;
  avgCost: number;
  userSatisfaction: number;
  weight: number; // 0-1, used for routing probability
}

// ============================================================
// LOOP 1: OBSERVE — Collect metrics from every inference call
// ============================================================
export class ObserveLoop {
  private metrics: LoopMetrics[] = [];
  private maxHistory = 10000;

  record(metrics: LoopMetrics): void {
    this.metrics.push(metrics);
    if (this.metrics.length > this.maxHistory) {
      this.metrics.shift(); // FIFO
    }
  }

  getRecent(windowMs: number = 3_600_000): LoopMetrics[] {
    const cutoff = Date.now() - windowMs;
    return this.metrics.filter(m => m.timestamp > cutoff);
  }

  getAll(): LoopMetrics[] {
    return [...this.metrics];
  }
}

// ============================================================
// LOOP 2: EVALUATE — Score each provider's performance
// ============================================================
export class EvaluateLoop {
  evaluate(metrics: LoopMetrics[]): Map<string, ProviderScore> {
    const scores = new Map<string, ProviderScore>();
    const grouped = this.groupByProvider(metrics);

    for (const [providerId, calls] of grouped) {
      const successes = calls.filter(c => c.success);
      const successRate = successes.length / calls.length;
      const avgLatency = calls.reduce((s, c) => s + c.latencyMs, 0) / calls.length;
      const avgCost = calls.reduce((s, c) => s + c.costPer1M, 0) / calls.length;
      const ratings = calls.filter(c => c.userRating !== undefined).map(c => c.userRating as number);
      const userSatisfaction = ratings.length > 0
        ? ratings.reduce((s, r) => s + r, 0) / ratings.length
        : 3; // neutral default

      scores.set(providerId, {
        providerId,
        totalCalls: calls.length,
        successRate,
        avgLatency,
        avgCost,
        userSatisfaction,
        weight: this.calculateWeight(successRate, avgLatency, avgCost, userSatisfaction),
      });
    }

    return scores;
  }

  private groupByProvider(metrics: LoopMetrics[]): Map<string, LoopMetrics[]> {
    const grouped = new Map<string, LoopMetrics[]>();
    for (const m of metrics) {
      const key = `${m.provider}:${m.model}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(m);
    }
    return grouped;
  }

  private calculateWeight(
    successRate: number,
    latency: number,
    cost: number,
    satisfaction: number,
  ): number {
    // Multi-objective scoring — normalize each to 0-1
    const successScore = successRate;                            // already 0-1
    const latencyScore = Math.max(0, 1 - latency / 2000);       // 2 000 ms = score 0
    const costScore = Math.max(0, 1 - cost / 10);               // $10/1M tokens = score 0
    const satisfactionScore = satisfaction / 5;                  // 1-5 → 0-1

    return (
      successScore    * 0.4 +
      latencyScore    * 0.2 +
      costScore       * 0.2 +
      satisfactionScore * 0.2
    );
  }
}

// ============================================================
// LOOP 3: ADJUST — Update provider weights via EMA
// ============================================================
export class AdjustLoop {
  adjustWeights(
    currentWeights: Map<string, number>,
    scores: Map<string, ProviderScore>,
    learningRate = 0.1,
  ): Map<string, number> {
    const newWeights = new Map(currentWeights);

    for (const [providerId, score] of scores) {
      const current = currentWeights.get(providerId) ?? 0.5;
      const target = score.weight;
      // EMA: w_new = w_old + α * (target - w_old)
      const updated = current + learningRate * (target - current);
      newWeights.set(providerId, Math.max(0.1, Math.min(1.0, updated)));
    }

    return newWeights;
  }
}

// ============================================================
// LOOP 4: TEST — A/B test new weights (10 % traffic split)
// ============================================================
export class TestLoop {
  private testBucketSize = 0.1;

  shouldUseNewWeights(): boolean {
    return Math.random() < this.testBucketSize;
  }

  compareResults(
    controlMetrics: LoopMetrics[],
    testMetrics: LoopMetrics[],
  ): { winner: 'control' | 'test' | 'tie'; confidence: number } {
    if (controlMetrics.length === 0 || testMetrics.length === 0) {
      return { winner: 'tie', confidence: 0 };
    }

    const controlSuccess = controlMetrics.filter(m => m.success).length / controlMetrics.length;
    const testSuccess    = testMetrics.filter(m => m.success).length    / testMetrics.length;
    const controlLatency = controlMetrics.reduce((s, m) => s + m.latencyMs, 0) / controlMetrics.length;
    const testLatency    = testMetrics.reduce((s, m) => s + m.latencyMs, 0)    / testMetrics.length;

    const controlScore = controlSuccess * 1000 - controlLatency;
    const testScore    = testSuccess    * 1000 - testLatency;
    const diff         = Math.abs(controlScore - testScore);
    const confidence   = Math.min(1, diff / 100);

    if (diff < 10) return { winner: 'tie', confidence };
    return { winner: testScore > controlScore ? 'test' : 'control', confidence };
  }
}

// ============================================================
// LOOP 5: DEPLOY — Persist weights to Cloudflare KV
// ============================================================
export class DeployLoop {
  async deployWeights(
    weights: Map<string, number>,
    kv: KVNamespace,
  ): Promise<boolean> {
    try {
      await kv.put('provider_weights', JSON.stringify(Array.from(weights.entries())));
      return true;
    } catch (e) {
      console.error('[DeployLoop] KV write failed:', e);
      return false;
    }
  }

  async loadWeights(kv: KVNamespace): Promise<Map<string, number>> {
    const raw = await kv.get('provider_weights');
    if (!raw) return new Map();
    try {
      return new Map(JSON.parse(raw) as [string, number][]);
    } catch {
      return new Map();
    }
  }
}

// ============================================================
// LOOP 6: MEASURE — Compare before/after impact
// ============================================================
export class MeasureLoop {
  measureImpact(
    beforeMetrics: LoopMetrics[],
    afterMetrics: LoopMetrics[],
  ): { latencyImprovement: number; costImprovement: number; successRateImprovement: number } {
    if (beforeMetrics.length === 0 || afterMetrics.length === 0) {
      return { latencyImprovement: 0, costImprovement: 0, successRateImprovement: 0 };
    }

    const beforeSuccess = this.successRate(beforeMetrics);
    const afterSuccess  = this.successRate(afterMetrics);
    const beforeLatency = this.avg(beforeMetrics, m => m.latencyMs);
    const afterLatency  = this.avg(afterMetrics,  m => m.latencyMs);
    const beforeCost    = this.avg(beforeMetrics, m => m.costPer1M);
    const afterCost     = this.avg(afterMetrics,  m => m.costPer1M);

    return {
      latencyImprovement:    beforeLatency > 0 ? (beforeLatency - afterLatency) / beforeLatency : 0,
      costImprovement:       beforeCost    > 0 ? (beforeCost    - afterCost)    / beforeCost    : 0,
      successRateImprovement: afterSuccess - beforeSuccess,
    };
  }

  private successRate(m: LoopMetrics[]): number {
    return m.filter(x => x.success).length / m.length;
  }

  private avg(m: LoopMetrics[], fn: (x: LoopMetrics) => number): number {
    return m.reduce((s, x) => s + fn(x), 0) / m.length;
  }
}

// ============================================================
// LOOP 7: LEARN — Epsilon-greedy multi-armed bandit
// ============================================================
export class LearnLoop {
  private epsilon = 0.1; // 10 % explore, 90 % exploit

  selectProvider(providers: string[], weights: Map<string, number>): string {
    if (providers.length === 0) throw new Error('No providers available');

    // EXPLORE
    if (Math.random() < this.epsilon) {
      return providers[Math.floor(Math.random() * providers.length)];
    }

    // EXPLOIT — highest weight
    let best = providers[0];
    let bestW = weights.get(best) ?? 0;
    for (const p of providers) {
      const w = weights.get(p) ?? 0;
      if (w > bestW) { bestW = w; best = p; }
    }
    return best;
  }

  /** Call after each full loop to tighten exploitation over time */
  decayEpsilon(factor = 0.99): void {
    this.epsilon = Math.max(0.01, this.epsilon * factor); // floor at 1 %
  }

  getEpsilon(): number { return this.epsilon; }
}

// ============================================================
// Cloudflare Worker env bindings type
// ============================================================
export interface Env {
  ROUTER_WEIGHTS: KVNamespace;
}

// ============================================================
// THE 7-LOOP ORCHESTRATOR — Cloudflare Worker entry point
// ============================================================
export class SevenLoopRouter {
  private observe    = new ObserveLoop();
  private evaluate   = new EvaluateLoop();
  private adjust     = new AdjustLoop();
  private test       = new TestLoop();
  private deploy     = new DeployLoop();
  private measure    = new MeasureLoop();
  private learn      = new LearnLoop();

  private weights    = new Map<string, number>();
  private snapshotBefore: LoopMetrics[] = [];

  readonly PROVIDERS = ['deepseek', 'openrouter', 'together', 'cloudflare'] as const;

  readonly MODEL_MAP: Record<string, string> = {
    deepseek:   'deepseek-chat',
    openrouter: 'openai/gpt-4o',
    together:   'meta-llama/Llama-3.1-70B-Instruct-Turbo',
    cloudflare: '@cf/meta/llama-3.1-8b-instruct',
  };

  readonly LATENCY_MAP: Record<string, number> = {
    deepseek:   450, // 450ms real DeepSeek API P50 latency (200-900ms range)
    openrouter: 820, // 820ms OpenAI/OpenRouter P50
    together:   610, // 610ms Together AI Llama 70B
    cloudflare: 180, // 180ms Workers AI Llama 8B
  };

  readonly COST_MAP: Record<string, number> = {
    deepseek:   0.14, // $0.14/1M tokens
    openrouter: 2.50, // $2.50/1M tokens
    together:   0.88, // $0.88/1M tokens
    cloudflare: 0.00, // $0.00/1M (free tier)
  };

  async init(env: Env): Promise<void> {
    this.weights = await this.deploy.loadWeights(env.ROUTER_WEIGHTS);
    // Seed equal weights for providers not yet seen
    for (const p of this.PROVIDERS) {
      if (!this.weights.has(p)) this.weights.set(p, 0.5);
    }
  }

  route(prompt?: string): {
    provider: string;
    model: string;
    isExploration: boolean;
    estimatedLatencyMs: number;
    estimatedCostPer1M: number;
    language: string;
  } {
    let language = 'en';
    if (prompt) {
      if (/[\u0600-\u06FF]/.test(prompt)) language = 'ar';
      else if (/[\u4E00-\u9FFF]/.test(prompt)) language = 'zh';
    }

    const explorationEpsilon = this.learn.getEpsilon();
    const isExploration = Math.random() < explorationEpsilon;

    // For Chinese prompts, favor DeepSeek (cn region)
    let selected: string;
    if (language === 'zh' && !isExploration) {
      selected = 'deepseek';
    } else {
      selected = this.learn.selectProvider([...this.PROVIDERS], this.weights);
    }

    return {
      provider:           selected,
      model:              this.MODEL_MAP[selected] ?? 'unknown',
      isExploration,
      estimatedLatencyMs:  this.LATENCY_MAP[selected] ?? 500,
      estimatedCostPer1M:  this.COST_MAP[selected] ?? 0.5,
      language,
    };
  }

  async recordFeedback(metrics: LoopMetrics, env: Env): Promise<void> {
    // LOOP 1: OBSERVE
    this.observe.record(metrics);

    // LOOP 2: EVALUATE & LOOP 3: ADJUST (immediate weight update on feedback)
    const recent = this.observe.getRecent(3_600_000);
    const scores = this.evaluate.evaluate(recent);
    this.weights = this.adjust.adjustWeights(this.weights, scores);

    // LOOP 5: DEPLOY to KV
    if (env.ROUTER_WEIGHTS) {
      await this.deploy.deployWeights(this.weights, env.ROUTER_WEIGHTS);
    }
  }

  private async runFullCycle(env: Env): Promise<void> {
    const recent = this.observe.getRecent(3_600_000);

    // LOOP 2: EVALUATE
    const scores = this.evaluate.evaluate(recent);

    // LOOP 3: ADJUST
    const newWeights = this.adjust.adjustWeights(this.weights, scores);

    // LOOP 4: TEST — if in test window, keep snapshot before committing
    const useNew = this.test.shouldUseNewWeights();

    // LOOP 5: DEPLOY
    const ok = await this.deploy.deployWeights(useNew ? newWeights : this.weights, env.ROUTER_WEIGHTS);
    if (ok && useNew) {
      // LOOP 6: MEASURE impact of last change
      const impact = this.measure.measureImpact(this.snapshotBefore, recent);
      console.log('[MeasureLoop] impact:', impact);
      this.snapshotBefore = [...recent];
      this.weights = newWeights;
    }

    // LOOP 7: LEARN — tighten epsilon over time
    this.learn.decayEpsilon();
    console.log('[LearnLoop] epsilon:', this.learn.getEpsilon().toFixed(4));
  }
}

// ============================================================
// Cloudflare Worker fetch handler
// ============================================================
const router = new SevenLoopRouter();
let initialized = false;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!initialized) {
      await router.init(env);
      initialized = true;
    }

    const url = new URL(request.url);

    // POST /route — select a provider
    if (request.method === 'POST' && url.pathname === '/route') {
      const body = await request.json() as { prompt?: string };
      if (!body?.prompt) {
        return Response.json({ error: 'Missing prompt' }, { status: 400 });
      }

      const selection = router.route(body.prompt);
      return Response.json({
        ok:                 true,
        provider:           selection.provider,
        model:              selection.model,
        isExploration:      selection.isExploration,
        estimatedLatencyMs: selection.estimatedLatencyMs,
        estimatedCostPer1M: selection.estimatedCostPer1M,
        language:           selection.language,
        epsilon:            router['learn'].getEpsilon(),
      });
    }

    // POST /feedback — record real inference result
    if (request.method === 'POST' && url.pathname === '/feedback') {
      const metrics = await request.json() as LoopMetrics;
      const required = ['timestamp', 'provider', 'model', 'latencyMs', 'costPer1M', 'success'];
      for (const field of required) {
        if (!(field in metrics)) {
          return Response.json({ error: `Missing field: ${field}` }, { status: 400 });
        }
      }
      await router.recordFeedback(metrics, env);
      return Response.json({ ok: true, recorded: true });
    }

    // GET /weights — inspect current state
    if (request.method === 'GET' && url.pathname === '/weights') {
      return Response.json({
        weights: Object.fromEntries(router['weights']),
        epsilon: router['learn'].getEpsilon(),
        totalObservations: router['observe'].getAll().length,
      });
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  },
};
