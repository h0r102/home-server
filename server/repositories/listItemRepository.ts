import type { ListItem, User } from '@prisma/client';
import { prisma } from '@/server/lib/prisma';

export type ListItemWithRelations = ListItem & {
  createdBy: User;
  completedBy: User | null;
};

const WITH_RELATIONS = { createdBy: true, completedBy: true } as const;

export const listItemRepository = {
  create(
    listId: string,
    data: {
      title: string;
      note?: string;
      tags?: string | null;
      url?: string | null;
      createdById: string;
      sortOrder: number;
    }
  ): Promise<ListItemWithRelations> {
    return prisma.listItem.create({ data: { listId, ...data }, include: WITH_RELATIONS });
  },

  update(
    id: string,
    data: Partial<{ title: string; note: string | null; tags: string | null; url: string | null }>
  ): Promise<ListItemWithRelations> {
    return prisma.listItem.update({ where: { id }, data, include: WITH_RELATIONS });
  },

  toggle(id: string, completed: boolean, completedById: string): Promise<ListItemWithRelations> {
    return prisma.listItem.update({
      where: { id },
      data: {
        completed,
        completedAt: completed ? new Date() : null,
        completedById: completed ? completedById : null,
      },
      include: WITH_RELATIONS,
    });
  },

  delete(id: string): Promise<ListItem> {
    return prisma.listItem.delete({ where: { id } });
  },

  findById(id: string): Promise<ListItemWithRelations | null> {
    return prisma.listItem.findUnique({ where: { id }, include: WITH_RELATIONS });
  },

  findByListId(listId: string): Promise<ListItemWithRelations[]> {
    return prisma.listItem.findMany({
      where: { listId },
      orderBy: { sortOrder: 'asc' },
      include: WITH_RELATIONS,
    });
  },

  countByListId(listId: string): Promise<number> {
    return prisma.listItem.count({ where: { listId } });
  },

  async reorder(orderedItemIds: string[]): Promise<void> {
    await prisma.$transaction(
      orderedItemIds.map((id, index) => prisma.listItem.update({ where: { id }, data: { sortOrder: index } }))
    );
  },
};
