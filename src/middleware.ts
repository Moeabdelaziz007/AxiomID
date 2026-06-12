import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MAX_REQUEST_BODY_BYTES = 1024 * 1024; // 1MB

const ROOT_DOMAIN = "axiomid.app";

function isAllowedHost(host: string): boolean {
  const plain = host.replace(/:\d+$/, ""); // strip port
  if (plain === "localhost" || plain === "127.0.0.1") return true;
  if (plain === ROOT_DOMAIN || plain === `www.${ROOT_DOMAIN}`) return true;
  if (plain.endsWith(`.${ROOT_DOMAIN}`)) return true;
  if (plain.endsWith(".vercel.app")) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_REQUEST_BODY_BYTES) {
    return new NextResponse("Request body too large", { status: 413 });
  }

  const host = request.headers.get("host") || "";

  // Validate host against allowlist
  if (!isAllowedHost(host)) {
    return new NextResponse("Invalid host", { status: 403 });
  }

  const url = request.nextUrl;

  // Rewrite /.well-known/did.json to the DID document API route
  if (url.pathname === "/.well-known/did.json") {
    url.pathname = "/api/did-document";
    return NextResponse.rewrite(url);
  }

  // Check if this is a subdomain request (e.g., alice.axiomid.app)
  const rootDomain = ROOT_DOMAIN;
  const isSubdomain =
    host.endsWith(`.${rootDomain}`) &&
    host !== `www.${rootDomain}` &&
    host !== rootDomain;

  if (isSubdomain) {
    const subdomain = host.replace(`.${rootDomain}`, "");
    // Sanitize subdomain: alphanumeric + hyphens only
    if (!/^[a-zA-Z0-9-]+$/.test(subdomain) || subdomain.length > 63) {
      return new NextResponse("Invalid subdomain", { status: 400 });
    }
    // Rewrite to passport page with the subdomain as slug
    url.pathname = `/passport/${subdomain}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|icon-.*|validation-key.txt|api/).*)",
  ],
};
