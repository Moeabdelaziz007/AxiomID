/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('@/lib/did', () => ({
  createIssuerDid: jest.fn(() => 'did:axiom:axiomid.app:issuer'),
}));

import { GET } from '@/app/api/did-document/route';
import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// A real Ed25519 PEM public key (matches the private key in jest.setup.js)
const VALID_ED25519_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAh5qFOVCLBNqHgT2q5kJbqDDHyODrqkRxHPREKQNHe68=
-----END PUBLIC KEY-----`;

function mockGetRequest(url: string) {
  return new Request(url, { method: 'GET' }) as any;
}

describe('GET /api/did-document — issuer DID (no ?did param)', () => {
  const originalKey = process.env.ISSUER_PUBLIC_KEY;

  afterEach(() => {
    process.env.ISSUER_PUBLIC_KEY = originalKey;
    jest.clearAllMocks();
  });

  it('returns 500 when ISSUER_PUBLIC_KEY is not configured', async () => {
    delete process.env.ISSUER_PUBLIC_KEY;
    const req = mockGetRequest('https://axiomid.app/api/did-document');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toMatch(/ISSUER_PUBLIC_KEY not configured/i);
  });

  it('returns 500 when ISSUER_PUBLIC_KEY is an invalid PEM (error thrown, not fallback)', async () => {
    process.env.ISSUER_PUBLIC_KEY = 'not-a-valid-pem-key';
    const req = mockGetRequest('https://axiomid.app/api/did-document');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toMatch(/Failed to parse ISSUER_PUBLIC_KEY/i);
  });

  it('no longer falls back to a fake placeholder key on parse error (removed in PR)', async () => {
    process.env.ISSUER_PUBLIC_KEY = 'invalid-key-no-fallback';
    const req = mockGetRequest('https://axiomid.app/api/did-document');
    const res = await GET(req);
    const data = await res.json();

    // Should return error, never a document with placeholder key
    expect(res.status).toBe(500);
    expect(JSON.stringify(data)).not.toContain('fallback-public-key-placeholder-for-testing');
  });

  it('returns a valid DID document when ISSUER_PUBLIC_KEY is a valid Ed25519 PEM', async () => {
    process.env.ISSUER_PUBLIC_KEY = VALID_ED25519_PUBLIC_KEY;
    const req = mockGetRequest('https://axiomid.app/api/did-document');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const doc = await res.json();
    expect(doc.id).toBe('did:axiom:axiomid.app:issuer');
    expect(doc['@context']).toBeDefined();
    expect(doc.verificationMethod).toBeDefined();
    expect(doc.verificationMethod[0].type).toBe('Ed25519VerificationKey2020');
  });

  it('sets Content-Type to application/did+ld+json on success', async () => {
    process.env.ISSUER_PUBLIC_KEY = VALID_ED25519_PUBLIC_KEY;
    const req = mockGetRequest('https://axiomid.app/api/did-document');
    const res = await GET(req);

    expect(res.headers.get('content-type')).toContain('application/did+ld+json');
  });

  it('includes Cache-Control header on success', async () => {
    process.env.ISSUER_PUBLIC_KEY = VALID_ED25519_PUBLIC_KEY;
    const req = mockGetRequest('https://axiomid.app/api/did-document');
    const res = await GET(req);

    const cacheControl = res.headers.get('cache-control');
    expect(cacheControl).toContain('max-age=86400');
  });
});

describe('GET /api/did-document — user DID (?did=...)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns 404 when DID is not found in database', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    const req = mockGetRequest('https://axiomid.app/api/did-document?did=did:axiom:unknown');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toMatch(/DID not found/i);
  });

  it('returns 404 when user record has no did field', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ did: null, kycStatus: 'NONE' } as any);
    const req = mockGetRequest('https://axiomid.app/api/did-document?did=did:axiom:axiomid.app:pi:uid123');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(404);
  });

  it('returns 200 with DID document when user DID is found', async () => {
    const userDid = 'did:axiom:axiomid.app:pi:uid123';
    mockPrisma.user.findFirst.mockResolvedValue({ did: userDid, kycStatus: 'VERIFIED' } as any);

    const req = mockGetRequest(`https://axiomid.app/api/did-document?did=${encodeURIComponent(userDid)}`);
    const res = await GET(req);

    expect(res.status).toBe(200);
    const doc = await res.json();
    expect(doc.id).toBe(userDid);
    expect(doc['@context']).toBeDefined();
  });

  it('returns 200 with did document (no verificationMethod for user DIDs without public key)', async () => {
    const userDid = 'did:axiom:axiomid.app:pi:uid456';
    mockPrisma.user.findFirst.mockResolvedValue({ did: userDid, kycStatus: 'NONE' } as any);

    const req = mockGetRequest(`https://axiomid.app/api/did-document?did=${encodeURIComponent(userDid)}`);
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    // User DIDs have no public key — verificationMethod should be absent or empty
    expect(data.verificationMethod).toBeUndefined();
  });
});