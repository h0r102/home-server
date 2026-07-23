import { NextResponse } from 'next/server';
import { withAuth } from '@/server/lib/authMiddleware';
import * as authService from '@/server/domain/auth/authService';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ id: string }> };

export const DELETE = withAuth<RouteCtx>(async (_request, auth, ctx) => {
  const { id } = await ctx.params;
  await authService.removeWebAuthnCredential(auth.user.id, id);
  return NextResponse.json({ ok: true });
});
