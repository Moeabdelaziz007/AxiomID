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

    // For paid skills, find an unconsumed RELEASED payment for this skill that
    // covers its price. The matched payment is marked consumed inside the
    // install transaction below so it cannot be reused to reinstall for free.
    let consumablePaymentId: string | null = null;
    if (skill.pricePi > 0) {
      const payments = await prisma.piPayment.findMany({
        where: {
          userId: user.id,
          status: 'RELEASED',
          consumedByInstallationId: null,
        },
      });

      for (const p of payments) {
        let skillIdFromMeta: string | undefined;
        try {
          const meta = JSON.parse(p.metadata || '{}');
          skillIdFromMeta = meta.skillId;
        } catch {
          // Ignore JSON parsing errors
        }

        // Authorize only when the payment is for this skill AND covers its price.
        if (skillIdFromMeta === skill.id && p.amount >= skill.pricePi) {
          consumablePaymentId = p.id;
          break;
        }
      }

      if (!consumablePaymentId) {
        return apiError('PAYMENT_INVALID', 'Purchase required before installing this skill');
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
      await prisma.$transaction(async (tx) => {
        await tx.skillInstallation.update({
          where: { id: existingInstallation.id },
          data: { status: 'active', installedAt: new Date() },
        });
        await tx.skill.update({
          where: { slug },
          data: { installCount: { increment: 1 } },
        });
        if (consumablePaymentId) {
          // Atomically claim the payment: only succeeds if it is still
          // unconsumed. Guards against a TOCTOU race where two concurrent
          // installs select the same RELEASED payment before either consumes
          // it. A zero-row result means another request won — roll back.
          const claimed = await tx.piPayment.updateMany({
            where: { id: consumablePaymentId, consumedByInstallationId: null },
            data: { consumedByInstallationId: existingInstallation.id },
          });
          if (claimed.count !== 1) {
            throw new Error('PAYMENT_ALREADY_CONSUMED');
          }
        }
      });
    } else {
      await prisma.$transaction(async (tx) => {
        const created = await tx.skillInstallation.create({
          data: {
            skillId: skill.id,
            agentId: agent.id,
            status: 'active',
          },
        });
        await tx.skill.update({
          where: { slug },
          data: { installCount: { increment: 1 } },
        });
        if (consumablePaymentId) {
          // Atomically claim the payment: only succeeds if it is still
          // unconsumed. Guards against a TOCTOU race where two concurrent
          // installs select the same RELEASED payment before either consumes
          // it. A zero-row result means another request won — roll back.
          const claimed = await tx.piPayment.updateMany({
            where: { id: consumablePaymentId, consumedByInstallationId: null },
            data: { consumedByInstallationId: created.id },
          });
          if (claimed.count !== 1) {
            throw new Error('PAYMENT_ALREADY_CONSUMED');
          }
        }
      });
    }

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
    if (error instanceof Error && error.message === 'PAYMENT_ALREADY_CONSUMED') {
      return apiError('CONFLICT', 'Payment already consumed');
    }
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

    await prisma.$transaction([
      prisma.skillInstallation.delete({ where: { id: installation.id } }),
      prisma.skill.update({
        where: { slug },
        data: { installCount: { decrement: 1 } },
      }),
    ]);

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
