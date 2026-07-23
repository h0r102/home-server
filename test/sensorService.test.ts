import { describe, it, expect, beforeAll } from 'vitest';
import { userRepository } from '@/server/repositories/userRepository';
import * as sensorService from '@/server/domain/sensor/sensorService';
import { ValidationError, NotFoundError } from '@/server/lib/errors';
import type { AuthUser } from '@/server/domain/shared/types';

function toAuthUser(u: { id: string; username: string; displayName: string; role: 'ADMIN' | 'FAMILY' | 'GUEST' }): AuthUser {
  return u;
}

describe('sensorService (SWITCHBOT_MOCK=true)', () => {
  let guest: AuthUser;

  beforeAll(async () => {
    const s = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    guest = toAuthUser(await userRepository.create({ username: `sensor-guest-${s}`, passwordHash: 'x', displayName: 'Guest', role: 'GUEST' }));
  });

  it('sensor.view is allowed for every role, including guest', async () => {
    const items = await sensorService.listLatest(guest);
    expect(Array.isArray(items)).toBe(true);
  });

  it('pollAllDevices syncs the mock meter device and records a reading', async () => {
    await sensorService.pollAllDevices();

    const items = await sensorService.listLatest(guest);
    const meter = items.find((s) => s.deviceName === 'モックセンサー');
    expect(meter).toBeDefined();
    expect(meter?.temperature).toBe(25);
    expect(meter?.humidity).toBe(50);
    expect(meter?.fetchOk).toBe(true);
  });

  it('getHistory rejects an invalid range', async () => {
    const items = await sensorService.listLatest(guest);
    const meter = items[0];
    // @ts-expect-error intentionally invalid range to exercise validation
    await expect(sensorService.getHistory(guest, meter.deviceId, 'invalid')).rejects.toThrow(ValidationError);
  });

  it('getHistory returns readings within the requested window', async () => {
    const items = await sensorService.listLatest(guest);
    const meter = items[0];
    const history = await sensorService.getHistory(guest, meter.deviceId, '24h');
    expect(history.length).toBeGreaterThan(0);
    expect(history[0]).toHaveProperty('temperature');
    expect(history[0]).toHaveProperty('humidity');
  });

  it('throws NotFoundError for a device id that is not a meter', async () => {
    await expect(sensorService.getSummary(guest, 'no-such-device')).rejects.toThrow(NotFoundError);
  });
});
