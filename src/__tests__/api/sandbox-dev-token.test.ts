/**
 * @jest-environment node
 */

jest.mock('@/lib/sandbox-token', () => ({
  getSandboxDevToken: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/sandbox/dev-token/route';
import { getSandboxDevToken } from '@/lib/sandbox-token';
import { logger } from '@/lib/logger';

const mockGetSandboxDevToken = getSandboxDevToken as jest.Mock;
const mockLoggerError = logger.error as jest.Mock;

function makeRequest(hostname: string): NextRequest {
  return new NextRequest(`http://${hostname}/api/sandbox/dev-token`);
}

describe('GET /api/sandbox/dev-token', () => {
  const originalBypass = process.env.SANDBOX_AUTH_BYPASS;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SANDBOX_AUTH_BYPASS = 'true';
    mockGetSandboxDevToken.mockReturnValue('test-dev-token-abc');
  });

  afterEach(() => {
    if (originalBypass === undefined) {
      delete process.env.SANDBOX_AUTH_BYPASS;
    } else {
      process.env.SANDBOX_AUTH_BYPASS = originalBypass;
    }
  });

  it('returns token for localhost when bypass is enabled', async () => {
    const req = makeRequest('localhost');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.token).toBe('test-dev-token-abc');
  });

  it('returns token for 127.0.0.1 when bypass is enabled', async () => {
    const req = makeRequest('127.0.0.1');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.token).toBe('test-dev-token-abc');
  });

  it('returns token for ::1 (IPv6 loopback) when bypass is enabled', async () => {
    const req = makeRequest('[::1]');
    // NextRequest parses [::1] as hostname ::1
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.token).toBe('test-dev-token-abc');
  });

  it('returns 404 when SANDBOX_AUTH_BYPASS is not "true"', async () => {
    process.env.SANDBOX_AUTH_BYPASS = 'false';

    const req = makeRequest('localhost');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe('NOT_FOUND');
  });

  it('returns 404 when SANDBOX_AUTH_BYPASS is unset', async () => {
    delete process.env.SANDBOX_AUTH_BYPASS;

    const req = makeRequest('localhost');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe('NOT_FOUND');
  });

  it('returns 404 when hostname is not a loopback address', async () => {
    const req = makeRequest('example.com');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe('NOT_FOUND');
  });

  it('returns 404 when getSandboxDevToken returns undefined (e.g. production)', async () => {
    mockGetSandboxDevToken.mockReturnValue(undefined);

    const req = makeRequest('localhost');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.code).toBe('NOT_FOUND');
  });

  it('returns 500 and logs error when getSandboxDevToken throws', async () => {
    mockGetSandboxDevToken.mockImplementation(() => {
      throw new Error('Unexpected token resolution error');
    });

    const req = makeRequest('localhost');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Error fetching dev token',
      expect.objectContaining({ error: expect.any(Error) }),
    );
  });
});