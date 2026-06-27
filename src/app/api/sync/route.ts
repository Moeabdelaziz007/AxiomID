/**
 * Data sync endpoint — syncs D1 edge data to PostgreSQL.
 * Called periodically or on-demand to keep databases consistent.
 *
 * Physics-inspired:
 * - Exponential backoff (radioactive decay) for retry logic
 * - Shannon entropy for data freshness scoring
 * - Leaky bucket for sync rate limiting
 */

import { z } from "zod";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/errors";
import {
  exponentialBackoff,
  shannonEntropy,
  dataFreshness,
} from "@/lib/math-physics-core";
import {
  checkRateLimit,
  RATE_LIMITS,
} from "@/lib/rate-limiter";
import { requireAuth } from "@/lib/auth-middleware";
import { logger } from "@/lib/logger";

export const maxDuration = 60;

const SyncRequestSchema = z.object({
  source: z.enum(["d1", "all"]).default("all"),
  dryRun: z.boolean().default(false),
  maxRetries: z.number().int().min(0).max(10).default(3),
});
export type SyncRequest = z.infer<typeof SyncRequestSchema>;



interface SyncResult {
  synced: number;
  errors: number;
  maxRetries: number;
  entropy: number;
  freshness: number;
}

/**
 * Executes authenticated data synchronization with request validation and retry logic.
 *
 * @returns An API response containing sync results with metrics on success, or an error response if validation, rate limiting, or execution fails.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const rl = await checkRateLimit("sync", RATE_LIMITS.authenticated);
    if (!rl.allowed) {
      return apiError("RATE_LIMITED", "Sync rate limit exceeded", undefined, {
        "X-RateLimit-Remaining": String(rl.remaining),
        "X-RateLimit-Reset": String(Math.ceil(rl.resetAt / 1000)),
        "X-Bucket-Level": String(rl.bucketLevel || 0),
        "X-Overflow-Count": String(rl.overflowCount || 0),
      });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("VALIDATION_ERROR", "Invalid JSON body");
    }

    const parsed = SyncRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, parsed.error.issues);
    }

    const { source, dryRun, maxRetries } = parsed.data;

    const results: Record<string, SyncResult> = {};

    // Sync harvest results with exponential backoff
    if (source === "all" || source === "d1") {
      const harvestResult = await syncWithRetry(
        syncHarvestResults,
        dryRun,
        maxRetries,
      );
      results.harvestResults = harvestResult;
    }

    // Sync agent presence with exponential backoff
    if (source === "all" || source === "d1") {
      const presenceResult = await syncWithRetry(
        syncAgentPresence,
        dryRun,
        maxRetries,
      );
      results.agentPresence = presenceResult;
    }

    return apiSuccess({
      message: dryRun ? "Dry run completed" : "Sync completed",
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[Sync] Error:", error);
    return apiError("INTERNAL_ERROR", "Sync failed");
  }
}

/**
 * Retrieves the current sync status and data quality metrics.
 * Uses Shannon entropy to measure data diversity.
 *
 * Vercel cron sends Authorization: Bearer {CRON_SECRET} header.
 * Validate this bearer token to authenticate cron requests.
 *
 * @returns An object with `lastSync` (most recent harvest and agent presence timestamps)
 * and `metrics` (freshness scores and query entropy).
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isCronAuthorized =
    cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCronAuthorized) {
    const auth = await requireAuth(req);
    if (auth.error) return auth.error;
  }

  try {
    const lastHarvest = await prisma.harvestResult.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, query: true },
    });

    const lastPresence = await prisma.agentPresence.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true, status: true },
    });

    // Calculate data freshness using physics-inspired decay
    const harvestFreshness = lastHarvest
      ? dataFreshness(lastHarvest.createdAt.getTime())
      : 0;

    const presenceFreshness = lastPresence
      ? dataFreshness(lastPresence.updatedAt.getTime())
      : 0;

    // Calculate entropy of recent queries (data diversity)
    const recentQueries = await prisma.harvestResult.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { query: true },
    });

    const queryEntropy = shannonEntropy(
      recentQueries.map((q) => q.query).join("")
    );

    return apiSuccess({
      status: "ok",
      lastSync: {
        harvestResults: lastHarvest?.createdAt || null,
        agentPresence: lastPresence?.updatedAt || null,
      },
      metrics: {
        harvestFreshness,
        presenceFreshness,
        queryEntropy,
        totalQueries: recentQueries.length,
      },
    });
  } catch (error) {
    logger.error("[Sync] Status error:", error);
    return apiError("INTERNAL_ERROR", "Failed to get sync status");
  }
}

/**
 * Sync with exponential backoff retry logic.
 * Physics analogy: Radioactive decay with jitter to prevent thundering herd.
 */
async function syncWithRetry(
  syncFn: (dryRun: boolean) => Promise<SyncResult>,
  dryRun: boolean,
  maxRetries: number,
): Promise<SyncResult> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await syncFn(dryRun);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.error(`[Sync] Attempt ${attempt + 1} failed:`, lastError.message);

      if (attempt < maxRetries) {
        const delayMs = exponentialBackoff(attempt, 1000, 30000, 0.3);
        logger.info(`[Sync] Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  return {
    synced: 0,
    errors: 1,
    maxRetries: maxRetries,
    entropy: 0,
    freshness: 0,
  };
}

/**
 * Sync harvest results from D1 to PostgreSQL.
 * Uses entropy scoring to measure data quality.
 */
async function syncHarvestResults(dryRun: boolean): Promise<SyncResult> {
  let synced = 0;
  let errors = 0;

  try {
    const backendUrl = process.env.CLOUDFLARE_BACKEND_URL;
    const sharedSecret = process.env.SHARED_SECRET_TOKEN_VERCEL_CF;

    if (!backendUrl || !sharedSecret) {
      throw new Error("Backend URL or shared secret is missing");
    }

    const lastRecord = await prisma.harvestResult.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    const since = lastRecord ? lastRecord.createdAt.getTime() : 0;

    const response = await fetch(`${backendUrl}/api/sync/export?since=${since}`, {
      method: "GET",
      headers: {
        "X-Shared-Secret": sharedSecret,
      },
    });

    if (!response.ok) {
      throw new Error(`Cloudflare export API error: ${response.status}`);
    }

    const body = await response.json() as {
      success: boolean;
      data: {
        harvestResults: Array<{
          id: string;
          query: string;
          result: string;
          citations: string | null;
          user_did: string | null;
          created_at: string;
        }>;
      };
    };

    if (!body.success || !body.data?.harvestResults) {
      throw new Error("Export returned invalid structure");
    }

    const items = body.data.harvestResults;

    const parseDate = (dStr: string) => {
      if (!dStr.endsWith("Z") && !dStr.includes("+") && !dStr.includes("GMT")) {
        return new Date(dStr.replace(" ", "T") + "Z");
      }
      return new Date(dStr);
    };

    if (!dryRun) {
      const CHUNK_SIZE = 15;
      for (let i = 0; i < items.length; i += CHUNK_SIZE) {
        const chunk = items.slice(i, i + CHUNK_SIZE);
        const results = await Promise.allSettled(
          chunk.map((item) =>
            prisma.harvestResult.upsert({
              where: { id: item.id },
              update: {
                query: item.query,
                result: item.result,
                citations: item.citations,
                userDid: item.user_did,
                createdAt: parseDate(item.created_at),
              },
              create: {
                id: item.id,
                query: item.query,
                result: item.result,
                citations: item.citations,
                userDid: item.user_did,
                createdAt: parseDate(item.created_at),
              },
            })
          )
        );

        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            synced++;
          } else {
            logger.error(`Failed to upsert harvest result ${chunk[index].id}:`, result.reason);
            errors++;
          }
        });
      }
    } else {
      synced = items.length;
    }

    const recentHarvests = await prisma.harvestResult.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { query: true, result: true, id: true, createdAt: true },
    });

    const dataString = recentHarvests.map((h) => h.query + h.result).join("");
    const entropy = shannonEntropy(dataString);
    const freshness = recentHarvests.length > 0
      ? dataFreshness(recentHarvests[0].createdAt.getTime())
      : 0;

    logger.info(`[Sync] Harvest results: entropy=${entropy.toFixed(3)}, freshness=${freshness.toFixed(3)}`);

    return { synced, errors, maxRetries: 0, entropy, freshness };
  } catch (error) {
    logger.error("[Sync] Harvest sync error:", error);
    errors++;
    return { synced, errors, maxRetries: 0, entropy: 0, freshness: 0 };
  }
}

async function syncAgentPresence(dryRun: boolean): Promise<SyncResult> {
  let synced = 0;
  let errors = 0;

  try {
    const backendUrl = process.env.CLOUDFLARE_BACKEND_URL;
    const sharedSecret = process.env.SHARED_SECRET_TOKEN_VERCEL_CF;

    if (!backendUrl || !sharedSecret) {
      throw new Error("Backend URL or shared secret is missing");
    }

    const response = await fetch(`${backendUrl}/api/sync/export?since=0`, {
      method: "GET",
      headers: {
        "X-Shared-Secret": sharedSecret,
      },
    });

    if (!response.ok) {
      throw new Error(`Cloudflare export API error: ${response.status}`);
    }

    const body = await response.json() as {
      success: boolean;
      data: {
        agentPresence: Array<{
          agent_id: string;
          status: string;
          last_heartbeat: number | null;
          metadata: string | null;
        }>;
      };
    };

    if (!body.success || !body.data?.agentPresence) {
      throw new Error("Export returned invalid structure");
    }

    const items = body.data.agentPresence;

    if (!dryRun) {
      const CHUNK_SIZE = 15;
      for (let i = 0; i < items.length; i += CHUNK_SIZE) {
        const chunk = items.slice(i, i + CHUNK_SIZE);
        const results = await Promise.allSettled(
          chunk.map((item) =>
            prisma.agentPresence.upsert({
              where: { agentId: item.agent_id },
              update: {
                status: item.status,
                lastHeartbeat: item.last_heartbeat != null ? BigInt(item.last_heartbeat) : null,
                metadata: item.metadata,
              },
              create: {
                agentId: item.agent_id,
                status: item.status,
                lastHeartbeat: item.last_heartbeat != null ? BigInt(item.last_heartbeat) : null,
                metadata: item.metadata,
              },
            })
          )
        );

        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            synced++;
          } else {
            logger.error(`Failed to upsert agent presence ${chunk[index].agent_id}:`, result.reason);
            errors++;
          }
        });
      }
    } else {
      synced = items.length;
    }

    const presenceRecords = await prisma.agentPresence.findMany({
      select: { status: true },
    });

    const statusString = presenceRecords.map((p) => p.status).join("");
    const entropy = shannonEntropy(statusString);

    const latestPresence = await prisma.agentPresence.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });

    const freshness = latestPresence
      ? dataFreshness(latestPresence.updatedAt.getTime())
      : 0;

    logger.info(`[Sync] Agent presence: entropy=${entropy.toFixed(3)}, freshness=${freshness.toFixed(3)}`);

    return { synced, errors, maxRetries: 0, entropy, freshness };
  } catch (error) {
    logger.error("[Sync] Presence sync error:", error);
    errors++;
    return { synced, errors, maxRetries: 0, entropy: 0, freshness: 0 };
  }
}

