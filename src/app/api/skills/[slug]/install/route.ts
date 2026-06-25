import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, rateLimitHeaders } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { requireAuth } from '@/lib/auth-middleware';

/**
 * Installs a published skill into the authenticated user's agent.
 *
 * @param request - The incoming request
 * @param params - Promise resolving to the route parameters
 * @returns A response containing the installation status and skill details
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`skill-install:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many requests. Try again later.', undefined, rateLimitHeaders(rateLimit));
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    const skill = await prisma.skill.findUnique({ where: { slug } });
    if (!skill) {
      return apiError('NOT_FOUND', `Skill "${slug}" not found`);
    }
    if (!skill.isPublished || skill.status !== 'PUBLISHED') {
      return apiError('FORBIDDEN', 'Skill is not available for installation');
    }

    if (skill.pricePi > 0) {
      const payments = await prisma.piPayment.findMany({
        where: {
          userId: user.id,
          status: { in: ['RELEASED', 'ESCROWED'] },
        },
      });

      let hasPaid = false;
      for (const p of payments) {
        let skillIdFromMeta: string | undefined;
        try {
          const meta = JSON.parse(p.metadata || '{}');
          skillIdFromMeta = meta.skillId;
        } catch {
          // Ignore JSON parsing errors
        }

        if (
          skillIdFromMeta === skill.id ||
          p.memo?.includes(skill.name) ||
          p.memo?.includes(skill.slug)
        ) {
          hasPaid = true;
          break;
        }
      }

      if (!hasPaid) {
        return apiError('FORBIDDEN', 'Payment required for this skill. Please purchase first.');
      }
    }

    const agent = await prisma.userAgent.findUnique({ where: { userId: user.id } });
    if (!agent) {
      return apiError('NOT_FOUND', 'No agent found. Create one first via POST /api/agent');
    }

    const existingInstallation = await prisma.skillInstallation.findFirst({
      where: {
        skillId: skill.id,
        agentId: agent.id,
      },
    });

    if (existingInstallation) {
      if (existingInstallation.status === 'active') {
        return apiError('CONFLICT', 'Skill is already installed');
      }
      await prisma.skillInstallation.update({
        where: { id: existingInstallation.id },
        data: { status: 'active', installedAt: new Date() },
      });
    } else {
      await prisma.skillInstallation.create({
        data: {
          skillId: skill.id,
          agentId: agent.id,
          status: 'active',
        },
      });
    }

    await prisma.skill.update({
      where: { slug },
      data: { installCount: { increment: 1 } },
    });

    return apiSuccess({
      installed: true,
      skillSlug: skill.slug,
      skillName: skill.name,
      agentId: agent.id,
      agentName: agent.name,
      version: skill.version,
      tier: skill.tier,
    });
  } catch (error) {
    logger.error('[SKILL-INSTALL] Database error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to install skill');
  }
}

/**
 * DELETE /api/skills/[slug]/install — Uninstall a skill from the authenticated user's agent.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`skill-uninstall:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many requests. Try again later.', undefined, rateLimitHeaders(rateLimit));
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    const skill = await prisma.skill.findUnique({ where: { slug } });
    if (!skill) {
      return apiError('NOT_FOUND', `Skill "${slug}" not found`);
    }

    const agent = await prisma.userAgent.findUnique({ where: { userId: user.id } });
    if (!agent) {
      return apiError('NOT_FOUND', 'No agent found');
    }

    const installation = await prisma.skillInstallation.findFirst({
      where: {
        skillId: skill.id,
        agentId: agent.id,
      },
    });

    if (!installation) {
      return apiError('NOT_FOUND', 'Skill is not installed');
    }

    await prisma.skillInstallation.delete({ where: { id: installation.id } });

    await prisma.skill.update({
      where: { slug },
      data: { installCount: { decrement: 1 } },
    });

    return apiSuccess({
      uninstalled: true,
      skillSlug: skill.slug,
      agentId: agent.id,
    });
  } catch (error) {
    logger.error('[SKILL-UNINSTALL] Database error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to uninstall skill');
  }
}
