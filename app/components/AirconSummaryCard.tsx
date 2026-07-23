'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { AirconMode } from '@prisma/client';
import { MODE_LABEL } from '@/app/lib/airconLabels';
import styles from './AirconSummaryCard.module.css';

interface Props {
  deviceId: string;
  deviceName: string;
  initialPower: boolean;
  initialTemperature: number;
  initialMode: AirconMode;
  canOperate: boolean;
}

export default function AirconSummaryCard({
  deviceId,
  deviceName,
  initialPower,
  initialTemperature,
  initialMode,
  canOperate,
}: Props) {
  const [power, setPower] = useState(initialPower);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/aircon/${deviceId}/power`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ power: !power }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? '操作に失敗しました');
        return;
      }
      setPower(body.power);
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.name}>{deviceName}</span>
        {canOperate && (
          <button
            type="button"
            className={`${styles.powerButton} ${power ? styles.powerButtonOn : ''}`}
            onClick={handleToggle}
            disabled={submitting}
          >
            {power ? 'ON' : 'OFF'}
          </button>
        )}
      </div>
      <span className={styles.summary}>{initialTemperature}℃</span>
      <span className={styles.mode}>{MODE_LABEL[initialMode]}</span>
      {error && <p className={styles.error}>{error}</p>}
      <Link href="/aircon" className={styles.link}>
        詳細を開く
      </Link>
    </div>
  );
}
