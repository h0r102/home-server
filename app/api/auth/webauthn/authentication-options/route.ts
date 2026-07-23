import { NextResponse } from 'next/server';
import * as authService from '@/server/domain/auth/authService';
import { toApiResponse } from '@/server/lib/apiError';

export const dynamic = 'force-dynamic';

export async function POST(): Promise<NextResponse> {
  try {
    const { options, flowId } = await authService.getWebAuthnAuthenticationOptions();
    return NextResponse.json({ options, flowId });
  } catch (e) {
    return toApiResponse(e);
  }
}
