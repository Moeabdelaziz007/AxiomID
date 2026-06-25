import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * POST /api/skills/[slug]/purchase — DEPRECATED.
 *
 * The marketplace handles payment client-side via Pi SDK (createPiPayment),
 * then calls /install directly. This route returns 410 Gone to prevent
 * confusion. Remove after confirming no callers remain.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  logger.warn(`[SKILL-PURCHASE] Deprecated route called: ${slug}`);
  return NextResponse.json(
    { error: 'GONE', message: 'This endpoint is deprecated. Use the marketplace install flow instead.' },
    { status: 410 }
  );
}
