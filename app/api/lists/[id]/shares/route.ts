import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/server/lib/authMiddleware';
import * as listService from '@/server/domain/list/listService';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ id: string }> };

const shareSchema = z.object({ userId: z.string().min(1), permission: z.enum(['VIEW', 'EDIT']) });

export const GET = withAuth<RouteCtx>(async (_request, auth, ctx) => {
  const { id } = await ctx.params;
  const detail = await listService.getListDetail(auth.user, id);
  return NextResponse.json({ items: detail.shares });
});

export const POST = withAuth<RouteCtx>(async (request, auth, ctx) => {
  const { id } = await ctx.params;
  const { userId, permission } = shareSchema.parse(await request.json());
  const share = await listService.shareList(auth.user, id, userId, permission);
  return NextResponse.json(share, { status: 201 });
});
