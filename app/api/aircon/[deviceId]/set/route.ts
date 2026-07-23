import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/server/lib/authMiddleware';
import * as airconService from '@/server/domain/aircon/airconService';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ deviceId: string }> };

const bodySchema = z.object({
  power: z.boolean(),
  temperature: z.number().int(),
  mode: z.enum(['AUTO', 'COOL', 'DRY', 'FAN', 'HEAT']),
  fanSpeed: z.enum(['AUTO', 'LOW', 'MEDIUM', 'HIGH']),
});

export const POST = withAuth<RouteCtx>(async (request, auth, ctx) => {
  const { deviceId } = await ctx.params;
  const input = bodySchema.parse(await request.json());
  const state = await airconService.setAll(auth.user, deviceId, input);
  return NextResponse.json(state);
});
