import { NextResponse } from 'next/server';
import { withAuth } from '@/server/lib/authMiddleware';
import * as sensorService from '@/server/domain/sensor/sensorService';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (_request, auth) => {
  const items = await sensorService.listLatest(auth.user);
  return NextResponse.json({ items });
});
