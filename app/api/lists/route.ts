import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/server/lib/authMiddleware';
import * as listService from '@/server/domain/list/listService';

export const dynamic = 'force-dynamic';

const createSchema = z.object({ name: z.string().min(1) });

export const GET = withAuth(async (_request, auth) => {
  const items = await listService.listListsForUser(auth.user);
  return NextResponse.json({ items });
});

export const POST = withAuth(async (request, auth) => {
  const { name } = createSchema.parse(await request.json());
  const list = await listService.createList(auth.user, name);
  return NextResponse.json(list, { status: 201 });
});
