import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/errors';
import { requireAuth, clearAuthCache } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  const authHeader = request.headers.get('authorization');
  const accessToken = authHeader?.slice(7);

  try {
    // Remove piAccessToken from DB
    await prisma.user.update({
      where: { id: auth.user.id },
      data: { piAccessToken: null },
    });

    // Invalidate cached token in auth-middleware (same process)
    if (accessToken) {
      clearAuthCache();
    }

    return apiSuccess({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('[AUTH-LOGOUT] Error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to logout');
  }
}
