import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import * as authService from '@/server/domain/auth/authService';
import { toApiResponse } from '@/server/lib/apiError';
import { setSessionCookie } from '@/server/lib/authMiddleware';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  flowId: z.string().min(1),
  response: z
    .object({ id: z.string(), rawId: z.string(), type: z.string() })
    .passthrough(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { flowId, response } = bodySchema.parse(await request.json());
    const ip = request.headers.get('x-forwarded-for') ?? undefined;
    const userAgent = request.headers.get('user-agent') ?? undefined;

    const result = await authService.verifyWebAuthnAuthentication(
      flowId,
      response as unknown as AuthenticationResponseJSON,
      { ip, userAgent }
    );

    const apiResponse = NextResponse.json({ user: result.user, token: result.token });
    setSessionCookie(apiResponse, result.token, result.expiresAt);
    return apiResponse;
  } catch (e) {
    return toApiResponse(e);
  }
}
