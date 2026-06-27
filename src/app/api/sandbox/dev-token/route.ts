import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/errors';
import { getSandboxDevToken } from '@/lib/sandbox-token';

/**
 * GET /api/sandbox/dev-token — Returns the sandbox dev token for local development.
 *
 * SECURITY: This endpoint mirrors the gating in auth-middleware.ts. It only returns
 * a token when ALL of the following hold:
 *   - NODE_ENV is not "production" (getSandboxDevToken() returns undefined in prod),
 *   - SANDBOX_AUTH_BYPASS === "true",
 *   - the request originates from a loopback host (localhost/127.0.0.1/::1).
 * Otherwise it responds 404 so the endpoint is indistinguishable from "not present"
 * in environments where the bypass is disabled.
 *
 * @param request - The incoming request
 * @returns The sandbox dev token wrapped in the standard success envelope, or a 404 error.
 */
export async function GET(request: NextRequest) {
  const hostname = request.nextUrl.hostname;
  const isLoopbackHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1';

  const bypassEnabled = process.env.SANDBOX_AUTH_BYPASS === 'true' && isLoopbackHost;
  const token = getSandboxDevToken();

  if (!bypassEnabled || !token) {
    return apiError('NOT_FOUND', 'Sandbox dev token endpoint is not available');
  }

  return apiSuccess({ token });
}
