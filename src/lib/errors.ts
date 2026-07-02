import { NextResponse } from 'next/server';
import { diagnostics } from '@/diagnostics/catalog';

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'CONFLICT'
  | 'INCOMPLETE_MANIFEST'
  | 'PI_AUTH_FAILED'
  | 'PI_PAYMENT_FAILED'
  | 'PAYMENT_VERIFICATION_FAILED'
  | 'PAYMENT_MISMATCH'
  | 'PAYMENT_INVALID'
  | 'INTERNAL_ERROR'
  | 'INVALID_ID_JAG'
  | 'CLAIM_EXPIRED'
  | 'CLAIM_NOT_FOUND'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_REVOKED'
  | 'INVALID_GRANT'
  | 'UNSUPPORTED_GRANT_TYPE';

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
  INCOMPLETE_MANIFEST: 422,
  PI_AUTH_FAILED: 401,
  PI_PAYMENT_FAILED: 402,
  PAYMENT_VERIFICATION_FAILED: 402,
  PAYMENT_MISMATCH: 402,
  PAYMENT_INVALID: 402,
  INTERNAL_ERROR: 500,
  INVALID_ID_JAG: 401,
  CLAIM_EXPIRED: 410,
  CLAIM_NOT_FOUND: 404,
  TOKEN_EXPIRED: 401,
  TOKEN_REVOKED: 401,
  INVALID_GRANT: 400,
  UNSUPPORTED_GRANT_TYPE: 400,
};

/**
 * Maps each ErrorCode directly to a function that fires the corresponding
 * nostics diagnostic. Collapsing the former DIAGNOSTIC_MAP + DIAGNOSTIC_PARAMS
 * pair into a single map eliminates the double-lookup and the `any` cast on
 * the diagnostics object.
 */
// nostics TS 5.9+ doesn't infer per-code params from defineDiagnostics generic;
// cast each call since the params match the catalog definitions.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const REPORT_DIAGNOSTIC: Record<ErrorCode, (message: string) => any> = {
  VALIDATION_ERROR:            (m) => diagnostics.AXIOMID_E001({ field: 'request', message: m }),
  UNAUTHORIZED:                (m) => diagnostics.AXIOMID_E010({ reason: m }),
  FORBIDDEN:                   (m) => diagnostics.AXIOMID_E011({ reason: m }),
  NOT_FOUND:                   (m) => diagnostics.AXIOMID_E012({ resource: m }),
  RATE_LIMITED:                ()  => diagnostics.AXIOMID_E013({}),
  CONFLICT:                    (m) => diagnostics.AXIOMID_E030({ resource: m }),
  INCOMPLETE_MANIFEST:         (m) => diagnostics.AXIOMID_E050({ skill: m }),
  PI_AUTH_FAILED:              (m) => diagnostics.AXIOMID_E020({ piError: m }),
  PI_PAYMENT_FAILED:           (m) => diagnostics.AXIOMID_E021({ paymentId: 'unknown', piError: m }),
  PAYMENT_VERIFICATION_FAILED: (m) => diagnostics.AXIOMID_E022({ paymentId: 'unknown', piError: m }),
  PAYMENT_MISMATCH:            (m) => diagnostics.AXIOMID_E023({ paymentId: 'unknown', piError: m }),
  PAYMENT_INVALID:             (m) => diagnostics.AXIOMID_E024({ paymentId: 'unknown', piError: m }),
  INTERNAL_ERROR:              (m) => diagnostics.AXIOMID_E040({ operation: 'unknown', error: m }),
  INVALID_ID_JAG:              (m) => diagnostics.AXIOMID_E001({ field: 'id_jag', message: m }),
  CLAIM_EXPIRED:               (m) => diagnostics.AXIOMID_E001({ field: 'claim', message: m }),
  CLAIM_NOT_FOUND:             (m) => diagnostics.AXIOMID_E001({ field: 'claim', message: m }),
  TOKEN_EXPIRED:               (m) => diagnostics.AXIOMID_E001({ field: 'token', message: m }),
  TOKEN_REVOKED:               (m) => diagnostics.AXIOMID_E001({ field: 'token', message: m }),
  INVALID_GRANT:               (m) => diagnostics.AXIOMID_E001({ field: 'grant', message: m }),
  UNSUPPORTED_GRANT_TYPE:      (m) => diagnostics.AXIOMID_E001({ field: 'grant_type', message: m }),
};

/**
 * Constructs an API error response.
 *
 * @param code - The error code category
 * @param message - The error message
 * @param details - Additional error context
 * @param headers - Response headers
 * @returns A response containing the error with an appropriate HTTP status code
 */
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
