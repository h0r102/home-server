import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/server/lib/authMiddleware';
import * as userService from '@/server/domain/user/userService';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(8),
  displayName: z.string().min(1),
  role: z.enum(['ADMIN', 'FAMILY', 'GUEST']),
});

export const GET = withAuth(async (_request, auth) => {
  const items = await userService.listUsers(auth.user);
  return NextResponse.json({ items });
});

export const POST = withAuth(async (request, auth) => {
  const input = createSchema.parse(await request.json());
  const user = await userService.createUser(auth.user, input);
  return NextResponse.json(user, { status: 201 });
});
