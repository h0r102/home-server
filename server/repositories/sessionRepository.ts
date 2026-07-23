import type { Session, User } from '@prisma/client';
import { prisma } from '@/server/lib/prisma';

export type SessionWithUser = Session & { user: User };

export const sessionRepository = {
  create(data: {
    userId: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<Session> {
    return prisma.session.create({ data });
  },

  findById(id: string): Promise<SessionWithUser | null> {
    return prisma.session.findUnique({ where: { id }, include: { user: true } });
  },

  revoke(id: string): Promise<Session> {
    return prisma.session.update({ where: { id }, data: { revokedAt: new Date() } });
  },

  touch(id: string, expiresAt?: Date): Promise<Session> {
    return prisma.session.update({
      where: { id },
      data: { lastUsedAt: new Date(), ...(expiresAt ? { expiresAt } : {}) },
    });
  },

  revokeAllForUser(userId: string): Promise<{ count: number }> {
    return prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },
};
