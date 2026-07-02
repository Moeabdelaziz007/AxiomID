import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, rateLimitHeaders } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { SlugParamSchema } from '@/lib/validators';

/**
 * POST /api/skills/[slug]/execute — Record a skill execution and update stats.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const parsedParams = SlugParamSchema.safeParse({ slug });
  if (!parsedParams.success) {
    return apiError('VALIDATION_ERROR', parsedParams.error.issues[0].message, parsedParams.error.issues);
  }

  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`skill-execute:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many requests. Try again later.', undefined, rateLimitHeaders(rateLimit));
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('VALIDATION_ERROR', 'Invalid JSON body');
  }

  const { success, input, output, durationMs, errorMessage } = body as {
    success?: boolean;
    input?: unknown;
    output?: unknown;
    durationMs?: number;
    errorMessage?: string;
  };

  try {
    const skill = await prisma.skill.findUnique({ where: { slug } });
    if (!skill) {
      return apiError('NOT_FOUND', `Skill "${slug}" not found`);
    }

    const execution = await prisma.skillExecution.create({
      data: {
        skillId: skill.id,
        success: success !== false,
        input: input ?? undefined,
        output: output ?? undefined,
        durationMs: typeof durationMs === 'number' ? durationMs : undefined,
        errorMessage: errorMessage || undefined,
      },
    });

    return apiSuccess({
      executionId: execution.id,
      success: execution.success,
    }, 201);
  } catch (error) {
    logger.error('[SKILL-EXECUTE] Database error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to record execution');
  }
}
