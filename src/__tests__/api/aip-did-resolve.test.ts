import { GET as SigninGet } from '@/app/api/pi/aip/signin/route';
import { GET as KyaRegisterGet } from '@/app/api/pi/kya/register/route';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    userAgent: { findUnique: jest.fn() },
    action: { findFirst: jest.fn() },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const userRow = {
  id: 'user-1',
  did: 'did:axiom:pi:pi-123',
  piUid: 'pi-123',
  piUsername: 'testuser',
  walletAddress: 'pi:pi-123',
  kycStatus: 'approved',
  agent: null,
};

function mockGetRequest(url: string) {
  return new Request(url) as any;
}

describe('GET /api/pi/aip/signin (DID resolver)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SOVEREIGN_KEY_SALT = 'test-salt';
  });

  it('returns publicKey and verificationMethod so verifiers get key material', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(userRow);
    (mockPrisma.action.findFirst as jest.Mock).mockResolvedValue({ hash: 'anchor-hash', timestamp: new Date() });

    const res = await SigninGet(mockGetRequest('http://localhost/api/pi/aip/signin?did=did:axiom:pi:pi-123'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.publicKey).toBeDefined();
    expect(data.publicKey).toContain('PUBLIC KEY');
    expect(data.verificationMethod).toBe('Ed25519Signature2020');
  });

  it('returns 400 for non-did:axiom did', async () => {
    const res = await SigninGet(mockGetRequest('http://localhost/api/pi/aip/signin?did=did:eth:0x1'));
    expect(res.status).toBe(400);
  });
});

describe('GET /api/pi/kya/register (KYA status resolver)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const agentRow = {
    id: 'agent-1',
    publicId: 'pub-1',
    name: 'My Agent',
    did: null,
    userId: 'user-1',
    user: { id: 'user-1', piUid: 'pi-123' },
  };

  it('only reports verified when the action metadata matches the requested agentId', async () => {
    (mockPrisma.userAgent.findUnique as jest.Mock).mockResolvedValue(agentRow);
    (mockPrisma.action.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await KyaRegisterGet(mockGetRequest('http://localhost/api/pi/kya/register?agentId=agent-1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('none');
    expect(mockPrisma.action.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          type: 'kya_register',
          metadata: { contains: 'agent-1' },
        }),
      }),
    );
  });

  it('returns verified when the action metadata matches the agent', async () => {
    (mockPrisma.userAgent.findUnique as jest.Mock).mockResolvedValue(agentRow);
    (mockPrisma.action.findFirst as jest.Mock).mockResolvedValue({
      hash: 'anchor-hash',
      timestamp: new Date(),
      metadata: JSON.stringify({ agentId: 'agent-1' }),
    });

    const res = await KyaRegisterGet(mockGetRequest('http://localhost/api/pi/kya/register?agentId=agent-1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('verified');
    expect(data.trustChainAnchor).toBe('anchor-hash');
  });

  it('returns 400 without agentId', async () => {
    const res = await KyaRegisterGet(mockGetRequest('http://localhost/api/pi/kya/register'));
    expect(res.status).toBe(400);
  });
});
