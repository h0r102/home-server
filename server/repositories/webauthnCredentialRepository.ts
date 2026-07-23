import type { User, WebAuthnCredential } from '@prisma/client';
import { prisma } from '@/server/lib/prisma';

export type WebAuthnCredentialWithUser = WebAuthnCredential & { user: User };

export const webauthnCredentialRepository = {
  findByCredentialId(credentialId: string): Promise<WebAuthnCredentialWithUser | null> {
    return prisma.webAuthnCredential.findUnique({ where: { credentialId }, include: { user: true } });
  },

  listByUserId(userId: string): Promise<WebAuthnCredential[]> {
    return prisma.webAuthnCredential.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
  },

  create(data: {
    userId: string;
    credentialId: string;
    publicKey: Uint8Array;
    counter: number;
    transports?: string;
    deviceName: string;
  }): Promise<WebAuthnCredential> {
    return prisma.webAuthnCredential.create({
      data: { ...data, publicKey: Buffer.from(data.publicKey) },
    });
  },

  updateCounter(id: string, counter: number): Promise<WebAuthnCredential> {
    return prisma.webAuthnCredential.update({ where: { id }, data: { counter, lastUsedAt: new Date() } });
  },

  findById(id: string): Promise<WebAuthnCredential | null> {
    return prisma.webAuthnCredential.findUnique({ where: { id } });
  },

  delete(id: string): Promise<WebAuthnCredential> {
    return prisma.webAuthnCredential.delete({ where: { id } });
  },
};
