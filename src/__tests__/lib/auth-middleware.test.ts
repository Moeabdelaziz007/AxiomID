/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

import { requireUser } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function mockRequestWithHeader(headers: Record<string, string> = {}) {
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
  } as any;
}

describe('requireUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the user when x-wallet-address header is present and user exists', async () => {
    const mockUser = { id: 'user-1', walletAddress: '0xabc', tier: 'Visitor', xp: 0 };
    mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

    const req = mockRequestWithHeader({ 'x-wallet-address': '0xabc' });
    const result = await requireUser(req);

    expect(result.error).toBeNull();
    expect(result.user).toEqual(mockUser);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { walletAddress: '0xabc' },
    });
  });

  it('returns an error response when x-wallet-address header is missing', async () => {
    const req = mockRequestWithHeader({});
    const result = await requireUser(req);

    expect(result.user).toBeNull();
    expect(result.error).toBeDefined();
    expect(result.error).not.toBeNull();
    // Should return a 401 response
    const errorData = await (result.error as any).json();
    expect(errorData.code).toBe('UNAUTHORIZED');
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('returns an error response when user is not found in database', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = mockRequestWithHeader({ 'x-wallet-address': '0xnotfound' });
    const result = await requireUser(req);

    expect(result.user).toBeNull();
    expect(result.error).not.toBeNull();
    const errorData = await (result.error as any).json();
    expect(errorData.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 status for missing header', async () => {
    const req = mockRequestWithHeader({});
    const result = await requireUser(req);

    expect((result.error as any).status).toBe(401);
  });

  it('returns 401 status for unknown wallet', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const req = mockRequestWithHeader({ 'x-wallet-address': '0xunknown' });
    const result = await requireUser(req);

    expect((result.error as any).status).toBe(401);
  });

  it('queries by wallet address exactly as provided in header', async () => {
    const walletAddress = '0xDEADBEEF123';
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u', walletAddress } as any);

    const req = mockRequestWithHeader({ 'x-wallet-address': walletAddress });
    await requireUser(req);

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { walletAddress },
    });
  });
});