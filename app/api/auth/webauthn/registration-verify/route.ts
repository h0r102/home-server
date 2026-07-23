import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';
import { withAuth } from '@/server/lib/authMiddleware';
import * as authService from '@/server/domain/auth/authService';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  response: z
    .object({ id: z.string(), rawId: z.string(), type: z.string() })
    .passthrough(),
  deviceName: z.string().min(1),
});

export const POST = withAuth(async (request, auth) => {
  const { response, deviceName } = bodySchema.parse(await request.json());
  await authService.verifyWebAuthnRegistration(
    auth.user.id,
    response as unknown as RegistrationResponseJSON,
    deviceName
  );
  return NextResponse.json({ ok: true });
});
