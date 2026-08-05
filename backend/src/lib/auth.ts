/**
 * Auth middleware for Cloudflare Worker.
 * Timing-safe shared-secret verification.
 */

import { timingSafeEqual } from "node:crypto";
import type { Env } from "./types";

export const PUBLIC_ROUTES = ["/health", "/status", "/api/truth/", "/api/skills"];

export const PUBLIC_EXACT = new Set(["/health", "/status", "/api/skills"]);
export const PUBLIC_PREFIXES = ["/api/truth/", "/api/resolve/", "/api/vc/"];

/**
 * Constant-time string comparison to prevent timing attacks.
 * Uses native node:crypto.timingSafeEqual for robust protection.
 */
export function safeCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }

  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);

  // timingSafeEqual requires buffers of the same length.
  if (aBuf.length !== bBuf.length) {
    return false;
  }

  return timingSafeEqual(aBuf, bBuf);
}

export function verifyAuth(request: Request, env: Env): { authorized: boolean; agentId?: string } {
  const url = new URL(request.url);
  const agentId = url.searchParams.get("agentId") || undefined;

  const isPublic =
    PUBLIC_EXACT.has(url.pathname) ||
    PUBLIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
  if (isPublic) {
    return { authorized: true, agentId };
  }

  const authHeader = request.headers.get("X-Shared-Secret");
  const secret = env.SHARED_SECRET_TOKEN_VERCEL_CF;

  if (!secret || !authHeader) {
    return { authorized: false };
  }

  return { authorized: safeCompare(authHeader, secret), agentId };
}

export function requireAuth(request: Request, env: Env): Response | null {
  const { authorized } = verifyAuth(request, env);
  if (!authorized) {
    return new Response("Unauthorized", { status: 401 });
  }
  return null;
}

const BASE_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "https://axiomid.app",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Shared-Secret",
};

export function rateLimitHeaders(result: { remaining: number; resetMs: number }): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetMs / 1000)),
  };
}

export function jsonResponse(data: unknown, status: number = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...BASE_HEADERS, ...extraHeaders },
  });
}

export function errorResponse(message: string, status: number = 400, extraHeaders?: Record<string, string>): Response {
  return jsonResponse({ success: false, error: message, timestamp: Date.now() }, status, extraHeaders);
}
