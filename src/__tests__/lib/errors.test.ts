/**
 * @jest-environment node
 */
import { apiError, apiSuccess, rateLimitHeaders } from '@/lib/errors';

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

describe('apiError — new payment error codes (PR change)', () => {
  it('returns 402 for PAYMENT_VERIFICATION_FAILED', async () => {
    const res = apiError('PAYMENT_VERIFICATION_FAILED', 'Could not verify payment');
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.code).toBe('PAYMENT_VERIFICATION_FAILED');
    expect(body.error).toBe('Could not verify payment');
  });

  it('returns 402 for PAYMENT_MISMATCH', async () => {
    const res = apiError('PAYMENT_MISMATCH', 'Amount does not match');
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.code).toBe('PAYMENT_MISMATCH');
  });

  it('returns 402 for PAYMENT_INVALID', async () => {
    const res = apiError('PAYMENT_INVALID', 'Payment status invalid');
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.code).toBe('PAYMENT_INVALID');
  });

  it('all three new payment codes share the 402 status', () => {
    expect(apiError('PAYMENT_VERIFICATION_FAILED', '').status).toBe(402);
    expect(apiError('PAYMENT_MISMATCH', '').status).toBe(402);
    expect(apiError('PAYMENT_INVALID', '').status).toBe(402);
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

describe('apiError — DIAGNOSTIC_MAP coverage (new in this PR)', () => {
  it('returns correct status for FORBIDDEN', async () => {
    const res = apiError('FORBIDDEN', 'Access denied');
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('FORBIDDEN');
    expect(body.error).toBe('Access denied');
  });

  it('still returns a valid response when diagnostics are called (VALIDATION_ERROR path)', async () => {
    const res = apiError('VALIDATION_ERROR', 'field is required');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('field is required');
  });

  it('still returns a valid response when diagnostics are called (NOT_FOUND path)', async () => {
    const res = apiError('NOT_FOUND', 'user-123');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('user-123');
  });

  it('still returns a valid response when diagnostics are called (RATE_LIMITED path)', async () => {
    const res = apiError('RATE_LIMITED', 'Too many requests');
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe('Too many requests');
  });

  it('still returns a valid response when diagnostics are called (PI_AUTH_FAILED path)', async () => {
    const res = apiError('PI_AUTH_FAILED', 'token expired');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('token expired');
  });

  it('still returns a valid response when diagnostics are called (PI_PAYMENT_FAILED path)', async () => {
    const res = apiError('PI_PAYMENT_FAILED', 'payment rejected');
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.error).toBe('payment rejected');
  });

  it('still returns a valid response when diagnostics are called (INTERNAL_ERROR path)', async () => {
    const res = apiError('INTERNAL_ERROR', 'DB connection failed');
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('DB connection failed');
  });

  it('still returns a valid response when diagnostics are called (UNAUTHORIZED path)', async () => {
    const res = apiError('UNAUTHORIZED', 'not authenticated');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('not authenticated');
  });

  it('still returns a valid response when diagnostics are called (FORBIDDEN path)', async () => {
    const res = apiError('FORBIDDEN', 'insufficient scope');
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('insufficient scope');
  });

  it('still returns a valid response when diagnostics are called (CONFLICT path)', async () => {
    const res = apiError('CONFLICT', 'resource exists');
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('resource exists');
  });

  it('includes custom headers in the response', async () => {
    const customHeaders = { 'X-Custom-Header': 'custom-value', 'X-Request-Id': 'abc-123' };
    const res = apiError('INTERNAL_ERROR', 'oops', undefined, customHeaders);
    expect(res.status).toBe(500);
    expect(res.headers.get('X-Custom-Header')).toBe('custom-value');
    expect(res.headers.get('X-Request-Id')).toBe('abc-123');
  });

  it('returns null details when not provided', async () => {
    const res = apiError('NOT_FOUND', 'missing');
    const body = await res.json();
    // details is undefined/null when not passed
    expect(body.details).toBeUndefined();
  });

  it('response body always includes code field matching the ErrorCode', async () => {
    const codes = [
      'VALIDATION_ERROR', 'UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND',
      'RATE_LIMITED', 'CONFLICT', 'PI_AUTH_FAILED', 'PI_PAYMENT_FAILED', 'INTERNAL_ERROR',
    ] as const;
    for (const code of codes) {
      const res = apiError(code, 'test message');
      const body = await res.json();
      expect(body.code).toBe(code);
    }
  });
});

describe('rateLimitHeaders', () => {
  it('returns X-RateLimit-Remaining header as string', () => {
    const result = rateLimitHeaders({ remaining: 42, resetAt: 1700000000000 });
    expect(result['X-RateLimit-Remaining']).toBe('42');
  });

  it('returns X-RateLimit-Reset header as ceil of resetAt/1000', () => {
    const result = rateLimitHeaders({ remaining: 10, resetAt: 1700000000500 });
    expect(result['X-RateLimit-Reset']).toBe(String(Math.ceil(1700000000500 / 1000)));
  });

  it('handles resetAt that is already a round second', () => {
    const result = rateLimitHeaders({ remaining: 0, resetAt: 1700000001000 });
    expect(result['X-RateLimit-Reset']).toBe('1700000001');
  });

  it('handles remaining = 0', () => {
    const result = rateLimitHeaders({ remaining: 0, resetAt: 9999999999000 });
    expect(result['X-RateLimit-Remaining']).toBe('0');
  });

  it('returns an object with exactly two header keys', () => {
    const result = rateLimitHeaders({ remaining: 5, resetAt: 1000 });
    expect(Object.keys(result)).toHaveLength(2);
    expect(Object.keys(result)).toContain('X-RateLimit-Remaining');
    expect(Object.keys(result)).toContain('X-RateLimit-Reset');
  });

  it('rate limit headers can be used in apiError via headers param', async () => {
    const headers = rateLimitHeaders({ remaining: 0, resetAt: 1700000060000 });
    const res = apiError('RATE_LIMITED', 'Too many requests', undefined, headers);
    expect(res.status).toBe(429);
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(res.headers.get('X-RateLimit-Reset')).toBe(String(Math.ceil(1700000060000 / 1000)));
  });
});
