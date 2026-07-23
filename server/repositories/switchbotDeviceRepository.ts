import type { DeviceKind, SwitchBotDevice } from '@prisma/client';
import { prisma } from '@/server/lib/prisma';

export const switchbotDeviceRepository = {
  upsertFromSync(data: {
    deviceId: string;
    deviceName: string;
    deviceType: string;
    kind: DeviceKind;
    hubDeviceId?: string;
  }): Promise<SwitchBotDevice> {
    return prisma.switchBotDevice.upsert({
      where: { deviceId: data.deviceId },
      create: {
        deviceId: data.deviceId,
        deviceName: data.deviceName,
        deviceType: data.deviceType,
        kind: data.kind,
        hubDeviceId: data.hubDeviceId,
      },
      update: {
        deviceName: data.deviceName,
        deviceType: data.deviceType,
        hubDeviceId: data.hubDeviceId,
        lastSyncedAt: new Date(),
      },
    });
  },

  findByKind(kind: DeviceKind): Promise<SwitchBotDevice[]> {
    return prisma.switchBotDevice.findMany({ where: { kind }, orderBy: { deviceName: 'asc' } });
  },

  findById(id: string): Promise<SwitchBotDevice | null> {
    return prisma.switchBotDevice.findUnique({ where: { id } });
  },

  markFetchResult(id: string, ok: boolean, error?: string): Promise<SwitchBotDevice> {
    return prisma.switchBotDevice.update({
      where: { id },
      data: { lastFetchAt: new Date(), lastFetchOk: ok, lastFetchError: error ?? null },
    });
  },
};
