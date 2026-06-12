import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { requireAuth } from '@/lib/auth-middleware';
import { safeJsonStringify } from '@/lib/sanitize';

interface AgentMainBody {
  action: string;
  params?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`agent-main:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many requests. Try again later.');
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;
  const { user } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('VALIDATION_ERROR', 'Invalid JSON body');
  }

    const { action, params } = body as AgentMainBody;
    if (!action || typeof action !== "string") {
      return apiError("VALIDATION_ERROR", "action is required");
    }

    // Sanitize: alphanumeric + underscore/hyphen only, max 100 chars
    const sanitizedAction = action.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100);
    if (sanitizedAction.length === 0) {
      return apiError("VALIDATION_ERROR", "action contains no valid characters");
    }

  try {
    const agent = await prisma.userAgent.findUnique({ where: { userId: user.id } });
    if (!agent) {
      return apiError('NOT_FOUND', 'No agent found. Create one via POST /api/agent');
    }

    if (agent.status !== 'ACTIVE') {
      return apiError('FORBIDDEN', 'Agent is not active. Activate via POST /api/agent/activate');
    }

    const updatedAgent = await prisma.userAgent.update({
      where: { id: agent.id },
      data: { lastActive: new Date() },
    });

    await prisma.agentLog.create({
      data: {
        userId: user.id,
        agentId: agent.id,
        level: 'info',
        source: 'agent',
        message: `Executed action: ${sanitizedAction}`,
        metadata: safeJsonStringify(params),
      },
    });

    return apiSuccess({
      agentId: agent.id,
      publicId: agent.publicId,
      status: updatedAgent.status,
      action: sanitizedAction,
      result: `Action '${sanitizedAction}' dispatched to agent '${agent.name}'`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[AGENT-MAIN] Database error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to execute agent action');
  }
}
