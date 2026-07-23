import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as authService from '@/server/domain/auth/authService';
import { toApiResponse } from '@/server/lib/apiError';
import { setSessionCookie } from '@/server/lib/authMiddleware';

export const dynamic = 'force-dynamic';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { username, password } = loginSchema.parse(body);
    const ip = request.headers.get('x-forwarded-for') ?? undefined;
    const userAgent = request.headers.get('user-agent') ?? undefined;

    const result = await authService.login(username, password, { ip, userAgent });

    const response = NextResponse.json({ user: result.user, token: result.token });
    setSessionCookie(response, result.token, result.expiresAt);
    return response;
  } catch (e) {
    return toApiResponse(e);
  }
}
