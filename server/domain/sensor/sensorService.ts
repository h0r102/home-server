import type { SwitchBotDevice } from '@prisma/client';
import { switchbotDeviceRepository } from '@/server/repositories/switchbotDeviceRepository';
import { sensorReadingRepository } from '@/server/repositories/sensorReadingRepository';
import * as switchbotClient from '@/server/integrations/switchbot/client';
import { syncDevices } from '@/server/integrations/switchbot/deviceSync';
import { assertCan } from '@/server/domain/permission/permissionService';
import { NotFoundError, ValidationError } from '@/server/lib/errors';
import { logger } from '@/server/lib/logger';
import type { AuthUser } from '@/server/domain/shared/types';

export interface SensorSummaryDto {
  deviceId: string;
  deviceName: string;
  temperature: number | null;
  humidity: number | null;
  fetchedAt: Date | null;
  fetchOk: boolean;
}

export interface SensorReadingPoint {
  temperature: number;
  humidity: number;
  fetchedAt: Date;
}

export type HistoryRange = '24h' | '7d' | '30d';

const RANGE_MS: Record<HistoryRange, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

const RETRY_DELAYS_MS = [5_000, 15_000, 45_000];
const POLL_CONCURRENCY = 2;

interface MeterStatusBody {
  temperature: number;
  humidity: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getMeterDeviceOrThrow(deviceId: string): Promise<SwitchBotDevice> {
  const device = await switchbotDeviceRepository.findById(deviceId);
  if (!device || device.kind !== 'METER') {
    throw new NotFoundError('温湿度センサーが見つかりません');
  }
  return device;
}

function toSummaryDto(device: SwitchBotDevice, latest: Awaited<ReturnType<typeof sensorReadingRepository.findLatestByDevice>>): SensorSummaryDto {
  return {
    deviceId: device.id,
    deviceName: device.deviceName,
    temperature: latest?.temperature ?? null,
    humidity: latest?.humidity ?? null,
    fetchedAt: latest?.fetchedAt ?? null,
    fetchOk: device.lastFetchOk ?? true,
  };
}

export async function listLatest(actingUser: AuthUser): Promise<SensorSummaryDto[]> {
  assertCan(actingUser, 'sensor.view');
  await syncDevices();
  const devices = await switchbotDeviceRepository.findByKind('METER');
  return Promise.all(
    devices.map(async (device) => {
      const latest = await sensorReadingRepository.findLatestByDevice(device.id);
      return toSummaryDto(device, latest);
    })
  );
}

export async function getSummary(actingUser: AuthUser, deviceId: string): Promise<SensorSummaryDto> {
  assertCan(actingUser, 'sensor.view');
  const device = await getMeterDeviceOrThrow(deviceId);
  const latest = await sensorReadingRepository.findLatestByDevice(device.id);
  return toSummaryDto(device, latest);
}

export async function getHistory(
  actingUser: AuthUser,
  deviceId: string,
  range: HistoryRange
): Promise<SensorReadingPoint[]> {
  assertCan(actingUser, 'sensor.view');
  if (!(range in RANGE_MS)) {
    throw new ValidationError('rangeは24h, 7d, 30dのいずれかを指定してください');
  }
  const device = await getMeterDeviceOrThrow(deviceId);
  const from = new Date(Date.now() - RANGE_MS[range]);
  const readings = await sensorReadingRepository.findRange(device.id, from, new Date());
  return readings.map((r) => ({ temperature: r.temperature, humidity: r.humidity, fetchedAt: r.fetchedAt }));
}

async function fetchWithRetry(externalDeviceId: string): Promise<{ temperature: number; humidity: number } | null> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const status = await switchbotClient.getDeviceStatus<MeterStatusBody>(externalDeviceId);
      return { temperature: status.temperature, humidity: status.humidity };
    } catch (err) {
      logger.warn({ deviceId: externalDeviceId, attempt, err }, 'sensor_fetch_retry');
      if (attempt === RETRY_DELAYS_MS.length) return null;
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
  return null;
}

export async function pollDevice(deviceId: string): Promise<{ ok: boolean; error?: string }> {
  const device = await switchbotDeviceRepository.findById(deviceId);
  if (!device) return { ok: false, error: 'device not found' };

  const result = await fetchWithRetry(device.deviceId);
  if (!result) {
    await switchbotDeviceRepository.markFetchResult(device.id, false, '再試行してもセンサー値を取得できませんでした');
    return { ok: false, error: 'poll failed after retries' };
  }

  await sensorReadingRepository.append(device.id, result);
  await switchbotDeviceRepository.markFetchResult(device.id, true);
  return { ok: true };
}

export async function pollAllDevices(): Promise<void> {
  await syncDevices();
  const devices = await switchbotDeviceRepository.findByKind('METER');

  for (let i = 0; i < devices.length; i += POLL_CONCURRENCY) {
    const chunk = devices.slice(i, i + POLL_CONCURRENCY);
    await Promise.allSettled(chunk.map((device) => pollDevice(device.id)));
  }
}
