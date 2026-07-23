import { switchbotDeviceRepository } from '@/server/repositories/switchbotDeviceRepository';
import * as switchbotClient from './client';
import { logger } from '@/server/lib/logger';

const METER_DEVICE_TYPES = new Set(['Meter', 'MeterPlus', 'WoIOSensor', 'Hub 2']);

export async function syncDevices(): Promise<void> {
  const { deviceList, infraredRemoteList } = await switchbotClient.getDevices();

  const airconRemotes = infraredRemoteList.filter((remote) => remote.remoteType === 'Air Conditioner');
  for (const remote of airconRemotes) {
    await switchbotDeviceRepository.upsertFromSync({
      deviceId: remote.deviceId,
      deviceName: remote.deviceName,
      deviceType: remote.remoteType,
      kind: 'AIRCON',
      hubDeviceId: remote.hubDeviceId,
    });
  }

  const meterDevices = deviceList.filter((device) => METER_DEVICE_TYPES.has(device.deviceType));
  for (const device of meterDevices) {
    await switchbotDeviceRepository.upsertFromSync({
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      deviceType: device.deviceType,
      kind: 'METER',
      hubDeviceId: device.hubDeviceId,
    });
  }

  logger.info(
    { airconCount: airconRemotes.length, meterCount: meterDevices.length },
    'switchbot_devices_synced'
  );
}
