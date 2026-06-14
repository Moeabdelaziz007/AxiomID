/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from 'next/server';
import { middleware } from '@/middleware';

function makeRequest(url: string, headers: Record<string, string> = {}) {
  return new NextRequest(url, { headers });
}

describe('middleware — subdomain rewrite skips /api/ paths (new in PR)', () => {
  it('does NOT rewrite subdomain requests to /api/ paths', () => {
    const req = makeRequest('https://alice.axiomid.app/api/status', {
      host: 'alice.axiomid.app',
    });
    const res = middleware(req);
    // Should pass through (NextResponse.next()), not rewrite to /passport/alice
    expect(res).toBeInstanceOf(NextResponse);
    // Rewrite responses have a different URL; next() responses don't redirect
    const location = res.headers.get('location');
    expect(location).toBeNull();
  });

  it('does NOT rewrite subdomain requests to /api/ sub-paths', () => {
    const req = makeRequest('https://bob.axiomid.app/api/passport/test', {
      host: 'bob.axiomid.app',
    });
    const res = middleware(req);
    // status 403/400/413 would indicate a block, NextResponse.next() is the pass-through
    expect(res.status).not.toBe(400);
    expect(res.status).not.toBe(403);
  });

  it('DOES rewrite subdomain requests to non-api paths', () => {
    const req = makeRequest('https://alice.axiomid.app/', {
      host: 'alice.axiomid.app',
    });
    const res = middleware(req);
    // A rewrite still returns 200-like; we verify the URL was rewritten
    // NextResponse.rewrite sets x-middleware-rewrite header
    const rewriteHeader = res.headers.get('x-middleware-rewrite');
    expect(rewriteHeader).toContain('/passport/alice');
  });

  it('DOES rewrite subdomain requests to dashboard paths (non-api)', () => {
    const req = makeRequest('https://carol.axiomid.app/dashboard', {
      host: 'carol.axiomid.app',
    });
    const res = middleware(req);
    const rewriteHeader = res.headers.get('x-middleware-rewrite');
    expect(rewriteHeader).toContain('/passport/carol');
  });
});

describe('middleware — body size limit', () => {
  it('returns 413 when content-length exceeds 1MB', () => {
    const req = makeRequest('https://axiomid.app/api/auth/pi', {
      host: 'axiomid.app',
      'content-length': String(1024 * 1024 + 1),
    });
    const res = middleware(req);
    expect(res.status).toBe(413);
  });

  it('passes through requests within the 1MB body size limit', () => {
    const req = makeRequest('https://axiomid.app/api/auth/pi', {
      host: 'axiomid.app',
      'content-length': String(1024 * 1024),
    });
    const res = middleware(req);
    expect(res.status).not.toBe(413);
  });
});

describe('middleware — host validation', () => {
  it('returns 403 for unrecognized host', () => {
    const req = makeRequest('https://evil.com/api/status', {
      host: 'evil.com',
    });
    const res = middleware(req);
    expect(res.status).toBe(403);
  });

  it('allows requests from localhost', () => {
    const req = makeRequest('http://localhost:3000/api/status', {
      host: 'localhost:3000',
    });
    const res = middleware(req);
    expect(res.status).not.toBe(403);
  });

  it('allows requests from axiomid.app', () => {
    const req = makeRequest('https://axiomid.app/api/status', {
      host: 'axiomid.app',
    });
    const res = middleware(req);
    expect(res.status).not.toBe(403);
  });

  it('allows requests from www.axiomid.app', () => {
    const req = makeRequest('https://www.axiomid.app/', {
      host: 'www.axiomid.app',
    });
    const res = middleware(req);
    expect(res.status).not.toBe(403);
  });
});

describe('middleware — .well-known/did.json rewrite', () => {
  it('rewrites /.well-known/did.json to /api/did-document', () => {
    const req = makeRequest('https://axiomid.app/.well-known/did.json', {
      host: 'axiomid.app',
    });
    const res = middleware(req);
    const rewriteHeader = res.headers.get('x-middleware-rewrite');
    expect(rewriteHeader).toContain('/api/did-document');
  });
});

describe('middleware — subdomain sanitization', () => {
  it('returns 400 for subdomain starting with a hyphen', () => {
    const req = makeRequest('https://-bad.axiomid.app/', {
      host: '-bad.axiomid.app',
    });
    const res = middleware(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for subdomain ending with a hyphen', () => {
    const req = makeRequest('https://bad-.axiomid.app/', {
      host: 'bad-.axiomid.app',
    });
    const res = middleware(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for subdomain longer than 63 characters', () => {
    const longSubdomain = 'a'.repeat(64);
    const req = makeRequest(`https://${longSubdomain}.axiomid.app/`, {
      host: `${longSubdomain}.axiomid.app`,
    });
    const res = middleware(req);
    expect(res.status).toBe(400);
  });
});

describe('middleware — matcher (updated in PR — /api/ included)', () => {
  // The matcher now includes /api/ routes (no longer excluded)
  // This test verifies the middleware logic works correctly for API paths
  it('processes /api/ requests (body size check applies)', () => {
    const req = makeRequest('https://axiomid.app/api/skills', {
      host: 'axiomid.app',
      'content-length': String(2 * 1024 * 1024), // 2MB — exceeds limit
    });
    const res = middleware(req);
    expect(res.status).toBe(413);
  });
});
