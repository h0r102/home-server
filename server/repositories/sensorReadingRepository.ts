import type { SensorReading } from '@prisma/client';
import { prisma } from '@/server/lib/prisma';

export const sensorReadingRepository = {
  append(deviceId: string, data: { temperature: number; humidity: number }): Promise<SensorReading> {
    return prisma.sensorReading.create({ data: { deviceId, ...data } });
  },

  findLatestByDevice(deviceId: string): Promise<SensorReading | null> {
    return prisma.sensorReading.findFirst({ where: { deviceId }, orderBy: { fetchedAt: 'desc' } });
  },

  findRange(deviceId: string, from: Date, to: Date): Promise<SensorReading[]> {
    return prisma.sensorReading.findMany({
      where: { deviceId, fetchedAt: { gte: from, lte: to } },
      orderBy: { fetchedAt: 'asc' },
    });
  },

  deleteOlderThan(date: Date): Promise<{ count: number }> {
    return prisma.sensorReading.deleteMany({ where: { fetchedAt: { lt: date } } });
  },
};
