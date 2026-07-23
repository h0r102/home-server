import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/server/lib/authMiddleware';
import * as userService from '@/server/domain/user/userService';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  displayName: z.string().min(1).optional(),
  role: z.enum(['ADMIN', 'FAMILY', 'GUEST']).optional(),
  password: z.string().min(8).optional(),
});

export const PATCH = withAuth<RouteCtx>(async (request, auth, ctx) => {
  const { id } = await ctx.params;
  const input = updateSchema.parse(await request.json());
  const user = await userService.updateUser(auth.user, id, input);
  return NextResponse.json(user);
});

export const DELETE = withAuth<RouteCtx>(async (_request, auth, ctx) => {
  const { id } = await ctx.params;
  await userService.deleteUser(auth.user, id);
  return NextResponse.json({ ok: true });
});
