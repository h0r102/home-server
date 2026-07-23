import type { User } from '@prisma/client';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server';
import { userRepository } from '@/server/repositories/userRepository';
import { sessionRepository } from '@/server/repositories/sessionRepository';
import { webauthnCredentialRepository } from '@/server/repositories/webauthnCredentialRepository';
import { verifyPassword } from '@/server/lib/password';
import { signSessionToken, verifySessionToken } from '@/server/lib/jwt';
import { UnauthorizedError, ValidationError, NotFoundError } from '@/server/lib/errors';
import {
  SESSION_TTL_DAYS,
  SESSION_RENEWAL_THRESHOLD_DAYS,
  SESSION_TOUCH_MIN_INTERVAL_MS,
} from '@/server/lib/constants';
import { getRpId, getRpName, getOrigin } from '@/server/lib/webauthnConfig';
import * as challengeStore from '@/server/lib/webauthnChallengeStore';
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

export async function getWebAuthnRegistrationOptions(userId: string): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const user = await userRepository.findById(userId);
  if (!user) throw new UnauthorizedError('ユーザーが見つかりません');

  const existingCredentials = await webauthnCredentialRepository.listByUserId(userId);

  const options = await generateRegistrationOptions({
    rpName: getRpName(),
    rpID: getRpId(),
    userName: user.username,
    userDisplayName: user.displayName,
    userID: new TextEncoder().encode(user.id),
    attestationType: 'none',
    excludeCredentials: existingCredentials.map((c) => ({
      id: c.credentialId,
      transports: c.transports ? JSON.parse(c.transports) : undefined,
    })),
    authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
  });

  challengeStore.setRegistrationChallenge(userId, options.challenge);
  return options;
}

export async function verifyWebAuthnRegistration(
  userId: string,
  response: RegistrationResponseJSON,
  deviceName: string
): Promise<void> {
  const expectedChallenge = challengeStore.takeRegistrationChallenge(userId);
  if (!expectedChallenge) {
    throw new ValidationError('登録セッションの有効期限が切れました。もう一度お試しください');
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: getOrigin(),
    expectedRPID: getRpId(),
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new ValidationError('パスキーの登録を検証できませんでした');
  }

  const { credential } = verification.registrationInfo;
  await webauthnCredentialRepository.create({
    userId,
    credentialId: credential.id,
    publicKey: credential.publicKey,
    counter: credential.counter,
    transports: credential.transports ? JSON.stringify(credential.transports) : undefined,
    deviceName,
  });

  await auditLogService.record({
    userId,
    action: 'WEBAUTHN_REGISTER',
    targetType: 'WebAuthnCredential',
    detail: { deviceName },
  });
}

export async function getWebAuthnAuthenticationOptions(): Promise<{
  options: PublicKeyCredentialRequestOptionsJSON;
  flowId: string;
}> {
  const options = await generateAuthenticationOptions({
    rpID: getRpId(),
    userVerification: 'preferred',
  });

  const flowId = crypto.randomUUID();
  challengeStore.setAuthenticationChallenge(flowId, options.challenge);
  return { options, flowId };
}

export async function verifyWebAuthnAuthentication(
  flowId: string,
  response: AuthenticationResponseJSON,
  meta: { userAgent?: string; ip?: string }
): Promise<LoginResult> {
  const expectedChallenge = challengeStore.takeAuthenticationChallenge(flowId);
  if (!expectedChallenge) {
    throw new UnauthorizedError('認証セッションの有効期限が切れました。もう一度お試しください');
  }

  const stored = await webauthnCredentialRepository.findByCredentialId(response.id);
  if (!stored) {
    throw new UnauthorizedError('登録されていないパスキーです');
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: getOrigin(),
    expectedRPID: getRpId(),
    credential: {
      id: stored.credentialId,
      publicKey: stored.publicKey,
      counter: stored.counter,
      transports: stored.transports ? JSON.parse(stored.transports) : undefined,
    },
  });

  if (!verification.verified) {
    throw new UnauthorizedError('パスキー認証に失敗しました');
  }

  await webauthnCredentialRepository.updateCounter(stored.id, verification.authenticationInfo.newCounter);

  const expiresAt = addDays(new Date(), SESSION_TTL_DAYS);
  const session = await sessionRepository.create({
    userId: stored.userId,
    expiresAt,
    userAgent: meta.userAgent,
    ipAddress: meta.ip,
  });
  const token = signSessionToken(stored.userId, session.id, expiresAt);

  await auditLogService.record({
    userId: stored.userId,
    action: 'LOGIN_SUCCESS',
    ipAddress: meta.ip,
    detail: { method: 'webauthn' },
  });

  return { user: toPublicUser(stored.user), token, expiresAt };
}

export async function removeWebAuthnCredential(userId: string, credentialId: string): Promise<void> {
  const credential = await webauthnCredentialRepository.findById(credentialId);
  if (!credential || credential.userId !== userId) {
    throw new NotFoundError('パスキーが見つかりません');
  }

  await webauthnCredentialRepository.delete(credentialId);
  await auditLogService.record({
    userId,
    action: 'WEBAUTHN_REMOVE',
    targetType: 'WebAuthnCredential',
    targetId: credentialId,
  });
}
