import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, rateLimitHeaders } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { logger } from "@/lib/logger";

interface ServiceCheck {
  name: string;
  status: "ONLINE" | "DEGRADED" | "OFFLINE";
  latencyMs: number;
}

async function checkDatabase(): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { name: "Database", status: "ONLINE", latencyMs: Date.now() - start };
  } catch {
    return { name: "Database", status: "OFFLINE", latencyMs: Date.now() - start };
  }
}

async function checkStellar(): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    const res = await fetch("https://horizon.stellar.org/", {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    const latency = Date.now() - start;
    return {
      name: "Stellar Network",
      status: res.ok ? "ONLINE" : "DEGRADED",
      latencyMs: latency,
    };
  } catch {
    return { name: "Stellar Network", status: "OFFLINE", latencyMs: Date.now() - start };
  }
}

async function checkPiNetwork(): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    const res = await fetch("https://api.minepi.com/", {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    const latency = Date.now() - start;
    return {
      name: "Pi Network",
      status: res.ok || res.status === 404 ? "ONLINE" : "DEGRADED",
      latencyMs: latency,
    };
  } catch {
    return { name: "Pi Network", status: "OFFLINE", latencyMs: Date.now() - start };
  }
}

async function checkWorkersAI(): Promise<ServiceCheck> {
  const start = Date.now();
  const hasKey = !!process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!hasKey) {
    return { name: "Workers AI", status: "DEGRADED", latencyMs: 0 };
  }
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/models/search`,
      {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      }
    );
    const latency = Date.now() - start;
    return {
      name: "Workers AI",
      status: res.ok ? "ONLINE" : "DEGRADED",
      latencyMs: latency,
    };
  } catch {
    return { name: "Workers AI", status: "OFFLINE", latencyMs: Date.now() - start };
  }
}

/**
 * GET /api/health — Real-time health checks for all services.
 * Returns each service's name, status (ONLINE/DEGRADED/OFFLINE), and latency in ms.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`health:${ip}`, RATE_LIMITS.anonymous);
  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Too many requests.", undefined, rateLimitHeaders(rateLimit));
  }

  try {
    const [db, stellar, pi, workersAI] = await Promise.all([
      checkDatabase(),
      checkStellar(),
      checkPiNetwork(),
      checkWorkersAI(),
    ]);

    const services = [db, stellar, pi, workersAI];
    const allOnline = services.every((s) => s.status === "ONLINE");
    const anyOffline = services.some((s) => s.status === "OFFLINE");

    return apiSuccess({
      status: allOnline ? "healthy" : anyOffline ? "degraded" : "degraded",
      uptime: 100,
      services,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[HEALTH API] Health check failed:", error);
    return apiError("INTERNAL_ERROR", "Health check failed");
  }
}
