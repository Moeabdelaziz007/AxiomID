 
import { resolveDid } from '@/lib/did-resolver';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('resolveDid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns user if DID is found', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ did: 'did:axiom:user-1', kycStatus: 'VERIFIED' } as any);
    const result = await resolveDid('did:axiom:user-1');
    expect(result).toEqual({ did: 'did:axiom:user-1', kycStatus: 'VERIFIED' });
    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
      where: { did: 'did:axiom:user-1' },
      select: { did: true, kycStatus: true },
    });
  });

  it('returns null if DID is not found', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    const result = await resolveDid('did:axiom:not-found');
    expect(result).toBeNull();
  });
});
