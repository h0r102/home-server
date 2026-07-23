import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/server/lib/authMiddleware';
import * as listService from '@/server/domain/list/listService';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ id: string }> };

const renameSchema = z.object({ name: z.string().min(1) });

export const GET = withAuth<RouteCtx>(async (_request, auth, ctx) => {
  const { id } = await ctx.params;
  const detail = await listService.getListDetail(auth.user, id);
  return NextResponse.json(detail);
});

export const PATCH = withAuth<RouteCtx>(async (request, auth, ctx) => {
  const { id } = await ctx.params;
  const { name } = renameSchema.parse(await request.json());
  const list = await listService.renameList(auth.user, id, name);
  return NextResponse.json(list);
});

export const DELETE = withAuth<RouteCtx>(async (_request, auth, ctx) => {
  const { id } = await ctx.params;
  await listService.deleteList(auth.user, id);
  return NextResponse.json({ ok: true });
});
