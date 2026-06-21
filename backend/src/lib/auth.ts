/**
 * Auth middleware for Cloudflare Worker.
 * Timing-safe shared-secret verification.
 */

import type { Env } from "./types";

export const PUBLIC_ROUTES = ["/health", "/status", "/api/trust/", "/api/skills", "/api/iqra/"];

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
  if (!env.SHARED_SECRET_TOKEN_VERCEL_CF || !authHeader) {
    return { authorized: false };
  }

  const secret = env.SHARED_SECRET_TOKEN_VERCEL_CF;
  if (authHeader.length !== secret.length) {
    return { authorized: false };
  }

  let match = 0;
  for (let i = 0; i < authHeader.length; i++) {
    match |= authHeader.charCodeAt(i) ^ secret.charCodeAt(i);
  }

  return { authorized: match === 0, agentId };
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
