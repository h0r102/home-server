import type { AuditAction, Prisma } from '@prisma/client';
import { auditLogRepository, type AuditLogFilter } from '@/server/repositories/auditLogRepository';
import { logger } from '@/server/lib/logger';

export interface AuditLogEntryInput {
  userId: string | null;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  detail?: Record<string, unknown>;
  ipAddress?: string;
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

export function query(filter: AuditLogFilter) {
  return auditLogRepository.query(filter);
}
