import { NextResponse } from 'next/server';
import { withAuth } from '@/server/lib/authMiddleware';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (_request, auth) => {
  return NextResponse.json({ user: auth.user });
});
