import { NextRequest, NextResponse } from 'next/server';
import * as authService from '@/server/domain/auth/authService';
import { UnauthorizedError } from '@/server/lib/errors';
import { toApiResponse } from '@/server/lib/apiError';
import { SESSION_COOKIE_NAME } from '@/server/lib/constants';
import type { AuthUser } from '@/server/domain/shared/types';

export interface AuthContext {
  user: AuthUser;
  sessionId: string;
  renewedToken?: string;
  renewedExpiresAt?: Date;
  usedCookie: boolean;
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });
}

export async function getAuthContext(request: NextRequest): Promise<AuthContext> {
  const cookieToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const token = cookieToken ?? bearerToken;

  if (!token) {
    throw new UnauthorizedError('認証が必要です');
  }

  const result = await authService.verifySession(token);
  return { ...result, usedCookie: Boolean(cookieToken) };
}

function applyAuthRenewal(response: NextResponse, auth: AuthContext): NextResponse {
  if (!auth.renewedToken || !auth.renewedExpiresAt) return response;
  if (auth.usedCookie) {
    setSessionCookie(response, auth.renewedToken, auth.renewedExpiresAt);
  } else {
    response.headers.set('X-Refreshed-Token', auth.renewedToken);
  }
  return response;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withAuth<TRouteCtx = any>(
  handler: (request: NextRequest, auth: AuthContext, routeCtx: TRouteCtx) => Promise<NextResponse>
) {
  return async (request: NextRequest, routeCtx: TRouteCtx): Promise<NextResponse> => {
    try {
      const auth = await getAuthContext(request);
      const response = await handler(request, auth, routeCtx);
      return applyAuthRenewal(response, auth);
    } catch (e) {
      return toApiResponse(e);
    }
  };
}
