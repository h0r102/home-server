import { NextResponse } from 'next/server';
import { withAuth } from '@/server/lib/authMiddleware';
import * as sensorService from '@/server/domain/sensor/sensorService';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ deviceId: string }> };

export const GET = withAuth<RouteCtx>(async (_request, auth, ctx) => {
  const { deviceId } = await ctx.params;
  const summary = await sensorService.getSummary(auth.user, deviceId);
  return NextResponse.json(summary);
});
