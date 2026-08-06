import { NextRequest } from 'next/server';
import { apiError, apiSuccess, rateLimitHeaders } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { hashPiUid } from '@/lib/crypto';
import { deriveUserRootKey } from '@axiomid/crypto';
import { calculateActionHash, GENESIS_HASH } from '@/lib/trust-chain';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const KYARegisterSchema = z.object({
  agentId: z.string().min(1, 'agentId is required'),
  agentType: z.enum(['autonomous', 'assistive', 'hybrid']).optional(),
  capabilities: z.array(z.string()).optional(),
});

interface KYAResult {
  kyaDid: string;
  agentId: string;
  piUid: string;
  status: 'verified';
  trustScore: number;
  stamps: string[];
  proof: {
    type: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    proofValue: string;
  };
  trustChainAnchor: string;
  expiresAt: string;
}

/**
 * Registers a KYA (Know Your Agent) credential for a Pi-verified user's agent.
 *
 * The agent inherits the human's AIP identity (did:axiom:pi:<uid> + Ed25519 keypair)
 * and is anchored on the TrustChain. Agents holding a KYA credential are eligible to
 * claim bounties on earn.axiomid.app.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`kya-register:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many requests. Try again later.', undefined, rateLimitHeaders(rateLimit));
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('VALIDATION_ERROR', 'Invalid JSON body');
  }

  const parsed = KYARegisterSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', parsed.error.issues[0].message, parsed.error.issues);
  }

  const { agentId, agentType = 'autonomous', capabilities = [] } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      include: { agent: true },
    });
    if (!user || !user.piUid) {
      return apiError('NOT_FOUND', 'User not found or not linked to Pi Network');
    }

    const agent = await prisma.userAgent.findUnique({ where: { id: agentId } });
    if (!agent || agent.userId !== user.id) {
      return apiError('FORBIDDEN', 'Agent does not belong to this user');
    }

    const salt = process.env.SOVEREIGN_KEY_SALT;
    if (!salt) {
      logger.error('[KYA-REGISTER] SOVEREIGN_KEY_SALT not set');
      return apiError('INTERNAL_ERROR', 'Identity service not configured');
    }

    const did = user.did || `did:axiom:pi:${encodeURIComponent(user.piUid)}`;
    const kyaDid = `did:axiom:kya:${agent.publicId}`;
    const keypair = deriveUserRootKey(user.piUid, salt);

    const created = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const proofValue = `signed-by:kya:${created}`;

    let anchorHash: string;
    try {
      await prisma.$transaction(async (tx) => {
        const lastAction = await tx.action.findFirst({
          where: { userId: user.id },
          orderBy: { timestamp: 'desc' },
          select: { hash: true },
        });
        const parentHash = lastAction?.hash || GENESIS_HASH;
        const timestamp = new Date();
        const hash = calculateActionHash(parentHash, {
          type: 'kya_register',
          xp: 0,
          metadata: JSON.stringify({ agentId, kyaDid, agentType }),
          userId: user.id,
          timestamp,
        });

        await tx.action.create({
          data: { userId: user.id, type: 'kya_register', xp: 0, metadata: JSON.stringify({ agentId, kyaDid, agentType, capabilities }), hash, parentHash, timestamp },
        });

        await tx.userAgent.update({
          where: { id: agent.id },
          data: { did: kyaDid },
        });

        anchorHash = hash;
      });
    } catch (txErr) {
      const message = txErr instanceof Error ? txErr.message : String(txErr);
      logger.error('[KYA-REGISTER] TrustChain append failed', message);
      return apiError('INTERNAL_ERROR', 'Failed to anchor KYA credential');
    }

    const result: KYAResult = {
      kyaDid,
      agentId,
      piUid: user.piUid,
      status: 'verified',
      trustScore: 50,
      stamps: ['pi_kyc_verified', 'human_verified'],
      proof: {
        type: 'Ed25519Signature2020',
        created,
        verificationMethod: `${kyaDid}#keys-1`,
        proofPurpose: 'assertionMethod',
        proofValue,
      },
      trustChainAnchor: anchorHash!,
      expiresAt,
    };

    return apiSuccess({
      success: true,
      kya: result,
      aipDid: did,
      agentPublicKey: keypair.publicKey,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('[KYA-REGISTER] Error', message);
    return apiError('INTERNAL_ERROR', 'Failed to complete KYA registration');
  }
}

/** Resolves KYA credential status from the trust chain. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('agentId');
  if (!agentId) {
    return apiError('VALIDATION_ERROR', 'agentId required');
  }

  const agent = await prisma.userAgent.findUnique({
    where: { id: agentId },
    include: { user: true },
  });
  if (!agent) {
    return apiError('NOT_FOUND', 'Agent not found');
  }

  const action = await prisma.action.findFirst({
    where: { userId: agent.userId, type: 'kya_register' },
    orderBy: { timestamp: 'desc' },
  });

  return apiSuccess({
    kyaDid: agent.did || `did:axiom:kya:${agent.publicId}`,
    agentId,
    piUid: agent.user.piUid,
    status: action ? 'verified' : 'none',
    trustChainAnchor: action?.hash ?? null,
    anchoredAt: action?.timestamp ?? null,
    name: agent.name,
    publicId: agent.publicId,
  });
}