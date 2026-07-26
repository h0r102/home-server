import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/server/lib/authMiddleware';
import * as listService from '@/server/domain/list/listService';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ id: string; itemId: string }> };

const editSchema = z.object({
  title: z.string().min(1).optional(),
  note: z.string().optional(),
  url: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const PATCH = withAuth<RouteCtx>(async (request, auth, ctx) => {
  const { id, itemId } = await ctx.params;
  const input = editSchema.parse(await request.json());
  const item = await listService.editItem(auth.user, id, itemId, input);
  return NextResponse.json(item);
});

export const DELETE = withAuth<RouteCtx>(async (_request, auth, ctx) => {
  const { id, itemId } = await ctx.params;
  await listService.deleteItem(auth.user, id, itemId);
  return NextResponse.json({ ok: true });
});
