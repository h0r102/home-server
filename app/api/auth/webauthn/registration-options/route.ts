import { NextResponse } from 'next/server';
import { withAuth } from '@/server/lib/authMiddleware';
import * as authService from '@/server/domain/auth/authService';

export const dynamic = 'force-dynamic';

export const POST = withAuth(async (_request, auth) => {
  const options = await authService.getWebAuthnRegistrationOptions(auth.user.id);
  return NextResponse.json(options);
});
