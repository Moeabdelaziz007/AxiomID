import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/errors';

export interface AuthenticatedUser {
  id: string;
  walletAddress: string;
  piUid: string;
  piUsername: string | null;
  xp: number;
  tier: string;
}

export async function requireAuth(request: NextRequest): Promise<
  { error: ReturnType<typeof apiError>; user: null } | { error: null; user: AuthenticatedUser }
> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: apiError('UNAUTHORIZED', 'Missing or invalid Authorization header'), user: null };
  }

  const accessToken = authHeader.slice(7);
  if (!accessToken) {
    return { error: apiError('UNAUTHORIZED', 'Empty access token'), user: null };
  }

  try {
    const piResponse = await fetch('https://api.minepi.com/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(5000),
    });

    if (!piResponse.ok) {
      return { error: apiError('UNAUTHORIZED', 'Invalid Pi access token'), user: null };
    }

    const piUser: { uid?: string; username?: string } = await piResponse.json();
    if (!piUser.uid) {
      return { error: apiError('UNAUTHORIZED', 'Pi token missing uid'), user: null };
    }

    const user = await prisma.user.findUnique({
      where: { piUid: piUser.uid },
      select: {
        id: true,
        walletAddress: true,
        piUid: true,
        piUsername: true,
        xp: true,
        tier: true,
      },
    });

    if (!user || !user.piUid) {
      return { error: apiError('UNAUTHORIZED', 'User not found. Please authenticate first via POST /api/auth/pi'), user: null };
    }

    return { error: null, user: user as AuthenticatedUser };
  } catch {
    return { error: apiError('UNAUTHORIZED', 'Failed to verify Pi token'), user: null };
  }
}
