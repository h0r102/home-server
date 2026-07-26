import type { AirconMode, FanSpeedLevel, SwitchBotDevice } from '@prisma/client';
import { switchbotDeviceRepository } from '@/server/repositories/switchbotDeviceRepository';
import { airconStateRepository, type AirconStateWithUser } from '@/server/repositories/airconStateRepository';
import * as switchbotClient from '@/server/integrations/switchbot/client';
import { syncDevices } from '@/server/integrations/switchbot/deviceSync';
import { toSetAllParameter } from '@/server/integrations/switchbot/airconCommandMapper';
import { assertCan } from '@/server/domain/permission/permissionService';
import * as auditLogService from '@/server/domain/auditLog/auditLogService';
import { NotFoundError, ValidationError } from '@/server/lib/errors';
import type { AuthUser } from '@/server/domain/shared/types';

export interface AirconDeviceDto {
  id: string;
  name: string;
}

export interface AirconStateDto {
  deviceId: string;
  power: boolean;
  temperature: number;
  mode: AirconMode;
  fanSpeed: FanSpeedLevel;
  updatedAt: Date;
  updatedBy: { id: string; displayName: string } | null;
}

export interface SetAirconInput {
  power: boolean;
  temperature: number;
  mode: AirconMode;
  fanSpeed: FanSpeedLevel;
}

function toDto(device: SwitchBotDevice, state: AirconStateWithUser | null): AirconStateDto {
  return {
    deviceId: device.id,
    power: state?.power ?? false,
    temperature: state?.temperature ?? 26,
    mode: state?.mode ?? 'AUTO',
    fanSpeed: state?.fanSpeed ?? 'AUTO',
    updatedAt: state?.updatedAt ?? device.lastSyncedAt,
    updatedBy: state?.updatedByUser
      ? { id: state.updatedByUser.id, displayName: state.updatedByUser.displayName }
      : null,
  };
}

async function getAirconDeviceOrThrow(deviceId: string): Promise<SwitchBotDevice> {
  const device = await switchbotDeviceRepository.findById(deviceId);
  if (!device || device.kind !== 'AIRCON') {
    throw new NotFoundError('エアコンが見つかりません');
  }
  return device;
}

function validateTemperature(temperature: number): void {
  if (!Number.isInteger(temperature) || temperature < 18 || temperature > 30) {
    throw new ValidationError('温度は18〜30の範囲で指定してください');
  }
}

const SYNC_INTERVAL_MS = 5 * 60 * 1000;

export async function listDevices(actingUser: AuthUser): Promise<AirconDeviceDto[]> {
  assertCan(actingUser, 'aircon.view');
  let devices = await switchbotDeviceRepository.findByKind('AIRCON');
  const newestSyncedAt = devices.reduce<number>(
    (max, d) => Math.max(max, d.lastSyncedAt.getTime()),
    0
  );
  const needsSync = devices.length === 0 || Date.now() - newestSyncedAt > SYNC_INTERVAL_MS;
  if (needsSync) {
    await syncDevices();
    devices = await switchbotDeviceRepository.findByKind('AIRCON');
  }
  return devices.map((d) => ({ id: d.id, name: d.deviceName }));
}

export async function getState(actingUser: AuthUser, deviceId: string): Promise<AirconStateDto> {
  assertCan(actingUser, 'aircon.view');
  const device = await getAirconDeviceOrThrow(deviceId);
  const state = await airconStateRepository.find(device.id);
  return toDto(device, state);
}

export async function setPower(
  actingUser: AuthUser,
  deviceId: string,
  on: boolean
): Promise<AirconStateDto> {
  assertCan(actingUser, 'aircon.operate');
  const device = await getAirconDeviceOrThrow(deviceId);

  await switchbotClient.sendCommand(device.deviceId, on ? 'turnOn' : 'turnOff');

  const previous = await airconStateRepository.find(device.id);
  const state = await airconStateRepository.upsert(device.id, {
    power: on,
    temperature: previous?.temperature ?? 26,
    mode: previous?.mode ?? 'AUTO',
    fanSpeed: previous?.fanSpeed ?? 'AUTO',
    updatedByUserId: actingUser.id,
  });

  await auditLogService.record({
    userId: actingUser.id,
    action: 'AIRCON_POWER',
    targetType: 'SwitchBotDevice',
    targetId: device.id,
    detail: { power: on },
  });

  return toDto(device, state);
}

export async function setAll(
  actingUser: AuthUser,
  deviceId: string,
  input: SetAirconInput
): Promise<AirconStateDto> {
  assertCan(actingUser, 'aircon.operate');
  validateTemperature(input.temperature);
  const device = await getAirconDeviceOrThrow(deviceId);

  const parameter = toSetAllParameter(input);
  await switchbotClient.sendCommand(device.deviceId, 'setAll', parameter);

  const state = await airconStateRepository.upsert(device.id, {
    power: input.power,
    temperature: input.temperature,
    mode: input.mode,
    fanSpeed: input.fanSpeed,
    updatedByUserId: actingUser.id,
  });

  await auditLogService.record({
    userId: actingUser.id,
    action: 'AIRCON_SET',
    targetType: 'SwitchBotDevice',
    targetId: device.id,
    detail: { ...input },
  });

  return toDto(device, state);
}
