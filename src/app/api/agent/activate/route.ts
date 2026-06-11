import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { requireAuth } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`agent-activate:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many requests. Try again later.');
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    const agent = await prisma.userAgent.findUnique({ where: { userId: user.id } });
    if (!agent) {
      return apiError('NOT_FOUND', 'No agent found for this user. Create one first via POST /api/agent');
    }

    if (agent.status === 'ACTIVE') {
      return apiError('CONFLICT', 'Agent is already active');
    }

    const updated = await prisma.userAgent.update({
      where: { id: agent.id },
      data: {
        status: 'ACTIVE',
        lastActive: new Date(),
        lastHeartbeat: new Date(),
      },
    });

    return apiSuccess({
      agentId: updated.id,
      publicId: updated.publicId,
      status: updated.status,
    });
  } catch (error) {
    console.error('[AGENT-ACTIVATE] Database error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to activate agent');
  }
}
