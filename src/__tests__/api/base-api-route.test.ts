/**
 * @jest-environment node
 */

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock apiSuccess so we can force it to throw for the error-path test
jest.mock('@/lib/errors', () => {
  const actual = jest.requireActual('@/lib/errors');
  return { ...actual };
});

import { GET } from '@/app/api/route';
import { logger } from '@/lib/logger';
import * as errors from '@/lib/errors';

const mockLoggerError = logger.error as jest.Mock;

describe('GET /api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 with API info on success', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('AxiomID API');
    expect(data.version).toBe('1.0.0');
  });

  it('returns all required endpoint keys', async () => {
    const res = await GET();
    const data = await res.json();
    const endpoints = data.endpoints;
    expect(endpoints.did).toBe('/api/did-document');
    expect(endpoints.identity).toBe('/api/agent/identity');
    expect(endpoints.sign).toBe('/api/agent/sign');
    expect(endpoints.manifest).toBe('/api/agent/manifest');
    expect(endpoints.skills).toBe('/api/skills');
    expect(endpoints.tags).toBe('/api/skills/tags');
    expect(endpoints.token).toBe('/api/oauth2/token');
    expect(endpoints.revoke).toBe('/api/oauth2/revoke');
    expect(endpoints.status).toBe('/api/status');
  });

  it('returns discovery endpoints', async () => {
    const res = await GET();
    const data = await res.json();
    expect(data.discovery.jwks).toBe('/.well-known/jwks.json');
    expect(data.discovery.auth_md).toBe('/auth.md');
  });

  it('sets Cache-Control header for CDN caching', async () => {
    const res = await GET();
    const cacheControl = res.headers.get('Cache-Control');
    expect(cacheControl).toContain('max-age=3600');
    expect(cacheControl).toContain('stale-while-revalidate=86400');
  });

  it('returns 500 and logs error when apiSuccess throws unexpectedly', async () => {
    jest.spyOn(errors, 'apiSuccess').mockImplementationOnce(() => {
      throw new Error('Serialization failure');
    });

    const res = await GET();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error).toBe('Internal Server Error');
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Error in base API route',
      expect.objectContaining({ error: expect.any(Error) }),
    );
  });
});