import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import * as authService from '@/server/domain/auth/authService';
import { SESSION_COOKIE_NAME } from '@/server/lib/constants';
import type { AuthUser } from '@/server/domain/shared/types';

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { user } = await authService.verifySession(token);
    return user;
  } catch {
    return null;
  }
}

export async function requireUser(redirectPath: string): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(redirectPath)}`);
  }
  return user;
}
