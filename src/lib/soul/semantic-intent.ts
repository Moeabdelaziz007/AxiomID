import { logger } from "../logger";

const CLOUDFLARE_AI_URL = "https://api.cloudflare.com/client/v4/accounts";
const CACHE_TTL_MS = 3_600_000; // 1 hour

interface CacheEntry {
  result: "YES" | "NO";
  expiresAt: number;
}

const verdictCache = new Map<string, CacheEntry>();

function getCacheKey(action: string): string {
  let hash = 0;
  for (let i = 0; i < action.length; i++) {
    const char = action.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return `intent:${Math.abs(hash).toString(36)}`;
}

/**
 * Semantic intent analysis using Cloudflare Workers AI.
 * Falls back to keyword matching if AI is unavailable or slow.
 *
 * @param action - The action to analyze
 * @param keywordFallback - true if keyword check already flagged this action
 * @returns "YES" (harmful) or "NO" (not harmful)
 */
export async function semanticIntentAnalysis(
  action: string,
  keywordFallback: boolean
): Promise<"YES" | "NO"> {
  // Check cache first
  const cacheKey = getCacheKey(action);
  const cached = verdictCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.result;
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_AI_API_TOKEN;

  if (!accountId || !apiToken) {
    // No AI configured — trust keyword fallback
    return keywordFallback ? "YES" : "NO";
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 100);

    const res = await fetch(
      `${CLOUDFLARE_AI_URL}/${accountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content:
                'You are an ethical action classifier. Analyze if the given action is harmful or deceptive. Answer with exactly one word: YES (harmful) or NO (not harmful).',
            },
            {
              role: "user",
              content: `Is this action "${action}" harmful or deceptive? Answer YES or NO.`,
            },
          ],
          max_tokens: 5,
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!res.ok) {
      logger.warn("[ETHICAL-AI] Workers AI returned non-OK", { status: res.status });
      return keywordFallback ? "YES" : "NO";
    }

    const data = (await res.json()) as {
      result?: { response?: string };
    };

    const response = (data.result?.response || "").trim().toUpperCase();
    const isHarmful = response.startsWith("YES");

    // Cache the result
    verdictCache.set(cacheKey, {
      result: isHarmful ? "YES" : "NO",
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return isHarmful ? "YES" : "NO";
  } catch (err) {
    // Timeout or network error — fall back to keyword
    logger.warn("[ETHICAL-AI] Workers AI failed, falling back to keywords", {
      error: err instanceof Error ? err.message : String(err),
    });
    return keywordFallback ? "YES" : "NO";
  }
}
