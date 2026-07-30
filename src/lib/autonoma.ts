/**
 * Autonoma AI integration — open-source agentic E2E testing platform.
 *
 * Autonoma (github.com/Autonoma-AI/autonoma) uses AI agents to navigate
 * your app end-to-end and catch regressions on every PR. No test code required.
 *
 * This module provides a lightweight client for triggering Autonoma test runs
 * against AxiomID preview deployments and receiving results.
 *
 * --- OFFICIAL DOCUMENTATION ---
 * GitHub:   https://github.com/Autonoma-AI/autonoma
 * Homepage: https://getautonoma.com
 * Architecture: Hono + tRPC (API) + Vite + React 19 (UI) + Playwright (web) + Appium (mobile)
 * Self-host: Docker Compose (PostgreSQL 18 + Redis) → pnpm dev (ports 3000 + 4000)
 *
 * --- API REFERENCE ---
 * POST /api/runs       — Create test run { url, flow, platform, timeoutSeconds }
 * GET  /api/runs/:id   — Get run status
 * Flow: natural language description of what the AI agent should test
 *
 * --- AGENT QUICK START ---
 * 1. Read this file to understand the client interface
 * 2. Set AUTONOMA_API_URL + AUTONOMA_API_KEY env vars
 * 3. Use AXIOM_TEST_FLOWS constants for predefined AxiomID test scenarios
 * 4. Call client.runAxiomSmokeTest(previewUrl) after each Vercel preview deploy
 * 5. Full catalog: docs/AGENT_SERVICE_CATALOG.md §14
 *
 * Usage:
 *   const client = createAutonomaClient();
 *   const run = await client.createRun({ url: previewUrl, flow: "claim-flow" });
 *   const result = await client.waitForRun(run.id);
 *
 * Env vars:
 *   AUTONOMA_API_URL — base URL of self-hosted Autonoma instance (default: http://localhost:4000)
 *   AUTONOMA_API_KEY — API key for authentication
 */

function getApiUrl(): string {
  return process.env.AUTONOMA_API_URL || "http://localhost:4000";
}

function getApiKey(): string {
  return process.env.AUTONOMA_API_KEY || "";
}

export class AutonomaError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "AutonomaError";
  }
}

export interface AutonomaRunRequest {
  /** Target URL to test (e.g. Vercel preview deployment) */
  url: string;
  /** Natural language test flow description (e.g. "User claims identity and gets passport") */
  flow: string;
  /** Platform to test: web, ios, android */
  platform?: "web" | "ios" | "android";
  /** Max duration in seconds (default: 120) */
  timeoutSeconds?: number;
}

export interface AutonomaRun {
  id: string;
  status: "pending" | "running" | "passed" | "failed" | "error";
  url: string;
  flow: string;
  platform: string;
  startedAt: string;
  completedAt?: string;
  results?: {
    steps: number;
    passed: number;
    failed: number;
    screenshots?: string[];
    errors?: string[];
  };
}

async function request<T>(
  path: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  const { timeoutMs = 30000, ...init } = options;

  const apiKey = getApiKey();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${getApiUrl()}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new AutonomaError(
        `Autonoma API error: ${res.status} ${body.slice(0, 200)}`,
        "API_ERROR",
        res.status
      );
    }

    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof AutonomaError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new AutonomaError("Request timed out", "TIMEOUT");
    }
    throw new AutonomaError(
      err instanceof Error ? err.message : "Unknown error",
      "NETWORK_ERROR"
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function createAutonomaClient() {
  return {
    /** Check if Autonoma is configured (env vars set) */
    isConfigured(): boolean {
      return !!getApiKey() && !!process.env.AUTONOMA_API_URL;
    },

    /** Create a new E2E test run */
    async createRun(req: AutonomaRunRequest): Promise<AutonomaRun> {
      return request<AutonomaRun>("/api/runs", {
        method: "POST",
        body: JSON.stringify({
          url: req.url,
          flow: req.flow,
          platform: req.platform || "web",
          timeoutSeconds: req.timeoutSeconds || 120,
        }),
      });
    },

    /** Get a run's status */
    async getRun(runId: string): Promise<AutonomaRun> {
      return request<AutonomaRun>(`/api/runs/${runId}`);
    },

    /** Wait for a run to complete (polls every 5s) */
    async waitForRun(runId: string, maxWaitMs = 180000): Promise<AutonomaRun> {
      const deadline = Date.now() + maxWaitMs;
      while (Date.now() < deadline) {
        const run = await this.getRun(runId);
        if (run.status === "passed" || run.status === "failed" || run.status === "error") {
          return run;
        }
        await new Promise((r) => setTimeout(r, 5000));
      }
      throw new AutonomaError("Run did not complete within timeout", "TIMEOUT");
    },

    /** Trigger a standard AxiomID smoke test against a preview URL */
    async runAxiomSmokeTest(previewUrl: string): Promise<AutonomaRun> {
      const run = await this.createRun({
        url: previewUrl,
        flow: "Navigate to the homepage, verify AxiomID branding is visible, click 'Claim Identity', verify the Pi Network connect button appears, verify the page loads without errors",
        platform: "web",
        timeoutSeconds: 90,
      });
      return this.waitForRun(run.id);
    },
  };
}

/**
 * Predefined test flows for AxiomID critical paths.
 * These map to the E2E test scenarios in e2e/*.e2e.ts
 */
export const AXIOM_TEST_FLOWS = {
  LANDING: "Navigate to homepage, verify AxiomID title, check that key sections (identity, passport, trust) are visible",
  CLAIM_FLOW: "Click 'Claim Identity', go through the claim wizard, verify Pi Network connect button, complete demo mode flow",
  PASSPORT_VIEW: "Navigate to /passport/demo, verify passport card renders with DID, trust score, tier, and stamps",
  AGENT_PROFILE: "Navigate to an agent profile page, verify agent name, status, trust score, and skills are displayed",
  LEADERBOARD: "Navigate to /leaderboard, verify the leaderboard table renders with user rankings",
  I18N: "Switch language to Arabic, verify the UI text changes to Arabic, switch back to English",
} as const;

export type AxiomTestFlow = keyof typeof AXIOM_TEST_FLOWS;
