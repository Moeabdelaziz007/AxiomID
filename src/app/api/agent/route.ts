import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { requireAuth } from '@/lib/auth-middleware';

interface CreateAgentBody {
  name?: string;
  description?: string;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`agent-create:${ip}`, RATE_LIMITS.authenticated);
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

  const { name, description } = body as CreateAgentBody;

  try {
    const existing = await prisma.userAgent.findUnique({ where: { userId: user.id } });
    if (existing) {
      return apiError('CONFLICT', 'User already has an agent');
    }

    const agent = await prisma.userAgent.create({
      data: {
        userId: user.id,
        name: name ?? 'My Agent',
        description: description ?? null,
        status: 'INACTIVE',
        mode: 'AUTONOMOUS',
      },
    });

    return apiSuccess({
      agentId: agent.id,
      publicId: agent.publicId,
      name: agent.name,
      status: agent.status,
    }, 201);
  } catch (error) {
    console.error('[AGENT-CREATE] Database error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to create agent');
  }
}
