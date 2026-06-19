/**
 * @jest-environment node
 */

jest.mock('@/lib/auth-middleware', () => ({
  requireAuth: jest.fn(),
}));

jest.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 }),
  RATE_LIMITS: { authenticated: { windowMs: 60000, maxRequests: 100 } },
}));

jest.mock('@/lib/ip', () => ({
  getClientIp: jest.fn(() => '127.0.0.1'),
}));

import { POST } from '@/app/api/sandbox/execute/route';
import { requireAuth } from '@/lib/auth-middleware';

const mockRequireAuth = requireAuth as jest.Mock;

function mockPostRequest(body: unknown) {
  return new Request('http://localhost/api/sandbox/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as any;
}

describe('POST /api/sandbox/execute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue({
      error: null,
      user: {
        id: 'mock-user-id',
        walletAddress: '0xabc',
        piUid: 'mock-pi-uid',
        piUsername: 'mockuser',
      },
    });
  });

  it('allows safe script execution', async () => {
    const req = mockPostRequest({
      manifestMd: 'name: "SafeSkill"\ndescription: "Harmless script"',
      inputData: 'const x = 123;'
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('blocks dangerous scripts (imports/requires)', async () => {
    const req = mockPostRequest({
      manifestMd: 'name: "BadSkill"\n',
      inputData: 'const fs = require("fs");'
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(403);
    expect(data.code).toBe('FORBIDDEN');
    expect(data.error).toContain('Blocked forbidden identifier: "fs"');
  });

  it('blocks payloads exceeding 8KB', async () => {
    const req = mockPostRequest({
      manifestMd: 'name: "LargeSkill"\n',
      inputData: 'const x = "' + 'a'.repeat(8192) + '";'
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
    expect(data.error).toContain('exceeds maximum allowed boundary');
  });
});
