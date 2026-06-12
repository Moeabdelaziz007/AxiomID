import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { requireAuth } from '@/lib/auth-middleware';
import { z } from 'zod';

const AgentCreateSchema = z.object({
  name: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
});

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

  const parsed = AgentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', parsed.error.issues[0].message, parsed.error.issues);
  }

  const { name, description } = parsed.data;

  // Sanitize: strip HTML, enforce length limits
  const sanitizedName = (name ?? 'My Agent')
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, 100) || 'My Agent';
  const sanitizedDesc = description
    ? description.replace(/<[^>]*>/g, '').trim().slice(0, 500)
    : null;

  try {
    const existing = await prisma.userAgent.findUnique({ where: { userId: user.id } });
    if (existing) {
      return apiError('CONFLICT', 'User already has an agent');
    }

    const agent = await prisma.userAgent.create({
      data: {
        userId: user.id,
        name: sanitizedName,
        description: sanitizedDesc,
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
    logger.error('[AGENT-CREATE] Database error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to create agent');
  }
}
