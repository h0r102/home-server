import type { AirconMode, AirconState, FanSpeedLevel, User } from '@prisma/client';
import { prisma } from '@/server/lib/prisma';

export type AirconStateWithUser = AirconState & { updatedByUser: User | null };

export const airconStateRepository = {
  find(deviceId: string): Promise<AirconStateWithUser | null> {
    return prisma.airconState.findUnique({ where: { deviceId }, include: { updatedByUser: true } });
  },

  upsert(
    deviceId: string,
    data: {
      power: boolean;
      temperature: number;
      mode: AirconMode;
      fanSpeed: FanSpeedLevel;
      updatedByUserId: string;
    }
  ): Promise<AirconStateWithUser> {
    return prisma.airconState.upsert({
      where: { deviceId },
      create: { deviceId, ...data },
      update: { ...data },
      include: { updatedByUser: true },
    });
  },
};
