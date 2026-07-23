'use client';

import { useState } from 'react';
import { formatRelativeTime } from '@/app/lib/formatRelativeTime';
import LineChart from './LineChart';
import styles from './page.module.css';

type Range = '24h' | '7d' | '30d';

interface Point {
  temperature: number;
  humidity: number;
  fetchedAt: string;
}

interface Props {
  deviceId: string;
  deviceName: string;
  temperature: number | null;
  humidity: number | null;
  fetchedAt: string | null;
  fetchOk: boolean;
  initialHistory: Point[];
}

const RANGE_OPTIONS: Range[] = ['24h', '7d', '30d'];
const RANGE_LABEL: Record<Range, string> = { '24h': '24時間', '7d': '7日間', '30d': '30日間' };

export default function SensorHistoryView({
  deviceId,
  deviceName,
  temperature,
  humidity,
  fetchedAt,
  fetchOk,
  initialHistory,
}: Props) {
  const [range, setRange] = useState<Range>('24h');
  const [history, setHistory] = useState<Point[]>(initialHistory);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRangeChange(next: Range) {
    setRange(next);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/sensors/${deviceId}/history?range=${next}`);
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? '履歴の取得に失敗しました');
        return;
      }
      setHistory(body.items);
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>{deviceName}</h1>

      {!fetchOk && <p className={styles.warning}>最終取得に失敗しました（{formatRelativeTime(fetchedAt)}時点）</p>}

      <div className={styles.values}>
        <span className={styles.value}>
          {temperature ?? '—'}
          <span className={styles.unit}>℃</span>
        </span>
        <span className={styles.value}>
          {humidity ?? '—'}
          <span className={styles.unit}>%</span>
        </span>
      </div>
      <p className={styles.meta}>最終取得: {formatRelativeTime(fetchedAt)}</p>

      <div className={styles.tabs}>
        {RANGE_OPTIONS.map((r) => (
          <button
            key={r}
            type="button"
            className={range === r ? styles.tabActive : ''}
            onClick={() => handleRangeChange(r)}
            disabled={loading}
          >
            {RANGE_LABEL[r]}
          </button>
        ))}
      </div>

      {error && <p className={styles.error}>{error}</p>}
      <LineChart points={history} />
    </main>
  );
}
