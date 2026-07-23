import type { AirconMode, FanSpeedLevel } from '@prisma/client';

export const MODE_CODE: Record<AirconMode, number> = {
  AUTO: 1,
  COOL: 2,
  DRY: 3,
  FAN: 4,
  HEAT: 5,
};

export const FAN_CODE: Record<FanSpeedLevel, number> = {
  AUTO: 1,
  LOW: 2,
  MEDIUM: 3,
  HIGH: 4,
};

export function toSetAllParameter(state: {
  temperature: number;
  mode: AirconMode;
  fanSpeed: FanSpeedLevel;
  power: boolean;
}): string {
  return `${state.temperature},${MODE_CODE[state.mode]},${FAN_CODE[state.fanSpeed]},${state.power ? 'on' : 'off'}`;
}
