import type { AuditAction, AuditLog, Prisma } from '@prisma/client';
import { prisma } from '@/server/lib/prisma';

export interface AuditLogFilter {
  userId?: string;
  action?: AuditAction;
  from?: Date;
  to?: Date;
  cursor?: string;
  limit?: number;
}

type PrismaTransactionClient = Prisma.TransactionClient;

export const auditLogRepository = {
  create(
    data: {
      userId: string | null;
      action: AuditAction;
      targetType?: string;
      targetId?: string;
      detail?: string;
      ipAddress?: string;
    },
    tx?: PrismaTransactionClient
  ): Promise<AuditLog> {
    const client = tx ?? prisma;
    return client.auditLog.create({ data });
  },

  async query(filter: AuditLogFilter): Promise<{ items: AuditLog[]; nextCursor: string | null }> {
    const limit = filter.limit ?? 50;
    const where: Prisma.AuditLogWhereInput = {
      userId: filter.userId,
      action: filter.action,
      createdAt:
        filter.from || filter.to
          ? { gte: filter.from, lte: filter.to }
          : undefined,
    };

    const items = await prisma.auditLog.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
    });

    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;
    return { items: page, nextCursor: hasMore ? page[page.length - 1].id : null };
  },
};
