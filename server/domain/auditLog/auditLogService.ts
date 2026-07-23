import type { AuditAction, Prisma } from '@prisma/client';
import { auditLogRepository, type AuditLogFilter } from '@/server/repositories/auditLogRepository';
import { assertCan } from '@/server/domain/permission/permissionService';
import { logger } from '@/server/lib/logger';
import type { AuthUser } from '@/server/domain/shared/types';

export interface AuditLogEntryInput {
  userId: string | null;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  detail?: Record<string, unknown>;
  ipAddress?: string;
}

export interface AuditLogDto {
  id: string;
  action: AuditAction;
  user: { id: string; displayName: string } | null;
  targetType: string | null;
  targetId: string | null;
  detail: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: Date;
}

type PrismaTransactionClient = Prisma.TransactionClient;

export async function record(entry: AuditLogEntryInput, tx?: PrismaTransactionClient): Promise<void> {
  try {
    await auditLogRepository.create(
      {
        userId: entry.userId,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        detail: entry.detail ? JSON.stringify(entry.detail) : undefined,
        ipAddress: entry.ipAddress,
      },
      tx
    );
  } catch (err) {
    // 監査ログ書き込み失敗で主機能を止めない（詳細設計D1.2参照）。
    // トランザクション内で呼ばれている場合はこのエラーが呼び出し元に伝播し、業務更新もロールバックされる。
    logger.error({ err, action: entry.action }, 'audit_log_write_failed');
    if (tx) throw err;
  }
}

export async function query(
  actingUser: AuthUser,
  filter: AuditLogFilter
): Promise<{ items: AuditLogDto[]; nextCursor: string | null }> {
  assertCan(actingUser, 'auditlog.view');

  const { items, nextCursor } = await auditLogRepository.query(filter);
  return {
    items: items.map((log) => ({
      id: log.id,
      action: log.action,
      user: log.user ? { id: log.user.id, displayName: log.user.displayName } : null,
      targetType: log.targetType,
      targetId: log.targetId,
      detail: log.detail ? JSON.parse(log.detail) : null,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt,
    })),
    nextCursor,
  };
}
