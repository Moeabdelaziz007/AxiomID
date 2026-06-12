/**
 * @jest-environment node
 */

jest.mock('crypto', () => {
  const actual = jest.requireActual('crypto');
  return {
    ...actual,
    createPrivateKey: jest.fn(),
    sign: jest.fn(() => Buffer.from('mock-signature')),
  };
});

jest.mock('@/lib/auth-middleware', () => ({
  requireAuth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

import { GET } from '@/app/api/agent/manifest/route';
import { createPrivateKey, sign } from 'crypto';
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

const mockCreatePrivateKey = createPrivateKey as jest.Mock;
const mockSign = sign as jest.Mock;
const mockRequireAuth = requireAuth as jest.Mock;
const mockFindUnique = prisma.user.findUnique as jest.Mock;

function mockGetRequest() {
  return new Request('http://localhost/api/agent/manifest', { method: 'GET' });
}

const mockUser = {
  id: 'user-123',
  piUid: 'pi_uid_123',
  walletAddress: 'pi:test',
  piUsername: 'testuser',
  xp: 100,
  tier: 'Citizen',
};

const mockAuthResponse = { error: null, user: mockUser };

const mockDbUser = {
  id: 'user-123',
  walletAddress: 'pi:test',
  did: null,
  piUsername: 'testuser',
  tier: 'Citizen',
  xp: 100,
};

describe('GET /api/agent/manifest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ISSUER_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nfakekey\n-----END PRIVATE KEY-----';
    process.env.ISSUER_PUBLIC_KEY = '-----BEGIN PUBLIC KEY-----\nfakepub\n-----END PUBLIC KEY-----';
    mockSign.mockReturnValue(Buffer.from('mock-signature'));
    mockCreatePrivateKey.mockReturnValue({ type: 'private', asymmetricKeyType: 'ed25519' });
    mockRequireAuth.mockResolvedValue(mockAuthResponse);
    mockFindUnique.mockResolvedValue(mockDbUser);
  });

  afterEach(() => {
    delete process.env.ISSUER_PRIVATE_KEY;
    delete process.env.ISSUER_PUBLIC_KEY;
  });

  it('returns a signed manifest for authenticated user', async () => {
    mockSign.mockReturnValue(Buffer.from('deadbeef', 'hex'));

    const req = mockGetRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data['@context']).toBeDefined();
    expect(data.type).toContain('VerifiableCredential');
    expect(data.credentialSubject.id).toBe('did:axiom:user-user-123');
    expect(data.proof).toBeDefined();
    expect(data.proof.proofValue).toBeDefined();
    expect(data.expirationDate).toBeDefined();
    expect(data.credentialStatus).toBeDefined();
  });

  it('uses stored DID when user has one', async () => {
    mockFindUnique.mockResolvedValue({ ...mockDbUser, did: 'did:axiom:custom-user' });

    const req = mockGetRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(data.credentialSubject.id).toBe('did:axiom:custom-user');
  });

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockResolvedValue({
      error: new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 }),
      user: null,
    });

    const req = mockGetRequest();
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('returns 404 when user not found in DB', async () => {
    mockFindUnique.mockResolvedValue(null);

    const req = mockGetRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('USER_NOT_FOUND');
  });

  it('returns 500 when ISSUER_PRIVATE_KEY is not set', async () => {
    delete process.env.ISSUER_PRIVATE_KEY;

    const req = mockGetRequest();
    const res = await GET(req);

    expect(res.status).toBe(500);
  });

  it('includes correct Content-Type and Cache-Control headers', async () => {
    const req = mockGetRequest();
    const res = await GET(req);

    expect(res.headers.get('Content-Type')).toContain('application/ld+json');
    expect(res.headers.get('Cache-Control')).toContain('max-age=300');
  });

  it('includes required manifest fields', async () => {
    const req = mockGetRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(data.issuer).toBeDefined();
    expect(data.issuer.name).toBe('AxiomID Protocol');
    expect(data.issuanceDate).toBeDefined();
    expect(data.credentialSubject.type).toBe('AgentIdentity');
    expect(data.metadata.protocol).toBe('AxiomID');
    expect(data.metadata.version).toBe('1.0.0');
  });

  it('includes proof with correct verificationMethod', async () => {
    const req = mockGetRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(data.proof.verificationMethod).toBe('did:axiom:issuer#key-1');
    expect(data.proof.proofPurpose).toBe('assertionMethod');
    expect(data.proof.created).toBe(data.issuanceDate);
  });
});
