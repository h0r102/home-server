import type { ListShare, SharePermission, User } from '@prisma/client';
import { prisma } from '@/server/lib/prisma';

export type ListShareWithUser = ListShare & { user: User };

export const listShareRepository = {
  create(listId: string, userId: string, permission: SharePermission): Promise<ListShareWithUser> {
    return prisma.listShare.create({ data: { listId, userId, permission }, include: { user: true } });
  },

  update(id: string, permission: SharePermission): Promise<ListShareWithUser> {
    return prisma.listShare.update({ where: { id }, data: { permission }, include: { user: true } });
  },

  delete(id: string): Promise<ListShare> {
    return prisma.listShare.delete({ where: { id } });
  },

  findById(id: string): Promise<ListShare | null> {
    return prisma.listShare.findUnique({ where: { id } });
  },

  findByListId(listId: string): Promise<ListShareWithUser[]> {
    return prisma.listShare.findMany({ where: { listId }, include: { user: true } });
  },

  findByListAndUser(listId: string, userId: string): Promise<ListShare | null> {
    return prisma.listShare.findUnique({ where: { listId_userId: { listId, userId } } });
  },
};
