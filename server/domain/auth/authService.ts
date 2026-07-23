import type { User } from '@prisma/client';
import { userRepository } from '@/server/repositories/userRepository';
import { sessionRepository } from '@/server/repositories/sessionRepository';
import { verifyPassword } from '@/server/lib/password';
import { signSessionToken, verifySessionToken } from '@/server/lib/jwt';
import { UnauthorizedError } from '@/server/lib/errors';
import {
  SESSION_TTL_DAYS,
  SESSION_RENEWAL_THRESHOLD_DAYS,
  SESSION_TOUCH_MIN_INTERVAL_MS,
} from '@/server/lib/constants';
import * as auditLogService from '@/server/domain/auditLog/auditLogService';
import type { AuthUser } from '@/server/domain/shared/types';

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  role: AuthUser['role'];
}

export interface LoginResult {
  user: PublicUser;
  token: string;
  expiresAt: Date;
}

export interface VerifySessionResult {
  user: AuthUser;
  sessionId: string;
  renewedToken?: string;
  renewedExpiresAt?: Date;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  };
}

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  };
}

export async function login(
  username: string,
  password: string,
  meta: { userAgent?: string; ip?: string }
): Promise<LoginResult> {
  const user = await userRepository.findByUsername(username);
  const passwordOk = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !passwordOk) {
    await auditLogService.record({
      userId: user?.id ?? null,
      action: 'LOGIN_FAILURE',
      ipAddress: meta.ip,
    });
    throw new UnauthorizedError('ユーザー名またはパスワードが正しくありません');
  }

  const expiresAt = addDays(new Date(), SESSION_TTL_DAYS);
  const session = await sessionRepository.create({
    userId: user.id,
    expiresAt,
    userAgent: meta.userAgent,
    ipAddress: meta.ip,
  });
  const token = signSessionToken(user.id, session.id, expiresAt);

  await auditLogService.record({
    userId: user.id,
    action: 'LOGIN_SUCCESS',
    ipAddress: meta.ip,
  });

  return { user: toPublicUser(user), token, expiresAt };
}

export async function logout(sessionId: string, userId: string): Promise<void> {
  await sessionRepository.revoke(sessionId);
  await auditLogService.record({ userId, action: 'LOGOUT' });
}

export async function verifySession(token: string): Promise<VerifySessionResult> {
  let payload;
  try {
    payload = verifySessionToken(token);
  } catch {
    throw new UnauthorizedError('セッションが無効です');
  }

  const session = await sessionRepository.findById(payload.sid);
  if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) {
    throw new UnauthorizedError('セッションが失効しています');
  }

  const authUser = toAuthUser(session.user);
  const remainingMs = session.expiresAt.getTime() - Date.now();
  const thresholdMs = SESSION_RENEWAL_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

  if (remainingMs < thresholdMs) {
    const renewedExpiresAt = addDays(new Date(), SESSION_TTL_DAYS);
    await sessionRepository.touch(session.id, renewedExpiresAt);
    const renewedToken = signSessionToken(session.userId, session.id, renewedExpiresAt);
    return { user: authUser, sessionId: session.id, renewedToken, renewedExpiresAt };
  }

  if (Date.now() - session.lastUsedAt.getTime() > SESSION_TOUCH_MIN_INTERVAL_MS) {
    await sessionRepository.touch(session.id);
  }

  return { user: authUser, sessionId: session.id };
}
