import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth-middleware';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { queryPerplexity } from '@/lib/agents/perplexity';
import { logger } from '@/lib/logger';

const HARVEST_RATE_LIMIT = { windowMs: 60_000, maxRequests: 5 };

const harvestSchema = z.object({
  query: z.string().min(3).max(500),
  maxTokens: z.number().int().min(1).max(2048).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  
  // Rate limiting check
  const rateLimit = await checkRateLimit(`harvest:${ip}`, HARVEST_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  // RULE 0 & requireAuth: Enforce user authentication
  const auth = await requireAuth(request);
  if (auth.error) {
    return auth.error;
  }

  try {
    const body = await request.json();
    
    // RULE 1: Zod validation
    const validation = harvestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { query, maxTokens, temperature } = validation.data;

    // Execute Perplexity Query
    const result = await queryPerplexity(query, { maxTokens, temperature });

    return NextResponse.json({
      success: true,
      query,
      result: result.content,
      citations: result.citations,
    });
  } catch (error: unknown) {
    logger.error('[HARVEST_ROUTE] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: errorMessage },
      { status: 500 }
    );
  }

}
