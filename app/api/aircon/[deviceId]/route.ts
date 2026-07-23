import { NextResponse } from 'next/server';
import { withAuth } from '@/server/lib/authMiddleware';
import * as airconService from '@/server/domain/aircon/airconService';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ deviceId: string }> };

export const GET = withAuth<RouteCtx>(async (_request, auth, ctx) => {
  const { deviceId } = await ctx.params;
  const state = await airconService.getState(auth.user, deviceId);
  return NextResponse.json(state);
});
