import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MAX_REQUEST_BODY_BYTES = 1024 * 1024; // 1MB

const ROOT_DOMAIN = "axiomid.app";

const RESERVED_SUBDOMAINS = new Set([
  "www", "api", "mail", "app", "admin", "dashboard",
  "docs", "blog", "status", "cdn", "assets", "static",
]);

const CORS_ALLOWED_ORIGINS = [
  "https://axiomid.app",
  "https://www.axiomid.app",
  "http://localhost:3000",
  "http://localhost:3001",
  "https://axiomid.vercel.app",
  "https://app.minepi.com",
  "https://sandbox.minepi.com",
];

/**
 * Determines whether a host is allowed.
 *
 * @param host - The host string to validate, which may include a port number
 * @returns `true` if the host is localhost, 127.0.0.1, axiomid.app, www.axiomid.app, or any subdomain of axiomid.app; `false` otherwise
 */
function isAllowedHost(host: string): boolean {
  const plain = host.replace(/:\d+$/, ""); // strip port
  if (plain === "localhost" || plain === "127.0.0.1") return true;
  if (plain === ROOT_DOMAIN || plain === `www.${ROOT_DOMAIN}`) return true;
  if (plain.endsWith(`.${ROOT_DOMAIN}`)) return true;
  return false;
}

/**
 * Determines whether an origin is allowed for CORS requests.
 *
 * @returns The original `origin` if it is allowed, `null` otherwise.
 */
function getAllowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  try {
    const url = new URL(origin);
    const host = url.hostname;
    // Same-origin: always allow
    if (host === ROOT_DOMAIN || host.endsWith(`.${ROOT_DOMAIN}`)) return origin;
    // Explicit allowlist
    if (CORS_ALLOWED_ORIGINS.includes(origin)) return origin;
    // Localhost in dev
    if (host === "localhost" || host === "127.0.0.1") return origin;
  } catch {
    // invalid origin
  }
  return null;
}

/**
 * Applies CORS headers to a response if the request origin is allowed.
 *
 * @returns The response with CORS headers applied if the origin is valid, or unchanged otherwise
 */
function applyCorsHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const origin = request.headers.get("origin");
  const allowedOrigin = getAllowedOrigin(origin);
  if (allowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Shared-Secret");
    response.headers.set("Access-Control-Max-Age", "86400");
    response.headers.set("Vary", "Origin");
  }
  return response;
}

/**
 * Validates requests, handles CORS, and rewrites specific paths.
 *
 * @returns The processed response.
 */
export function middleware(request: NextRequest) {
  const withCors = (response: NextResponse) => applyCorsHeaders(response, request);

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return withCors(new NextResponse(null, { status: 204 }));
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_REQUEST_BODY_BYTES) {
    return withCors(new NextResponse("Request body too large", { status: 413 }));
  }

  const host = request.headers.get("host") || "";

  // Validate host against allowlist
  if (!isAllowedHost(host)) {
    return withCors(new NextResponse("Invalid host", { status: 403 }));
  }

  const url = request.nextUrl;

  // Rewrite /.well-known/did.json to the DID document API route
  if (url.pathname === "/.well-known/did.json") {
    url.pathname = "/api/did-document";
    return withCors(NextResponse.rewrite(url));
  }

  // Check if this is a subdomain request (e.g., alice.axiomid.app)
  const isSubdomain =
    host.endsWith(`.${ROOT_DOMAIN}`) &&
    host !== `www.${ROOT_DOMAIN}` &&
    host !== ROOT_DOMAIN;

  if (isSubdomain && !url.pathname.startsWith("/api/")) {
    const subdomain = host.replace(`.${ROOT_DOMAIN}`, "");
    // Sanitize subdomain: alphanumeric + hyphens only (reject leading/trailing hyphens)
    if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(subdomain) || subdomain.length > 63) {
      return withCors(new NextResponse("Invalid subdomain", { status: 400 }));
    }
    // Reject reserved subdomains
    if (RESERVED_SUBDOMAINS.has(subdomain.toLowerCase())) {
      return withCors(new NextResponse("Subdomain not available", { status: 404 }));
    }
    // Rewrite to passport page with the subdomain as slug
    url.pathname = `/passport/${subdomain}`;
    return withCors(NextResponse.rewrite(url));
  }

  return withCors(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon-.*|validation-key.txt).*)",
  ],
};
