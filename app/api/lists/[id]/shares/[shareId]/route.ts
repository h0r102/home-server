import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/server/lib/authMiddleware';
import * as listService from '@/server/domain/list/listService';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ id: string; shareId: string }> };

const updateSchema = z.object({ permission: z.enum(['VIEW', 'EDIT']) });

export const PATCH = withAuth<RouteCtx>(async (request, auth, ctx) => {
  const { id, shareId } = await ctx.params;
  const { permission } = updateSchema.parse(await request.json());
  const share = await listService.updateShare(auth.user, id, shareId, permission);
  return NextResponse.json(share);
});

export const DELETE = withAuth<RouteCtx>(async (_request, auth, ctx) => {
  const { id, shareId } = await ctx.params;
  await listService.removeShare(auth.user, id, shareId);
  return NextResponse.json({ ok: true });
});
