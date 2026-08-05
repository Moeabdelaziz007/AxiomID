/// <reference types="@cloudflare/workers-types" />
/**
 * PAI SIM-LOOP — Simulation Loop on Cloudflare Free Tier
 *
 * Durable Object (state) + Workers AI (reflection) + Queues (async) + Cron (schedule)
 * Runs AlphaPi-style loops: OBSERVE → REFLECT → EXECUTE → EVALUATE → RECORD → REPEAT
 *
 * Free tier: 10K Neurons/day AI, 10 min/day Browser Run, 5 Cron Triggers, Durable Objects free
 */

export interface Env {
  AI: Ai;
  SIM_QUEUE: Queue<QueueMessage>;
  DB: D1Database;
  SIMULATION_DO: DurableObjectNamespace;
  BROWSER?: Fetcher;
}

interface QueueMessage {
  iteration: number;
  simulationId: string;
  action?: string;
  result?: unknown;
  reward?: number;
}

interface SimulationState {
  id: string;
  goal: string;
  iteration: number;
  currentState: string;
  history: Array<{ action: string; result: string; reward: number }>;
  totalReward: number;
  status: "running" | "completed" | "failed";
}

// ─── Durable Object: Simulation State Manager ─────────────────────────

export class SimulationDO implements DurableObject {
  state: DurableObjectState;
  env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === "/start" && req.method === "POST") {
      const { goal } = await req.json<{ goal: string }>();
      const id = crypto.randomUUID();
      const sim: SimulationState = {
        id,
        goal,
        iteration: 0,
        currentState: "initial",
        history: [],
        totalReward: 0,
        status: "running",
      };
      await this.state.storage.put("simulation", sim);
      // Kick off first iteration via queue
      await this.env.SIM_QUEUE.send({ iteration: 1, simulationId: id });
      return json({ simulationId: id, status: "started" }, 201);
    }

    if (path === "/state") {
      const sim = await this.state.storage.get<SimulationState>("simulation");
      return json(sim || { error: "No simulation found" });
    }

    if (path === "/stop" && req.method === "POST") {
      const sim = await this.state.storage.get<SimulationState>("simulation");
      if (sim) {
        sim.status = "completed";
        await this.state.storage.put("simulation", sim);
      }
      return json({ status: "stopped" });
    }

    return json({ error: "Not found" }, 404);
  }

  /** Called by queue consumer after each iteration */
  async updateState(message: QueueMessage): Promise<void> {
    const sim = await this.state.storage.get<SimulationState>("simulation");
    if (!sim || sim.status !== "running") return;

    sim.iteration = message.iteration;
    if (message.action && message.result !== undefined) {
      sim.history.push({
        action: message.action,
        result: JSON.stringify(message.result).slice(0, 500),
        reward: message.reward || 0,
      });
      sim.totalReward += message.reward || 0;
    }
    await this.state.storage.put("simulation", sim);
  }
}

// ─── Worker: Loop Orchestrator + Queue Consumer ───────────────────────

export default {
  /** Cron Trigger fires every 12 hours → starts new simulation cycle */
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(env.SIM_QUEUE.send({ iteration: 1, simulationId: "cron-cycle" }));
  },

  /** HTTP entrypoint — create simulation via DO */
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/api/sim/start" && req.method === "POST") {
      const { goal } = await req.json<{ goal: string }>();
      const doId = env.SIMULATION_DO.idFromName("default");
      const doStub = env.SIMULATION_DO.get(doId);
      return doStub.fetch(new Request("https://sim/do/start", {
        method: "POST",
        body: JSON.stringify({ goal }),
      }));
    }

    if (url.pathname === "/api/sim/state") {
      const doId = env.SIMULATION_DO.idFromName("default");
      const doStub = env.SIMULATION_DO.get(doId);
      return doStub.fetch(new Request("https://sim/do/state"));
    }

    return json({ error: "Not found" }, 404);
  },

  /** Queue consumer — runs one loop iteration */
  async queue(
    batch: MessageBatch<QueueMessage>,
    env: Env,
  ): Promise<void> {
    for (const msg of batch.messages) {
      await runIteration(msg.body, env, msg);
    }
  },
} satisfies ExportedHandler<Env, QueueMessage>;

// ─── Loop Iteration: OBSERVE → REFLECT → EXECUTE → EVALUATE → RECORD ──

async function runIteration(
  msg: QueueMessage,
  env: Env,
  queueMsg: Message<QueueMessage>,
): Promise<void> {
  const { iteration, simulationId } = msg;

  // Step 1: OBSERVE — read current state from DO
  const doId = env.SIMULATION_DO.idFromName("default");
  const doStub = env.SIMULATION_DO.get(doId);
  const stateResp = await doStub.fetch(new Request("https://sim/do/state"));
  const state = await stateResp.json<SimulationState>();

  if (state.status !== "running") {
    queueMsg.ack();
    return;
  }

  // Step 2: REFLECT — Workers AI generates next action
  // Free: 10K Neurons/day. Uses @cf/meta/llama-3.1-8b-instruct
  const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      {
        role: "system",
        content: `You are a simulation engine. Goal: ${state.goal}. 
Current iteration: ${iteration}. 
Previous actions: ${JSON.stringify(state.history.slice(-3))}.
Generate ONE concrete action to try. Respond in JSON: {"action": "...", "expected": "..."}`,
      },
      {
        role: "user",
        content: `What action should I try in iteration ${iteration}?`,
      },
    ],
    max_tokens: 200,
  });

  let action = "noop";
  let expected = "unknown";
  try {
    const parsed = JSON.parse(String(aiResponse.response || "{}"));
    action = parsed.action || "noop";
    expected = parsed.expected || "unknown";
  } catch {
    // AI didn't return valid JSON, use raw text as action
    action = String(aiResponse.response || "noop").slice(0, 200);
  }

  // Step 3: EXECUTE — run in sandbox (V8 isolate or Browser Run)
  let result: unknown;
  if (env.BROWSER) {
    // Browser Run: 10 min/day free — headless Chromium
    result = await executeInBrowser(env.BROWSER, action);
  } else {
    // V8 isolate: execute simple JS actions safely
    result = await executeInWorker(action);
  }

  // Step 4: EVALUATE — compute reward
  const reward = computeReward(result, expected);

  // Step 5: RECORD — store in D1 + update DO state
  await env.DB.prepare(
    `INSERT INTO simulations (id, iteration, action, result, reward, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      simulationId,
      iteration,
      action,
      JSON.stringify(result).slice(0, 1000),
      reward,
      new Date().toISOString(),
    )
    .run();

  // Update DO state
  await doStub.fetch(new Request("https://sim/do/update", {
    method: "POST",
    body: JSON.stringify({
      iteration,
      simulationId,
      action,
      result,
      reward,
    }),
  }));

  // Step 6: REPEAT — queue next iteration (max 10 iterations per cycle)
  if (iteration < 10 && reward > -0.5) {
    await env.SIM_QUEUE.send({ iteration: iteration + 1, simulationId });
  }

  queueMsg.ack();
}

// ─── Sandbox Execution ────────────────────────────────────────────────

/** Execute code in Browser Run (headless Chromium, 10 min/day free) */
async function executeInBrowser(browser: Fetcher, code: string): Promise<unknown> {
  // @cloudflare/puppeteer + env.BROWSER binding
  // Limited to 10 min/day on free tier
  const resp = await browser.fetch("https://browser/run", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  return resp.json();
}

/** Execute simple JS in Worker V8 isolate (unlimited, but no DOM) */
async function executeInWorker(code: string): Promise<unknown> {
  // Only execute safe, simple expressions
  // Full eval() is dangerous — restrict to predefined safe operations
  if (code.includes("noop") || code.length < 10) {
    return { status: "skipped", reason: "noop or empty action" };
  }

  // For v0.1: just record the action without executing
  // Real execution requires Browser Run or a sandboxed evaluator
  return {
    status: "recorded",
    action: code.slice(0, 200),
    note: "V8 isolate execution requires safe evaluator (v0.2)",
  };
}

// ─── Reward Function ──────────────────────────────────────────────────

function computeReward(result: unknown, expected: string): number {
  const resultStr = JSON.stringify(result);
  // Simple heuristic: reward if result matches expected keywords
  if (expected !== "unknown" && resultStr.includes(expected.slice(0, 20))) {
    return 0.1;
  }
  // Small positive reward for any successful execution
  if (resultStr.includes('"status"')) {
    return 0.05;
  }
  // Negative for errors
  if (resultStr.includes("error") || resultStr.includes("Error")) {
    return -0.1;
  }
  return 0;
}

// ─── Utils ────────────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
