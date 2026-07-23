import { describe, it, expect, beforeAll } from 'vitest';
import { userRepository } from '@/server/repositories/userRepository';
import * as userService from '@/server/domain/user/userService';
import { ConflictError, ForbiddenError } from '@/server/lib/errors';
import type { AuthUser } from '@/server/domain/shared/types';

function toAuthUser(u: { id: string; username: string; displayName: string; role: 'ADMIN' | 'FAMILY' | 'GUEST' }): AuthUser {
  return u;
}

describe('userService — last admin protection (D1.3)', () => {
  let soleAdmin: AuthUser;
  let family: AuthUser;

  beforeAll(async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const adminRow = await userRepository.create({
      username: `sole-admin-${suffix}`,
      passwordHash: 'x',
      displayName: 'Sole Admin',
      role: 'ADMIN',
    });
    soleAdmin = toAuthUser(adminRow);

    // このテストファイルは「管理者が1人しかいない」という前提で last-admin ガードを検証する。
    // テストDBは他のテストファイルとも共有されるため、他ファイルが作成したADMINユーザーが
    // 残っていると前提が崩れる。ガード自体を経由せず直接デモートして前提を固定する。
    const allUsers = await userRepository.list();
    for (const u of allUsers) {
      if (u.role === 'ADMIN' && u.id !== soleAdmin.id) {
        await userRepository.update(u.id, { role: 'FAMILY' });
      }
    }

    const created = await userService.createUser(soleAdmin, {
      username: `family-${suffix}`,
      password: 'password123',
      displayName: 'Family',
      role: 'FAMILY',
    });
    family = toAuthUser({ ...created });
  });

  it('non-admin cannot manage users', async () => {
    await expect(
      userService.createUser(family, { username: 'x', password: 'password123', displayName: 'X', role: 'GUEST' })
    ).rejects.toThrow(ForbiddenError);
  });

  it('rejects demoting the only remaining admin', async () => {
    await expect(userService.updateUser(soleAdmin, soleAdmin.id, { role: 'FAMILY' })).rejects.toThrow(ConflictError);
  });

  it('rejects deleting the only remaining admin', async () => {
    await expect(userService.deleteUser(soleAdmin, soleAdmin.id)).rejects.toThrow(ConflictError);
  });

  it('allows demoting an admin once a second admin exists', async () => {
    const promoted = await userService.updateUser(soleAdmin, family.id, { role: 'ADMIN' });
    expect(promoted.role).toBe('ADMIN');
    family = { ...family, role: 'ADMIN' }; // 以降のテストでこのユーザーを管理者として使うため反映しておく

    // now two admins exist, so demoting the original one should succeed
    const demoted = await userService.updateUser(soleAdmin, soleAdmin.id, { role: 'FAMILY' });
    expect(demoted.role).toBe('FAMILY');
  });

  it('rejects creating a user with a duplicate username', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // 直前のテストでsoleAdminはFAMILYに降格済みなので、ここではpromoteされたfamily(現ADMIN)を使う
    await userService.createUser(family, {
      username: `dup-${suffix}`,
      password: 'password123',
      displayName: 'Dup',
      role: 'FAMILY',
    });
    await expect(
      userService.createUser(family, {
        username: `dup-${suffix}`,
        password: 'password123',
        displayName: 'Dup2',
        role: 'FAMILY',
      })
    ).rejects.toThrow(ConflictError);
  });
});
