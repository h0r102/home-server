import { NextResponse } from 'next/server';
import { withAuth } from '@/server/lib/authMiddleware';
import { webauthnCredentialRepository } from '@/server/repositories/webauthnCredentialRepository';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (_request, auth) => {
  const credentials = await webauthnCredentialRepository.listByUserId(auth.user.id);
  const items = credentials.map((c) => ({
    id: c.id,
    deviceName: c.deviceName,
    createdAt: c.createdAt,
    lastUsedAt: c.lastUsedAt,
  }));
  return NextResponse.json({ items });
});
