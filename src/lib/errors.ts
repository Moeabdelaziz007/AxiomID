import { NextResponse } from 'next/server';
import { diagnostics } from '@/diagnostics/catalog';

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'CONFLICT'
  | 'PI_AUTH_FAILED'
  | 'PI_PAYMENT_FAILED'
  | 'PAYMENT_VERIFICATION_FAILED'
  | 'PAYMENT_MISMATCH'
  | 'PAYMENT_INVALID'
  | 'INTERNAL_ERROR';

interface ApiError {
  error: string;
  code: ErrorCode;
  details?: unknown;
}

const STATUS_MAP: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  CONFLICT: 409,
  PI_AUTH_FAILED: 401,
  PI_PAYMENT_FAILED: 402,
  PAYMENT_VERIFICATION_FAILED: 402,
  PAYMENT_MISMATCH: 402,
  PAYMENT_INVALID: 402,
  INTERNAL_ERROR: 500,
};

/**
 * Maps each ErrorCode directly to a function that fires the corresponding
 * nostics diagnostic. Collapsing the former DIAGNOSTIC_MAP + DIAGNOSTIC_PARAMS
 * pair into a single map eliminates the double-lookup and the `any` cast on
 * the diagnostics object.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const REPORT_DIAGNOSTIC: Record<ErrorCode, (message: string) => any> = {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  VALIDATION_ERROR:            (m) => (diagnostics as any).AXIOMID_E001({ field: 'request', message: m, example: 'N/A' }),
  UNAUTHORIZED:                (m) => (diagnostics as any).AXIOMID_E010({ reason: m }),
  FORBIDDEN:                   (m) => (diagnostics as any).AXIOMID_E011({ reason: m }),
  NOT_FOUND:                   (m) => (diagnostics as any).AXIOMID_E012({ resource: m }),
  RATE_LIMITED:                ()  => (diagnostics as any).AXIOMID_E013({}),
  CONFLICT:                    (m) => (diagnostics as any).AXIOMID_E030({ resource: m }),
  PI_AUTH_FAILED:              (m) => (diagnostics as any).AXIOMID_E020({ piError: m }),
  PI_PAYMENT_FAILED:           (m) => (diagnostics as any).AXIOMID_E021({ paymentId: 'unknown', piError: m }),
  PAYMENT_VERIFICATION_FAILED: (m) => (diagnostics as any).AXIOMID_E022({ paymentId: 'unknown', piError: m }),
  PAYMENT_MISMATCH:            (m) => (diagnostics as any).AXIOMID_E023({ paymentId: 'unknown', piError: m }),
  PAYMENT_INVALID:             (m) => (diagnostics as any).AXIOMID_E024({ paymentId: 'unknown', piError: m }),
  INTERNAL_ERROR:              (m) => (diagnostics as any).AXIOMID_E040({ operation: 'unknown', error: m }),
  /* eslint-enable @typescript-eslint/no-explicit-any */
};

export function apiError(code: ErrorCode, message: string, details?: unknown, headers?: Record<string, string>): NextResponse<ApiError> {
  const status = STATUS_MAP[code] ?? 500;

  // Report structured diagnostic via nostics (non-blocking, best-effort).
  try {
    // The fn may return a promise; swallow any rejection so it never surfaces
    // as an unhandled rejection and never breaks the response path.
    Promise.resolve(REPORT_DIAGNOSTIC[code](message)).catch(() => {});
  } catch {
    // Diagnostics are best-effort; never break the response path
  }

  return NextResponse.json({ error: message, code, details }, { status, headers });
}

export function apiSuccess<T>(data: T, status = 200, headers?: Record<string, string>): NextResponse<T> {
  return NextResponse.json(data, { status, headers });
}

/**
 * Build rate-limit headers from a RateLimitResult for inclusion in HTTP responses.
 */
export function rateLimitHeaders(result: { remaining: number; resetAt: number }): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  };
}
