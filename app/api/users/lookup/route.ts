import { NextResponse } from 'next/server';
import { withAuth } from '@/server/lib/authMiddleware';
import { userRepository } from '@/server/repositories/userRepository';

export const dynamic = 'force-dynamic';

/**
 * リスト共有先を選ぶための最小限のユーザー一覧(id/displayNameのみ)。
 * 管理者専用のユーザー管理API(/api/users)とは別に、認証済みユーザーなら
 * 誰でも参照できる(家族間で「誰と共有するか」を選ぶために必要なため)。
 */
export const GET = withAuth(async (_request, auth) => {
  const users = await userRepository.list();
  const items = users
    .filter((u) => u.id !== auth.user.id)
    .map((u) => ({ id: u.id, displayName: u.displayName }));
  return NextResponse.json({ items });
});
