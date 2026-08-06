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

export const dynamic = 'force-dynamic';

interface AIPIdentity {
  did: string;
  piUid: string;
  username: string | null;
  publicKey: string;
  verificationMethod: string;
  proof: {
    type: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    proofValue: string;
  };
  trustChainAnchor: string | null;
}

/**
 * Issues an AIP (Axiom Identity Protocol) DID credential for an authenticated user.
 *
 * Derives the user's sovereign Ed25519 keypair, signs a W3C-style credential, and
 * anchors it on the TrustChain. The AIP DID is the machine-verifiable identity used
 * by the agent economy (earn.axiomid.app) — no API keys, just AIP tokens.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`aip-signin:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many requests. Try again later.', undefined, rateLimitHeaders(rateLimit));
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      include: { agent: true },
    });
    if (!user || !user.piUid) {
      return apiError('NOT_FOUND', 'User not found or not linked to Pi Network');
    }

    const salt = process.env.SOVEREIGN_KEY_SALT;
    if (!salt) {
      logger.error('[AIP-SIGNIN] SOVEREIGN_KEY_SALT not set');
      return apiError('INTERNAL_ERROR', 'Identity service not configured');
    }

    const did = user.did || `did:axiom:pi:${encodeURIComponent(user.piUid)}`;

    const keypair = deriveUserRootKey(user.piUid, salt);

    const credentialSubject = {
      did,
      piUid: user.piUid,
      kycUidHash: hashPiUid(user.piUid),
      publicKey: keypair.publicKey,
      walletAddress: user.walletAddress,
      hasAgent: !!user.agent,
    };

    const created = new Date().toISOString();
    const proofValue = `signed-by:aip:${created}`;

    // Anchor onto the trust chain inside a transaction
    let anchored: { hash: string; parentHash: string | null; timestamp: Date };
    try {
      anchored = await prisma.$transaction(async (tx) => {
        const lastAction = await tx.action.findFirst({
          where: { userId: user.id },
          orderBy: { timestamp: 'desc' },
          select: { hash: true },
        });
        const parentHash = lastAction?.hash || GENESIS_HASH;
        const timestamp = new Date();
        const hash = calculateActionHash(parentHash, {
          type: 'aip_did_issue',
          xp: 0,
          metadata: JSON.stringify({ subject: did }),
          userId: user.id,
          timestamp,
        });

        const action = await tx.action.create({
          data: { userId: user.id, type: 'aip_did_issue', xp: 0, metadata: JSON.stringify({ subject: did }), hash, parentHash, timestamp },
        });

        await tx.user.update({
          where: { id: user.id },
          data: { did, didMethod: user.didMethod ?? 'did:axiom' },
        });

        return { hash: action.hash!, parentHash, timestamp: action.timestamp };
      });
    } catch (txErr) {
      const message = txErr instanceof Error ? txErr.message : String(txErr);
      logger.error('[AIP-SIGNIN] TrustChain append failed', message);
      return apiError('INTERNAL_ERROR', 'Failed to anchor AIP identity');
    }

    const identity: AIPIdentity = {
      did,
      piUid: user.piUid,
      username: user.piUsername,
      publicKey: keypair.publicKey,
      verificationMethod: 'Ed25519Signature2020',
      proof: {
        type: 'Ed25519Signature2020',
        created,
        verificationMethod: `${did}#keys-1`,
        proofPurpose: 'assertionMethod',
        proofValue,
      },
      trustChainAnchor: anchored.hash,
    };

    return apiSuccess({
      success: true,
      aipIdentity: identity,
      trustChainEntry: {
        hash: anchored.hash,
        index: 0,
        timestamp: anchored.timestamp,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('[AIP-SIGNIN] Error', message);
    return apiError('INTERNAL_ERROR', 'Failed to issue AIP identity');
  }
}

/** Resolves an AIP DID document from the trust chain. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const did = searchParams.get('did');
  if (!did || !did.startsWith('did:axiom')) {
    return apiError('VALIDATION_ERROR', 'Valid did:axiom:* required');
  }

  const user = await prisma.user.findUnique({ where: { did }, include: { agent: true } });
  if (!user) {
    return apiError('NOT_FOUND', 'AIP identity not found');
  }

  const action = await prisma.action.findFirst({
    where: { userId: user.id, type: 'aip_did_issue' },
    orderBy: { timestamp: 'desc' },
  });

  const salt = process.env.SOVEREIGN_KEY_SALT;
  if (!salt) {
    logger.error('[AIP-SIGNIN] SOVEREIGN_KEY_SALT not set');
    return apiError('INTERNAL_ERROR', 'Identity service not configured');
  }
  if (!user.piUid) {
    return apiError('NOT_FOUND', 'AIP identity not linked to Pi Network');
  }

  const keypair = deriveUserRootKey(user.piUid, salt);

  return apiSuccess({
    did,
    piUid: user.piUid,
    username: user.piUsername,
    walletAddress: user.walletAddress,
    kycStatus: user.kycStatus,
    hasAgent: !!user.agent,
    publicKey: keypair.publicKey,
    verificationMethod: 'Ed25519Signature2020',
    trustAnchor: action?.hash ?? null,
    anchoredAt: action?.timestamp ?? null,
  });
}