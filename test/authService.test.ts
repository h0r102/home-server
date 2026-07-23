import { describe, it, expect, beforeAll } from 'vitest';
import { userRepository } from '@/server/repositories/userRepository';
import { sessionRepository } from '@/server/repositories/sessionRepository';
import { hashPassword } from '@/server/lib/password';
import * as authService from '@/server/domain/auth/authService';
import { UnauthorizedError } from '@/server/lib/errors';

describe('authService — login and session verification (D1.6)', () => {
  const username = `authtest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = 'correct-horse-battery-staple';

  beforeAll(async () => {
    const passwordHash = await hashPassword(password);
    await userRepository.create({ username, passwordHash, displayName: 'Auth Test', role: 'FAMILY' });
  });

  it('rejects login with a wrong password', async () => {
    await expect(authService.login(username, 'wrong-password', {})).rejects.toThrow(UnauthorizedError);
  });

  it('rejects login for a nonexistent username', async () => {
    await expect(authService.login('no-such-user-xyz', 'whatever', {})).rejects.toThrow(UnauthorizedError);
  });

  it('logs in successfully and issues a token verifiable via verifySession', async () => {
    const result = await authService.login(username, password, { ip: '127.0.0.1', userAgent: 'vitest' });
    expect(result.user.username).toBe(username);
    expect(result.token).toBeTruthy();

    const verified = await authService.verifySession(result.token);
    expect(verified.user.username).toBe(username);
    expect(verified.renewedToken).toBeUndefined();
  });

  it('rejects a session token after logout (revocation)', async () => {
    const result = await authService.login(username, password, {});
    const verifiedBeforeLogout = await authService.verifySession(result.token);
    await authService.logout(verifiedBeforeLogout.sessionId, verifiedBeforeLogout.user.id);

    await expect(authService.verifySession(result.token)).rejects.toThrow(UnauthorizedError);
  });

  it('rejects a token with an invalid signature', async () => {
    await expect(authService.verifySession('not-a-valid-jwt')).rejects.toThrow(UnauthorizedError);
  });

  it('renews the session token when close to expiry (sliding window)', async () => {
    const result = await authService.login(username, password, {});
    const verified = await authService.verifySession(result.token);

    // 残り4日まで迫らせる（更新しきい値=5日を下回る）
    const nearExpiry = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
    await sessionRepository.touch(verified.sessionId, nearExpiry);

    const reVerified = await authService.verifySession(result.token);
    expect(reVerified.renewedToken).toBeTruthy();
    expect(reVerified.renewedExpiresAt).toBeTruthy();
    expect(reVerified.renewedExpiresAt!.getTime()).toBeGreaterThan(nearExpiry.getTime());
  });

  it('rejects a session past its expiry date', async () => {
    const result = await authService.login(username, password, {});
    const verified = await authService.verifySession(result.token);

    const alreadyExpired = new Date(Date.now() - 1000);
    await sessionRepository.touch(verified.sessionId, alreadyExpired);

    await expect(authService.verifySession(result.token)).rejects.toThrow(UnauthorizedError);
  });
});
