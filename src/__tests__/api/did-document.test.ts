/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 */

jest.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 59, resetAt: Date.now() + 60000 }),
  RATE_LIMITS: {
    public: { windowMs: 60000, maxRequests: 60 },
  },
}));
jest.mock('@/lib/ip', () => ({
  getClientIp: jest.fn(() => '10.0.0.1'),
}));
jest.mock('@/lib/did', () => ({
  createIssuerDid: jest.fn(() => 'did:axiom:issuer'),
}));
jest.mock('@/lib/did-document', () => ({
  buildDidDocument: jest.fn((did: string, publicKeyPem?: string) => ({
    '@context': ['https://www.w3.org/ns/did/v1'],
    id: did,
    verificationMethod: publicKeyPem ? [{ id: `${did}#key-1`, type: 'Ed25519VerificationKey2020' }] : [],
  })),
}));
jest.mock('@/lib/did-resolver', () => ({
  resolveDid: jest.fn(),
}));

import { GET } from '@/app/api/did-document/route';
import { checkRateLimit } from '@/lib/rate-limiter';
import { resolveDid } from '@/lib/did-resolver';
import { buildDidDocument } from '@/lib/did-document';

const mockCheckRateLimit = checkRateLimit as jest.MockedFunction<typeof checkRateLimit>;
const mockResolveDid = resolveDid as jest.MockedFunction<typeof resolveDid>;
const mockBuildDidDocument = buildDidDocument as jest.MockedFunction<typeof buildDidDocument>;

function makeRequest(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = qs
    ? `http://localhost/api/did-document?${qs}`
    : 'http://localhost/api/did-document';
  return new Request(url, { method: 'GET' }) as any;
}

describe('GET /api/did-document', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 59, resetAt: Date.now() + 60000 });
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('rate limiting', () => {
    it('returns 429 when rate limit is exceeded', async () => {
      mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

      const req = makeRequest();
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(429);
      expect(data.error).toBe('RATE_LIMITED');
      expect(data.message).toBe('Too many requests.');
    });

    it('uses RATE_LIMITS.public with IP-based key', async () => {
      process.env.ISSUER_PUBLIC_KEY = 'fake-pem';
      const req = makeRequest();
      await GET(req);

      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        'did-doc:10.0.0.1',
        expect.objectContaining({ maxRequests: 60 })
      );
    });
  });

  describe('no DID param — issuer DID document', () => {
    it('returns 500 when ISSUER_PUBLIC_KEY is not configured', async () => {
      delete process.env.ISSUER_PUBLIC_KEY;

      const req = makeRequest();
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toMatch(/issuer_public_key/i);
    });

    it('returns 200 with issuer DID document when key is configured', async () => {
      process.env.ISSUER_PUBLIC_KEY = '-----BEGIN PUBLIC KEY-----\nfake\n-----END PUBLIC KEY-----';

      const req = makeRequest();
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.id).toBe('did:axiom:issuer');
    });

    it('sets correct Content-Type for DID document', async () => {
      process.env.ISSUER_PUBLIC_KEY = 'fake-pem';

      const req = makeRequest();
      const res = await GET(req);

      expect(res.headers.get('Content-Type')).toContain('application/did+ld+json');
    });

    it('sets Cache-Control header', async () => {
      process.env.ISSUER_PUBLIC_KEY = 'fake-pem';

      const req = makeRequest();
      const res = await GET(req);

      expect(res.headers.get('Cache-Control')).toContain('public');
    });
  });

  describe('with DID param — user DID resolution', () => {
    it('returns 404 when DID is not found', async () => {
      mockResolveDid.mockResolvedValue(null);

      const req = makeRequest({ did: 'did:axiom:unknown' });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toMatch(/not found/i);
    });

    it('returns 400 when user has no DID configured', async () => {
      mockResolveDid.mockResolvedValue({ id: 'user-1', did: null } as any);

      const req = makeRequest({ did: 'did:axiom:user-1' });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toMatch(/no did configured/i);
    });

    it('returns 200 with DID document for a resolved user', async () => {
      mockResolveDid.mockResolvedValue({ id: 'user-1', did: 'did:axiom:alice' } as any);

      const req = makeRequest({ did: 'did:axiom:alice' });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.id).toBe('did:axiom:alice');
    });

    it('returns 500 when buildDidDocument throws', async () => {
      mockResolveDid.mockResolvedValue({ id: 'user-1', did: 'did:axiom:bad' } as any);
      mockBuildDidDocument.mockImplementationOnce(() => {
        throw new Error('Invalid DID format');
      });

      const req = makeRequest({ did: 'did:axiom:bad' });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Invalid DID format');
    });
  });
});