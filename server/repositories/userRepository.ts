import type { Role, User } from '@prisma/client';
import { prisma } from '@/server/lib/prisma';

export const userRepository = {
  findByUsername(username: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { username } });
  },

  findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  list(): Promise<User[]> {
    return prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
  },

  countByRole(role: Role): Promise<number> {
    return prisma.user.count({ where: { role } });
  },

  create(data: {
    username: string;
    passwordHash: string;
    displayName: string;
    role: Role;
    createdById?: string | null;
  }): Promise<User> {
    return prisma.user.create({ data });
  },

  update(
    id: string,
    data: Partial<{ displayName: string; role: Role; passwordHash: string }>
  ): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  },

  delete(id: string): Promise<User> {
    return prisma.user.delete({ where: { id } });
  },
};
