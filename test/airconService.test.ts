import { describe, it, expect, beforeAll } from 'vitest';
import { userRepository } from '@/server/repositories/userRepository';
import * as airconService from '@/server/domain/aircon/airconService';
import { ForbiddenError, ValidationError, NotFoundError } from '@/server/lib/errors';
import type { AuthUser } from '@/server/domain/shared/types';

function toAuthUser(u: { id: string; username: string; displayName: string; role: 'ADMIN' | 'FAMILY' | 'GUEST' }): AuthUser {
  return u;
}

describe('airconService (SWITCHBOT_MOCK=true)', () => {
  let family: AuthUser;
  let guest: AuthUser;

  beforeAll(async () => {
    const s = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    family = toAuthUser(await userRepository.create({ username: `ac-family-${s}`, passwordHash: 'x', displayName: 'Family', role: 'FAMILY' }));
    guest = toAuthUser(await userRepository.create({ username: `ac-guest-${s}`, passwordHash: 'x', displayName: 'Guest', role: 'GUEST' }));
  });

  it('lists the mock aircon device via listDevices (device sync)', async () => {
    const devices = await airconService.listDevices(family);
    expect(devices.length).toBeGreaterThan(0);
    expect(devices.some((d) => d.name === 'モックエアコン')).toBe(true);
  });

  it('guest cannot operate the aircon (view-only per D1.3)', async () => {
    const devices = await airconService.listDevices(guest);
    const device = devices[0];
    await expect(airconService.setPower(guest, device.id, true)).rejects.toThrow(ForbiddenError);
  });

  it('guest can still view aircon state', async () => {
    const devices = await airconService.listDevices(guest);
    const state = await airconService.getState(guest, devices[0].id);
    expect(state).toHaveProperty('power');
  });

  it('family can set full aircon state, and it persists as the "last known state"', async () => {
    const devices = await airconService.listDevices(family);
    const device = devices[0];

    const updated = await airconService.setAll(family, device.id, {
      power: true,
      temperature: 26,
      mode: 'COOL',
      fanSpeed: 'AUTO',
    });
    expect(updated.power).toBe(true);
    expect(updated.temperature).toBe(26);
    expect(updated.mode).toBe('COOL');
    expect(updated.updatedBy?.id).toBe(family.id);

    const reloaded = await airconService.getState(family, device.id);
    expect(reloaded).toEqual(updated);
  });

  it('setPower preserves the previously set temperature/mode/fanSpeed', async () => {
    const devices = await airconService.listDevices(family);
    const device = devices[0];
    await airconService.setAll(family, device.id, { power: true, temperature: 22, mode: 'HEAT', fanSpeed: 'HIGH' });

    const afterPowerOff = await airconService.setPower(family, device.id, false);
    expect(afterPowerOff.power).toBe(false);
    expect(afterPowerOff.temperature).toBe(22);
    expect(afterPowerOff.mode).toBe('HEAT');
    expect(afterPowerOff.fanSpeed).toBe('HIGH');
  });

  it('rejects an out-of-range temperature', async () => {
    const devices = await airconService.listDevices(family);
    const device = devices[0];
    await expect(
      airconService.setAll(family, device.id, { power: true, temperature: 40, mode: 'COOL', fanSpeed: 'AUTO' })
    ).rejects.toThrow(ValidationError);
  });

  it('throws NotFoundError for a device id that is not an aircon', async () => {
    await expect(airconService.getState(family, 'no-such-device')).rejects.toThrow(NotFoundError);
  });
});
