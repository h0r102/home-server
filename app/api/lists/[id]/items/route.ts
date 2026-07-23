import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/server/lib/authMiddleware';
import * as listService from '@/server/domain/list/listService';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ id: string }> };

const addItemSchema = z.object({ title: z.string().min(1), note: z.string().optional() });

export const GET = withAuth<RouteCtx>(async (_request, auth, ctx) => {
  const { id } = await ctx.params;
  const items = await listService.getItems(auth.user, id);
  return NextResponse.json({ items });
});

export const POST = withAuth<RouteCtx>(async (request, auth, ctx) => {
  const { id } = await ctx.params;
  const input = addItemSchema.parse(await request.json());
  const item = await listService.addItem(auth.user, id, input);
  return NextResponse.json(item, { status: 201 });
});
