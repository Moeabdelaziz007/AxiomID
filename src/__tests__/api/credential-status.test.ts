/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));
jest.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 }),
  RATE_LIMITS: {
    authenticated: { windowMs: 60000, maxRequests: 100 },
  },
}));
jest.mock('@/lib/ip', () => ({
  getClientIp: jest.fn(() => '127.0.0.1'),
}));

import { GET } from '@/app/api/credential-status/route';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limiter';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCheckRateLimit = checkRateLimit as jest.MockedFunction<typeof checkRateLimit>;

function makeRequest(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return new Request(`http://localhost/api/credential-status?${qs}`, {
    method: 'GET',
  }) as any;
}

describe('GET /api/credential-status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
  });

  describe('rate limiting', () => {
    it('returns 429 when rate limit is exceeded', async () => {
      mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

      const req = makeRequest({ credentialId: 'did:axiom:issuer' });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(429);
      expect(data.code).toBe('RATE_LIMITED');
    });

    it('uses RATE_LIMITS.authenticated limit key with IP prefix', async () => {
      const req = makeRequest({ credentialId: 'did:axiom:issuer' });
      await GET(req);

      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        'credential-status:127.0.0.1',
        expect.objectContaining({ maxRequests: 100 })
      );
    });
  });

  describe('validation', () => {
    it('returns 400 when neither credentialId nor subjectId is provided', async () => {
      const req = makeRequest({});
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for invalid DID method (not did:axiom:)', async () => {
      const req = makeRequest({ credentialId: 'did:web:example.com' });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.error).toMatch(/invalid did method/i);
    });

    it('returns 400 for invalid UUID in user DID', async () => {
      const req = makeRequest({ credentialId: 'did:axiom:user-not-a-uuid' });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('issuer DID', () => {
    it('returns VALID status for the issuer DID without DB lookup', async () => {
      const req = makeRequest({ credentialId: 'did:axiom:issuer' });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.revoked).toBe(false);
      expect(data.status).toBe('VALID');
      expect(data.subjectId).toBe('did:axiom:issuer');
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.user.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('user DID lookup by UUID', () => {
    it('returns VALID status for a verified user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'aabbccdd-1234-5678-abcd-aabbccddee00',
        did: 'did:axiom:user-aabbccdd-1234-5678-abcd-aabbccddee00',
        kycStatus: 'VERIFIED',
        updatedAt: new Date('2024-01-01'),
      } as any);

      const req = makeRequest({ credentialId: 'did:axiom:user-aabbccdd-1234-5678-abcd-aabbccddee00' });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.revoked).toBe(false);
      expect(data.status).toBe('VALID');
    });

    it('returns REVOKED status for a rejected user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'aabbccdd-1234-5678-abcd-aabbccddee00',
        did: 'did:axiom:user-aabbccdd-1234-5678-abcd-aabbccddee00',
        kycStatus: 'REJECTED',
        updatedAt: new Date('2024-01-01'),
      } as any);

      const req = makeRequest({ credentialId: 'did:axiom:user-aabbccdd-1234-5678-abcd-aabbccddee00' });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.revoked).toBe(true);
      expect(data.status).toBe('REVOKED');
    });

    it('returns 404 when user is not found by UUID', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const req = makeRequest({ credentialId: 'did:axiom:user-aabbccdd-1234-5678-abcd-aabbccddee00' });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.code).toBe('NOT_FOUND');
    });
  });

  describe('user DID lookup by username/DID', () => {
    it('returns VALID status for a user found by username', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        did: 'did:axiom:alice',
        kycStatus: 'VERIFIED',
        updatedAt: new Date('2024-01-01'),
      } as any);

      const req = makeRequest({ credentialId: 'did:axiom:alice' });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe('VALID');
      expect(data.subjectId).toBe('did:axiom:alice');
    });

    it('returns 404 when user not found by username', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const req = makeRequest({ subjectId: 'did:axiom:nonexistent' });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.code).toBe('NOT_FOUND');
    });

    it('accepts subjectId param as alternative to credentialId', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-2',
        did: 'did:axiom:bob',
        kycStatus: 'VERIFIED',
        updatedAt: new Date('2024-01-01'),
      } as any);

      const req = makeRequest({ subjectId: 'did:axiom:bob' });
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it('falls back to generated DID when user.did is null', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-3',
        did: null,
        kycStatus: 'VERIFIED',
        updatedAt: new Date('2024-01-01'),
      } as any);

      const req = makeRequest({ credentialId: 'did:axiom:charlie' });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.subjectId).toBe('did:axiom:user-user-3');
    });
  });

  describe('error handling', () => {
    it('returns 500 on unexpected DB error', async () => {
      mockPrisma.user.findFirst.mockRejectedValue(new Error('DB connection failed'));

      const req = makeRequest({ credentialId: 'did:axiom:alice' });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.code).toBe('INTERNAL_ERROR');
    });
  });
});