import type { AirconMode, FanSpeedLevel } from '@prisma/client';

export const MODE_LABEL: Record<AirconMode, string> = {
  AUTO: '自動',
  COOL: '冷房',
  DRY: '除湿',
  FAN: '送風',
  HEAT: '暖房',
};

export const FAN_LABEL: Record<FanSpeedLevel, string> = {
  AUTO: '自動',
  LOW: '弱',
  MEDIUM: '中',
  HIGH: '強',
};

export const MODE_OPTIONS: AirconMode[] = ['AUTO', 'COOL', 'DRY', 'FAN', 'HEAT'];
export const FAN_OPTIONS: FanSpeedLevel[] = ['AUTO', 'LOW', 'MEDIUM', 'HIGH'];
