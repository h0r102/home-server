import { describe, it, expect } from 'vitest';
import { toSetAllParameter, MODE_CODE, FAN_CODE } from '@/server/integrations/switchbot/airconCommandMapper';

describe('toSetAllParameter', () => {
  it('formats "{temp},{modeCode},{fanCode},{on|off}" per SwitchBot setAll spec', () => {
    expect(toSetAllParameter({ temperature: 26, mode: 'COOL', fanSpeed: 'AUTO', power: true })).toBe('26,2,1,on');
    expect(toSetAllParameter({ temperature: 20, mode: 'HEAT', fanSpeed: 'HIGH', power: false })).toBe('20,5,4,off');
    expect(toSetAllParameter({ temperature: 24, mode: 'AUTO', fanSpeed: 'LOW', power: true })).toBe('24,1,2,on');
    expect(toSetAllParameter({ temperature: 22, mode: 'DRY', fanSpeed: 'MEDIUM', power: true })).toBe('22,3,3,on');
    expect(toSetAllParameter({ temperature: 28, mode: 'FAN', fanSpeed: 'AUTO', power: true })).toBe('28,4,1,on');
  });

  it('mode/fan code tables match documented SwitchBot values', () => {
    expect(MODE_CODE).toEqual({ AUTO: 1, COOL: 2, DRY: 3, FAN: 4, HEAT: 5 });
    expect(FAN_CODE).toEqual({ AUTO: 1, LOW: 2, MEDIUM: 3, HIGH: 4 });
  });
});
