'use client';

import { useState } from 'react';
import type { AirconMode, FanSpeedLevel } from '@prisma/client';
import { MODE_LABEL, FAN_LABEL, MODE_OPTIONS, FAN_OPTIONS } from '@/app/lib/airconLabels';
import styles from './AirconControlPanel.module.css';

export interface AirconStateProp {
  power: boolean;
  temperature: number;
  mode: AirconMode;
  fanSpeed: FanSpeedLevel;
  updatedAt: string;
  updatedByName: string | null;
}

interface Props {
  deviceId: string;
  deviceName: string;
  initialState: AirconStateProp;
  canOperate: boolean;
}

function formatUpdatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ja-JP', { hour: '2-digit', minute: '2-digit', month: 'numeric', day: 'numeric' });
}

export default function AirconControlPanel({ deviceId, deviceName, initialState, canOperate }: Props) {
  const [confirmed, setConfirmed] = useState(initialState);
  const [draft, setDraft] = useState({
    power: initialState.power,
    temperature: initialState.temperature,
    mode: initialState.mode,
    fanSpeed: initialState.fanSpeed,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    draft.power !== confirmed.power ||
    draft.temperature !== confirmed.temperature ||
    draft.mode !== confirmed.mode ||
    draft.fanSpeed !== confirmed.fanSpeed;

  async function handlePowerToggle() {
    const nextPower = !draft.power;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/aircon/${deviceId}/power`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ power: nextPower }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? '電源の切り替えに失敗しました');
        return;
      }
      const nextState: AirconStateProp = {
        power: body.power,
        temperature: body.temperature,
        mode: body.mode,
        fanSpeed: body.fanSpeed,
        updatedAt: body.updatedAt,
        updatedByName: body.updatedBy?.displayName ?? null,
      };
      setConfirmed(nextState);
      setDraft({ power: nextState.power, temperature: nextState.temperature, mode: nextState.mode, fanSpeed: nextState.fanSpeed });
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApply() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/aircon/${deviceId}/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? '設定の反映に失敗しました');
        setDraft({ power: confirmed.power, temperature: confirmed.temperature, mode: confirmed.mode, fanSpeed: confirmed.fanSpeed });
        return;
      }
      const nextState: AirconStateProp = {
        power: body.power,
        temperature: body.temperature,
        mode: body.mode,
        fanSpeed: body.fanSpeed,
        updatedAt: body.updatedAt,
        updatedByName: body.updatedBy?.displayName ?? null,
      };
      setConfirmed(nextState);
      setDraft({ power: nextState.power, temperature: nextState.temperature, mode: nextState.mode, fanSpeed: nextState.fanSpeed });
    } catch {
      setError('通信エラーが発生しました');
      setDraft({ power: confirmed.power, temperature: confirmed.temperature, mode: confirmed.mode, fanSpeed: confirmed.fanSpeed });
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = submitting || !canOperate;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.name}>{deviceName}</span>
        <button
          type="button"
          className={`${styles.powerButton} ${draft.power ? styles.powerButtonOn : ''}`}
          onClick={handlePowerToggle}
          disabled={disabled}
        >
          {draft.power ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className={styles.row}>
        <span className={styles.rowLabel}>設定温度</span>
        <div className={styles.stepper}>
          <button
            type="button"
            onClick={() => setDraft((d) => ({ ...d, temperature: Math.max(18, d.temperature - 1) }))}
            disabled={disabled}
          >
            −
          </button>
          <span className={styles.stepperValue}>{draft.temperature}℃</span>
          <button
            type="button"
            onClick={() => setDraft((d) => ({ ...d, temperature: Math.min(30, d.temperature + 1) }))}
            disabled={disabled}
          >
            ＋
          </button>
        </div>
      </div>

      <div className={styles.row}>
        <span className={styles.rowLabel}>運転モード</span>
        <div className={styles.segmented}>
          {MODE_OPTIONS.map((mode) => (
            <button
              key={mode}
              type="button"
              className={draft.mode === mode ? styles.segmentedActive : ''}
              onClick={() => setDraft((d) => ({ ...d, mode }))}
              disabled={disabled}
            >
              {MODE_LABEL[mode]}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.row}>
        <span className={styles.rowLabel}>風量</span>
        <div className={styles.segmented}>
          {FAN_OPTIONS.map((fanSpeed) => (
            <button
              key={fanSpeed}
              type="button"
              className={draft.fanSpeed === fanSpeed ? styles.segmentedActive : ''}
              onClick={() => setDraft((d) => ({ ...d, fanSpeed }))}
              disabled={disabled}
            >
              {FAN_LABEL[fanSpeed]}
            </button>
          ))}
        </div>
      </div>

      {canOperate && (
        <button type="button" className={styles.applyButton} onClick={handleApply} disabled={submitting || !dirty}>
          {submitting ? '送信中…' : '適用'}
        </button>
      )}

      {!canOperate && <p className={styles.readOnlyNotice}>閲覧のみ（操作権限がありません）</p>}
      {error && <p className={styles.error}>{error}</p>}

      <p className={styles.meta}>
        最終操作: {confirmed.updatedByName ?? '—'} {formatUpdatedAt(confirmed.updatedAt)}
      </p>
    </div>
  );
}
