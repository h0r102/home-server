import { NextResponse } from 'next/server';
import { withAuth } from '@/server/lib/authMiddleware';
import * as sensorService from '@/server/domain/sensor/sensorService';
import { ValidationError } from '@/server/lib/errors';
import type { HistoryRange } from '@/server/domain/sensor/sensorService';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ deviceId: string }> };

const VALID_RANGES: HistoryRange[] = ['24h', '7d', '30d'];

export const GET = withAuth<RouteCtx>(async (request, auth, ctx) => {
  const { deviceId } = await ctx.params;
  const rangeParam = request.nextUrl.searchParams.get('range') ?? '24h';
  if (!VALID_RANGES.includes(rangeParam as HistoryRange)) {
    throw new ValidationError('rangeは24h, 7d, 30dのいずれかを指定してください');
  }
  const items = await sensorService.getHistory(auth.user, deviceId, rangeParam as HistoryRange);
  return NextResponse.json({ items });
});
