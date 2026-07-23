import { NextRequest, NextResponse } from 'next/server';
import * as authService from '@/server/domain/auth/authService';
import { toApiResponse } from '@/server/lib/apiError';
import { getAuthContext, clearSessionCookie } from '@/server/lib/authMiddleware';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await getAuthContext(request);
    await authService.logout(auth.sessionId, auth.user.id);

    const response = NextResponse.json({ ok: true });
    clearSessionCookie(response);
    return response;
  } catch (e) {
    return toApiResponse(e);
  }
}
