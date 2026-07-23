import * as sensorService from '@/server/domain/sensor/sensorService';
import { sensorReadingRepository } from '@/server/repositories/sensorReadingRepository';
import { logger } from '@/server/lib/logger';

const POLL_INTERVAL_MS = 10 * 60 * 1000;
const RETENTION_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const RETENTION_DAYS = 180;

let isPolling = false;

function scheduleNextPoll(): void {
  setTimeout(async () => {
    if (!isPolling) {
      isPolling = true;
      try {
        await sensorService.pollAllDevices();
      } catch (err) {
        logger.error({ err }, 'sensor_polling_failed');
      } finally {
        isPolling = false;
      }
    }
    scheduleNextPoll();
  }, POLL_INTERVAL_MS);
}

function scheduleNextRetentionCleanup(): void {
  setTimeout(async () => {
    try {
      const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
      const { count } = await sensorReadingRepository.deleteOlderThan(cutoff);
      if (count > 0) {
        logger.info({ count }, 'sensor_reading_retention_cleanup');
      }
    } catch (err) {
      logger.error({ err }, 'sensor_retention_cleanup_failed');
    }
    scheduleNextRetentionCleanup();
  }, RETENTION_CHECK_INTERVAL_MS);
}

export function startSensorPolling(): void {
  const g = globalThis as unknown as { __sensorPollingStarted?: boolean };
  if (g.__sensorPollingStarted) return;
  g.__sensorPollingStarted = true;

  // 起動直後に1回実行してから10分間隔でポーリング(D1.5)
  setTimeout(async () => {
    isPolling = true;
    try {
      await sensorService.pollAllDevices();
    } catch (err) {
      logger.error({ err }, 'sensor_polling_failed');
    } finally {
      isPolling = false;
    }
    scheduleNextPoll();
  }, 0);

  scheduleNextRetentionCleanup();
}
