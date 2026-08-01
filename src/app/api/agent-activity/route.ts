/**
 * Agent activity stats from TimescaleDB continuous aggregate.
 *
 * Queries the `agent_activity_daily` materialized view (populated by
 * prisma/migrations/timescaledb_agentlog.sql) for fast dashboard stats
 * without scanning the full AgentLog hypertable.
 *
 * Falls back to raw COUNT queries if TimescaleDB is not yet activated.
 *
 * --- OFFICIAL DOCUMENTATION ---
 * TimescaleDB: https://docs.timescale.com/
 * Ghost.build: https://ghost.build
 * Full catalog: docs/AGENT_SERVICE_CATALOG.md §9
 *
 * --- AGENT QUICK START ---
 * GET /api/agent-activity?days=7&agentId=xxx
 * → { days, agentId, stats[], totalEntries, source: "timescaledb" | "raw" }
 * Cache: 5 min (public), stale-while-revalidate 10 min
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { apiError, apiSuccess } from "@/lib/errors";
import { getClientIp } from "@/lib/ip";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`agent-activity:${ip}`, RATE_LIMITS.public);
  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Too many requests. Try again later.", undefined, {
      "Retry-After": String(
        Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000))
      ),
    });
  }

  try {
    const url = new URL(request.url);
    const parsedDays = parseInt(url.searchParams.get("days") || "7", 10);
    const days = Number.isNaN(parsedDays) ? 7 : Math.min(30, Math.max(1, parsedDays));
    const agentId = url.searchParams.get("agentId");

    // Try TimescaleDB continuous aggregate first (fast path)
    // Falls back to raw Prisma query if view doesn't exist
    let stats: Array<{ day: string; logLevel: string; logSource: string; entryCount: number }>;

    try {
      // Raw SQL against the continuous aggregate view
      const query = agentId
        ? `SELECT day::text, log_level AS "logLevel", log_source AS "logSource", entry_count AS "entryCount"
           FROM agent_activity_daily
           WHERE agent_id = $1 AND day >= NOW() - INTERVAL '${days} days'
           ORDER BY day DESC, entry_count DESC`
        : `SELECT day::text, log_level AS "logLevel", log_source AS "logSource", entry_count AS "entryCount"
           FROM agent_activity_daily
           WHERE day >= NOW() - INTERVAL '${days} days'
           ORDER BY day DESC, entry_count DESC`;

      const params = agentId ? [agentId] : [];
      const result = await prisma.$queryRawUnsafe(query, ...params);
      stats = result as typeof stats;
    } catch {
      // TimescaleDB view not available — fall back to raw GROUP BY
      logger.info("[agent-activity] TimescaleDB view not available, using raw query");
      const since = new Date(Date.now() - days * 86400000);

      const where = agentId
        ? { agentId, createdAt: { gte: since } }
        : { createdAt: { gte: since } };

      const grouped = await prisma.agentLog.groupBy({
        by: ["level", "source"],
        where,
        _count: { _all: true },
        orderBy: { _count: { id: "desc" } },
        take: 50,
      });

      stats = grouped.map((g) => ({
        day: since.toISOString().slice(0, 10),
        logLevel: g.level,
        logSource: g.source,
        entryCount: g._count._all,
      }));
    }

    return apiSuccess(
      {
        days,
        agentId: agentId || null,
        stats,
        totalEntries: stats.reduce((sum, s) => sum + Number(s.entryCount), 0),
        source: stats.length > 0 && stats[0].day.includes("T") ? "raw" : "timescaledb",
      },
      200,
      { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" }
    );
  } catch (err) {
    logger.error("[agent-activity] Error:", err);
    return apiError("INTERNAL_ERROR", "Failed to retrieve agent activity stats");
  }
}
