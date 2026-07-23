import { NextResponse } from 'next/server';
import { withAuth } from '@/server/lib/authMiddleware';
import * as airconService from '@/server/domain/aircon/airconService';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (_request, auth) => {
  const items = await airconService.listDevices(auth.user);
  return NextResponse.json({ items });
});
