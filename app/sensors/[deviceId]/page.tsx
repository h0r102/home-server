import { notFound } from 'next/navigation';
import { requireUser } from '@/server/lib/requireUser';
import * as sensorService from '@/server/domain/sensor/sensorService';
import { NotFoundError } from '@/server/lib/errors';
import SensorHistoryView from './SensorHistoryView';
import styles from './page.module.css';

type PageProps = { params: Promise<{ deviceId: string }> };

export default async function SensorDetailPage({ params }: PageProps) {
  const user = await requireUser('/');
  const { deviceId } = await params;

  let summary: Awaited<ReturnType<typeof sensorService.getSummary>> | null = null;
  let history: Awaited<ReturnType<typeof sensorService.getHistory>> = [];
  let notFoundFlag = false;
  let loadError = false;

  try {
    summary = await sensorService.getSummary(user, deviceId);
    history = await sensorService.getHistory(user, deviceId, '24h');
  } catch (e) {
    if (e instanceof NotFoundError) {
      notFoundFlag = true;
    } else {
      loadError = true;
    }
  }

  if (notFoundFlag) {
    notFound();
  }

  if (loadError || !summary) {
    return (
      <main className={styles.main}>
        <p className={styles.error}>センサー情報の取得に失敗しました。</p>
      </main>
    );
  }

  return (
    <SensorHistoryView
      deviceId={summary.deviceId}
      deviceName={summary.deviceName}
      temperature={summary.temperature}
      humidity={summary.humidity}
      fetchedAt={summary.fetchedAt?.toISOString() ?? null}
      fetchOk={summary.fetchOk}
      initialHistory={history.map((h) => ({
        temperature: h.temperature,
        humidity: h.humidity,
        fetchedAt: h.fetchedAt.toISOString(),
      }))}
    />
  );
}
