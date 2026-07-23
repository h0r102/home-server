import { NextResponse } from 'next/server';
import { withAuth } from '@/server/lib/authMiddleware';
import * as auditLogService from '@/server/domain/auditLog/auditLogService';
import type { AuditAction } from '@prisma/client';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (request, auth) => {
  const params = request.nextUrl.searchParams;
  const userId = params.get('userId') ?? undefined;
  const action = (params.get('action') as AuditAction | null) ?? undefined;
  const fromParam = params.get('from');
  const toParam = params.get('to');
  const cursor = params.get('cursor') ?? undefined;
  const limitParam = params.get('limit');

  const result = await auditLogService.query(auth.user, {
    userId,
    action,
    from: fromParam ? new Date(fromParam) : undefined,
    to: toParam ? new Date(toParam) : undefined,
    cursor,
    limit: limitParam ? Number(limitParam) : undefined,
  });

  return NextResponse.json(result);
});
