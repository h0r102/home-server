import type { Role, User } from '@prisma/client';
import { userRepository } from '@/server/repositories/userRepository';
import { sessionRepository } from '@/server/repositories/sessionRepository';
import { hashPassword } from '@/server/lib/password';
import { assertCan } from '@/server/domain/permission/permissionService';
import * as auditLogService from '@/server/domain/auditLog/auditLogService';
import { ValidationError, ConflictError, NotFoundError } from '@/server/lib/errors';
import type { AuthUser } from '@/server/domain/shared/types';

export interface UserDto {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  createdAt: Date;
}

function toUserDto(user: User): UserDto {
  return { id: user.id, username: user.username, displayName: user.displayName, role: user.role, createdAt: user.createdAt };
}

async function assertNotLastAdmin(targetUserId: string): Promise<void> {
  const target = await userRepository.findById(targetUserId);
  if (!target || target.role !== 'ADMIN') return;

  const adminCount = await userRepository.countByRole('ADMIN');
  if (adminCount <= 1) {
    throw new ConflictError('最後の1人の管理者は削除・降格できません', 'LAST_ADMIN_PROTECTED');
  }
}

export async function listUsers(actingUser: AuthUser): Promise<UserDto[]> {
  assertCan(actingUser, 'user.manage');
  const users = await userRepository.list();
  return users.map(toUserDto);
}

export async function createUser(
  actingUser: AuthUser,
  input: { username: string; password: string; displayName: string; role: Role }
): Promise<UserDto> {
  assertCan(actingUser, 'user.manage');

  const username = input.username.trim();
  if (!username) throw new ValidationError('ユーザー名を入力してください');
  if (!input.password || input.password.length < 8) {
    throw new ValidationError('パスワードは8文字以上で入力してください');
  }
  const displayName = input.displayName.trim() || username;

  const existing = await userRepository.findByUsername(username);
  if (existing) throw new ConflictError('このユーザー名は既に使用されています');

  const passwordHash = await hashPassword(input.password);
  const user = await userRepository.create({
    username,
    passwordHash,
    displayName,
    role: input.role,
    createdById: actingUser.id,
  });

  await auditLogService.record({
    userId: actingUser.id,
    action: 'USER_CREATE',
    targetType: 'User',
    targetId: user.id,
    detail: { username, role: input.role },
  });

  return toUserDto(user);
}

export async function updateUser(
  actingUser: AuthUser,
  targetUserId: string,
  input: { displayName?: string; role?: Role; password?: string }
): Promise<UserDto> {
  assertCan(actingUser, 'user.manage');

  const target = await userRepository.findById(targetUserId);
  if (!target) throw new NotFoundError('ユーザーが見つかりません');

  if (input.role !== undefined && input.role !== 'ADMIN' && target.role === 'ADMIN') {
    await assertNotLastAdmin(targetUserId);
  }

  const data: Partial<{ displayName: string; role: Role; passwordHash: string }> = {};
  if (input.displayName !== undefined) {
    const displayName = input.displayName.trim();
    if (!displayName) throw new ValidationError('表示名を入力してください');
    data.displayName = displayName;
  }
  if (input.role !== undefined) data.role = input.role;
  if (input.password !== undefined) {
    if (input.password.length < 8) throw new ValidationError('パスワードは8文字以上で入力してください');
    data.passwordHash = await hashPassword(input.password);
  }

  const updated = await userRepository.update(targetUserId, data);

  if (input.role !== undefined && input.role !== target.role) {
    await auditLogService.record({
      userId: actingUser.id,
      action: 'USER_ROLE_CHANGE',
      targetType: 'User',
      targetId: targetUserId,
      detail: { from: target.role, to: input.role },
    });
  }
  if (input.displayName !== undefined || input.password !== undefined) {
    await auditLogService.record({
      userId: actingUser.id,
      action: 'USER_UPDATE',
      targetType: 'User',
      targetId: targetUserId,
      detail: {
        displayNameChanged: input.displayName !== undefined,
        passwordChanged: input.password !== undefined,
      },
    });
  }

  // ロール変更・パスワードリセットは既存セッションを即時失効させ、権限変更を即座に反映する
  if ((input.role !== undefined && input.role !== target.role) || input.password !== undefined) {
    await sessionRepository.revokeAllForUser(targetUserId);
  }

  return toUserDto(updated);
}

export async function deleteUser(actingUser: AuthUser, targetUserId: string): Promise<void> {
  assertCan(actingUser, 'user.manage');

  const target = await userRepository.findById(targetUserId);
  if (!target) throw new NotFoundError('ユーザーが見つかりません');

  await assertNotLastAdmin(targetUserId);

  // 監査ログの記録は削除前に行う。自分自身を削除するケースでは、削除後に
  // 記録しようとするとAuditLog.userIdが指す行が既に無く外部キー制約違反になるため。
  await auditLogService.record({
    userId: actingUser.id,
    action: 'USER_DELETE',
    targetType: 'User',
    targetId: targetUserId,
    detail: { username: target.username },
  });

  await userRepository.delete(targetUserId);
}
