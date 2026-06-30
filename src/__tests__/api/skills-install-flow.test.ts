/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { POST as InstallPOST, DELETE as UninstallDELETE } from '@/app/api/skills/[slug]/install/route';
import { POST as PurchasePOST } from '@/app/api/skills/[slug]/purchase/route';
import { requireAuth } from '@/lib/auth-middleware';

// Mocks
jest.mock('@/lib/prisma', () => {
  const prismaMock: Record<string, unknown> = {
    skill: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userAgent: {
      findUnique: jest.fn(),
    },
    skillInstallation: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    piPayment: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    // Support both the array form ($transaction([...])) used by uninstall and
    // the interactive callback form ($transaction(async (tx) => {...})) used by
    // install. The callback receives the same mocked prisma client.
    $transaction: jest.fn((arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (tx: unknown) => unknown)(prismaMock)
        : Promise.all(arg as unknown[])
    ),
  };
  return { prisma: prismaMock };
});
jest.mock('@/lib/auth-middleware');
jest.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
  RATE_LIMITS: { authenticated: { windowMs: 60000, maxRequests: 100 } },
}));

describe('Skill Install/Purchase Flow', () => {
  beforeEach(() => jest.clearAllMocks());

  it('installs a skill successfully', async () => {
    (requireAuth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.skill.findUnique as jest.Mock).mockResolvedValue({ id: 'skill-1', slug: 'test', isPublished: true, status: 'PUBLISHED' });
    (prisma.userAgent.findUnique as jest.Mock).mockResolvedValue({ id: 'agent-1' });
    (prisma.skillInstallation.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.skillInstallation.create as jest.Mock).mockResolvedValue({});
    (prisma.skill.update as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost/api/skills/test/install', { method: 'POST' });
    const res = await InstallPOST(req, { params: Promise.resolve({ slug: 'test' }) });
    expect(res.status).toBe(200);
  });

  it('uninstalls a skill successfully', async () => {
    (requireAuth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (prisma.skill.findUnique as jest.Mock).mockResolvedValue({ id: 'skill-1', slug: 'test' });
    (prisma.userAgent.findUnique as jest.Mock).mockResolvedValue({ id: 'agent-1' });
    (prisma.skillInstallation.findFirst as jest.Mock).mockResolvedValue({ id: 'inst-1' });
    (prisma.skillInstallation.delete as jest.Mock).mockResolvedValue({});
    (prisma.skill.update as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost/api/skills/test/install', { method: 'DELETE' });
    const res = await UninstallDELETE(req, { params: Promise.resolve({ slug: 'test' }) });
    expect(res.status).toBe(200);
  });

  it('returns 410 for deprecated purchase endpoint', async () => {
    const req = new NextRequest('http://localhost/api/skills/test/purchase', { method: 'POST' });
    const res = await PurchasePOST(req, { params: Promise.resolve({ slug: 'test' }) });
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.error).toBe('GONE');
  });
});
