/**
 * @jest-environment node
 */
import { apiError, apiSuccess } from '@/lib/errors';

describe('apiError', () => {
  it('returns correct status for VALIDATION_ERROR', async () => {
    const res = apiError('VALIDATION_ERROR', 'Bad input');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.error).toBe('Bad input');
  });

  it('returns correct status for UNAUTHORIZED', async () => {
    const res = apiError('UNAUTHORIZED', 'Not logged in');
    expect(res.status).toBe(401);
  });

  it('returns correct status for RATE_LIMITED', async () => {
    const res = apiError('RATE_LIMITED', 'Slow down');
    expect(res.status).toBe(429);
  });

  it('returns correct status for NOT_FOUND', async () => {
    const res = apiError('NOT_FOUND', 'User missing');
    expect(res.status).toBe(404);
  });

  it('returns correct status for CONFLICT', async () => {
    const res = apiError('CONFLICT', 'Already claimed');
    expect(res.status).toBe(409);
  });

  it('returns correct status for PI_AUTH_FAILED', async () => {
    const res = apiError('PI_AUTH_FAILED', 'Token bad');
    expect(res.status).toBe(401);
  });

  it('returns correct status for PI_PAYMENT_FAILED', async () => {
    const res = apiError('PI_PAYMENT_FAILED', 'Payment failed');
    expect(res.status).toBe(402);
  });

  it('returns correct status for INTERNAL_ERROR', async () => {
    const res = apiError('INTERNAL_ERROR', 'Something broke');
    expect(res.status).toBe(500);
  });

  it('includes details when provided', async () => {
    const details = [{ field: 'email', message: 'required' }];
    const res = apiError('VALIDATION_ERROR', 'Invalid', details);
    const body = await res.json();
    expect(body.details).toEqual(details);
  });
});

describe('apiSuccess', () => {
  it('returns 200 by default', async () => {
    const res = apiSuccess({ id: 1, name: 'test' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(1);
    expect(body.name).toBe('test');
  });

  it('returns custom status code', async () => {
    const res = apiSuccess({ created: true }, 201);
    expect(res.status).toBe(201);
  });
});

// ── New tests covering PR changes ──────────────────────────────────────────

import { rateLimitHeaders } from '@/lib/errors';

describe('apiError — headers parameter (new in PR)', () => {
  it('passes custom headers to the response', async () => {
    const res = apiError('RATE_LIMITED', 'Slow down', undefined, {
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': '1700000000',
    });
    expect(res.status).toBe(429);
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(res.headers.get('X-RateLimit-Reset')).toBe('1700000000');
  });

  it('omits headers when not provided (backwards compatibility)', async () => {
    const res = apiError('NOT_FOUND', 'Missing');
    expect(res.status).toBe(404);
    // Should not throw — header access is safe even if header is absent
    expect(res.headers.get('X-RateLimit-Remaining')).toBeNull();
  });

  it('still includes error body when headers are provided', async () => {
    const res = apiError('UNAUTHORIZED', 'Not logged in', undefined, { 'X-Custom': 'yes' });
    const body = await res.json();
    expect(body.error).toBe('Not logged in');
    expect(body.code).toBe('UNAUTHORIZED');
  });
});

describe('apiSuccess — headers parameter (new in PR)', () => {
  it('passes custom headers to the response', async () => {
    const res = apiSuccess({ ok: true }, 200, { 'X-Custom-Header': 'value123' });
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Custom-Header')).toBe('value123');
  });

  it('returns correct body when headers provided', async () => {
    const res = apiSuccess({ result: 'done' }, 201, { 'X-Trace': 'abc' });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.result).toBe('done');
  });

  it('omits headers param — backwards compatible', async () => {
    const res = apiSuccess({ id: 99 });
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Custom-Header')).toBeNull();
  });
});

describe('rateLimitHeaders (new in PR)', () => {
  it('returns X-RateLimit-Remaining as string', () => {
    const headers = rateLimitHeaders({ remaining: 42, resetAt: 1700000000000 });
    expect(headers['X-RateLimit-Remaining']).toBe('42');
  });

  it('converts resetAt from milliseconds to seconds (ceil)', () => {
    // 1700000000500ms → ceil(1700000000500 / 1000) = 1700000001
    const headers = rateLimitHeaders({ remaining: 5, resetAt: 1700000000500 });
    expect(headers['X-RateLimit-Reset']).toBe('1700000001');
  });

  it('uses Math.ceil for the seconds conversion', () => {
    // Exact milliseconds → no ceiling needed
    const headers = rateLimitHeaders({ remaining: 0, resetAt: 1700000000000 });
    expect(headers['X-RateLimit-Reset']).toBe('1700000000');
  });

  it('returns a plain object with exactly two string keys', () => {
    const headers = rateLimitHeaders({ remaining: 10, resetAt: 9000 });
    expect(Object.keys(headers)).toHaveLength(2);
    expect(typeof headers['X-RateLimit-Remaining']).toBe('string');
    expect(typeof headers['X-RateLimit-Reset']).toBe('string');
  });

  it('handles remaining = 0 (rate-limited case)', () => {
    const headers = rateLimitHeaders({ remaining: 0, resetAt: 1700001234000 });
    expect(headers['X-RateLimit-Remaining']).toBe('0');
    expect(headers['X-RateLimit-Reset']).toBe('1700001234');
  });
});
