import { NextResponse } from 'next/server';
import { withAuth } from '@/server/lib/authMiddleware';
import * as listService from '@/server/domain/list/listService';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ id: string; itemId: string }> };

export const POST = withAuth<RouteCtx>(async (_request, auth, ctx) => {
  const { id, itemId } = await ctx.params;
  const item = await listService.toggleItem(auth.user, id, itemId);
  return NextResponse.json(item);
});
