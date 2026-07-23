import type { List, User, ListItem, ListShare } from '@prisma/client';
import { prisma } from '@/server/lib/prisma';

export type ListWithRelations = List & {
  owner: User;
  shares: (ListShare & { user: User })[];
};

export type ListWithSummary = List & {
  owner: User;
  shares: ListShare[];
  items: ListItem[];
};

export const listRepository = {
  create(ownerId: string, name: string): Promise<List> {
    return prisma.list.create({ data: { ownerId, name } });
  },

  findById(id: string): Promise<ListWithRelations | null> {
    return prisma.list.findUnique({
      where: { id },
      include: { owner: true, shares: { include: { user: true } } },
    });
  },

  findAccessibleByUser(userId: string): Promise<ListWithSummary[]> {
    return prisma.list.findMany({
      where: { OR: [{ ownerId: userId }, { shares: { some: { userId } } }] },
      include: { owner: true, shares: true, items: true },
      orderBy: { updatedAt: 'desc' },
    });
  },

  rename(id: string, name: string): Promise<List> {
    return prisma.list.update({ where: { id }, data: { name } });
  },

  delete(id: string): Promise<List> {
    return prisma.list.delete({ where: { id } });
  },
};
