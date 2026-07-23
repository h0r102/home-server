import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/server/lib/authMiddleware';
import * as listService from '@/server/domain/list/listService';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ id: string }> };

const reorderSchema = z.object({ orderedItemIds: z.array(z.string().min(1)) });

export const PATCH = withAuth<RouteCtx>(async (request, auth, ctx) => {
  const { id } = await ctx.params;
  const { orderedItemIds } = reorderSchema.parse(await request.json());
  await listService.reorderItems(auth.user, id, orderedItemIds);
  return NextResponse.json({ ok: true });
});
