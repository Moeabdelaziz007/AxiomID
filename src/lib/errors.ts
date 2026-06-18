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
 * Maps ErrorCode to the corresponding nostics diagnostic code.
 * Used by apiError to report structured diagnostics alongside HTTP responses.
 */
const DIAGNOSTIC_MAP: Record<ErrorCode, string> = {
  VALIDATION_ERROR: 'AXIOMID_E001',
  UNAUTHORIZED: 'AXIOMID_E010',
  FORBIDDEN: 'AXIOMID_E011',
  NOT_FOUND: 'AXIOMID_E012',
  RATE_LIMITED: 'AXIOMID_E013',
  CONFLICT: 'AXIOMID_E030',
  PI_AUTH_FAILED: 'AXIOMID_E020',
  PI_PAYMENT_FAILED: 'AXIOMID_E021',
  PAYMENT_VERIFICATION_FAILED: 'AXIOMID_E022',
  PAYMENT_MISMATCH: 'AXIOMID_E023',
  PAYMENT_INVALID: 'AXIOMID_E024',
  INTERNAL_ERROR: 'AXIOMID_E040',
};

const DIAGNOSTIC_PARAMS: Record<ErrorCode, (message: string) => Record<string, unknown>> = {
  VALIDATION_ERROR: (message) => ({ field: 'request', message, example: 'N/A' }),
  NOT_FOUND: (message) => ({ resource: message }),
  RATE_LIMITED: () => ({}),
  PI_AUTH_FAILED: (message) => ({ piError: message }),
  PI_PAYMENT_FAILED: (message) => ({ paymentId: 'unknown', piError: message }),
  PAYMENT_VERIFICATION_FAILED: (message) => ({ paymentId: 'unknown', piError: message }),
  PAYMENT_MISMATCH: (message) => ({ paymentId: 'unknown', piError: message }),
  PAYMENT_INVALID: (message) => ({ paymentId: 'unknown', piError: message }),
  INTERNAL_ERROR: (message) => ({ operation: 'unknown', error: message }),
  UNAUTHORIZED: (message) => ({ reason: message }),
  FORBIDDEN: (message) => ({ reason: message }),
  CONFLICT: (message) => ({ resource: message }),
};

export function apiError(code: ErrorCode, message: string, details?: unknown, headers?: Record<string, string>): NextResponse<ApiError> {
  const status = STATUS_MAP[code] ?? 500;

  // Report structured diagnostic via nostics (non-blocking)
  const diagCode = DIAGNOSTIC_MAP[code] as keyof typeof diagnostics;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (diagnostics as any)[diagCode](DIAGNOSTIC_PARAMS[code](message));
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
