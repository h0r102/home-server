import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/server/lib/authMiddleware';
import * as airconService from '@/server/domain/aircon/airconService';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ deviceId: string }> };

const bodySchema = z.object({ power: z.boolean() });

export const POST = withAuth<RouteCtx>(async (request, auth, ctx) => {
  const { deviceId } = await ctx.params;
  const { power } = bodySchema.parse(await request.json());
  const state = await airconService.setPower(auth.user, deviceId, power);
  return NextResponse.json(state);
});
