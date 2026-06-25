import { shannonEntropy, dataFreshness } from "@/lib/math-physics-core";
import { logger } from "@/lib/logger";

export interface SyncResult {
  synced: number;
  errors: number;
  maxRetries: number;
  entropy: number;
  freshness: number;
}

export function getBackendConfig(): { backendUrl: string; sharedSecret: string } {
  const backendUrl = process.env.CLOUDFLARE_BACKEND_URL;
  const sharedSecret = process.env.SHARED_SECRET_TOKEN_VERCEL_CF;
  if (!backendUrl || !sharedSecret) {
    throw new Error("Backend URL or shared secret is missing");
  }
  return { backendUrl, sharedSecret };
}

export async function fetchBackendExport<T>(
  backendUrl: string,
  sharedSecret: string,
  since: number,
  dataKey: string
): Promise<T[]> {
  const response = await fetch(`${backendUrl}/api/sync/export?since=${since}`, {
    method: "GET",
    headers: { "X-Shared-Secret": sharedSecret },
  });

  if (!response.ok) {
    throw new Error(`Cloudflare export API error: ${response.status}`);
  }

  const body = await response.json() as { success: boolean; data: Record<string, T[]> };
  if (!body.success || !body.data?.[dataKey]) {
    throw new Error("Export returned invalid structure");
  }

  return body.data[dataKey];
}

export async function upsertItems<T extends { id: string }>(
  items: T[],
  dryRun: boolean,
  upsertFn: (item: T) => Promise<unknown>,
  label: string
): Promise<{ synced: number; errors: number }> {
  let synced = 0;
  let errors = 0;

  if (!dryRun) {
    for (const item of items) {
      try {
        await upsertFn(item);
        synced++;
      } catch (err) {
        logger.error(`Failed to upsert ${label} ${item.id}:`, err);
        errors++;
      }
    }
  } else {
    synced = items.length;
  }

  return { synced, errors };
}

export function computeSyncMetrics(entropyInput: string, freshnessTimestamp: number | null): { entropy: number; freshness: number } {
  const entropy = shannonEntropy(entropyInput);
  const freshness = freshnessTimestamp ? dataFreshness(freshnessTimestamp) : 0;
  return { entropy, freshness };
}

export function parseDate(dStr: string): Date {
  if (!dStr.endsWith("Z") && !dStr.includes("+") && !dStr.includes("GMT")) {
    return new Date(dStr.replace(" ", "T") + "Z");
  }
  return new Date(dStr);
}
