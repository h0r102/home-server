import Link from 'next/link';
import { formatRelativeTime } from '@/app/lib/formatRelativeTime';
import styles from './SensorSummaryCard.module.css';

interface Props {
  deviceId: string;
  deviceName: string;
  temperature: number | null;
  humidity: number | null;
  fetchedAt: Date | null;
  fetchOk: boolean;
}

export default function SensorSummaryCard({
  deviceId,
  deviceName,
  temperature,
  humidity,
  fetchedAt,
  fetchOk,
}: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.name}>{deviceName}</span>
        {!fetchOk && <span className={styles.badge}>最終取得失敗</span>}
      </div>
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
      <span className={styles.meta}>最終取得: {formatRelativeTime(fetchedAt)}</span>
      <Link href={`/sensors/${deviceId}`} className={styles.link}>
        詳細を開く
      </Link>
    </div>
  );
}
