'use client';

import { useEffect, useState } from 'react';
import { AUDIT_ACTIONS, AUDIT_ACTION_LABEL } from '@/app/lib/auditActionLabels';
import styles from './page.module.css';

interface LogItem {
  id: string;
  action: string;
  user: { id: string; displayName: string } | null;
  targetType: string | null;
  targetId: string | null;
  detail: Record<string, unknown> | null;
  createdAt: string;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP');
}

export default function AuditLogTab() {
  const [items, setItems] = useState<LogItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function buildQuery(cursor?: string): string {
    const params = new URLSearchParams();
    if (actionFilter) params.set('action', actionFilter);
    if (cursor) params.set('cursor', cursor);
    return params.toString();
  }

  async function loadFirstPage() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/audit-logs?${buildQuery()}`);
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? '監査ログの取得に失敗しました');
        return;
      }
      setItems(body.items ?? []);
      setNextCursor(body.nextCursor ?? null);
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/audit-logs?${buildQuery()}`);
        const body = await response.json();
        if (!ignore) {
          if (response.ok) {
            setItems(body.items ?? []);
            setNextCursor(body.nextCursor ?? null);
          } else {
            setError(body?.error?.message ?? '監査ログの取得に失敗しました');
          }
        }
      } catch {
        if (!ignore) setError('通信エラーが発生しました');
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter]);

  async function loadMore() {
    if (!nextCursor) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/audit-logs?${buildQuery(nextCursor)}`);
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? '監査ログの取得に失敗しました');
        return;
      }
      setItems((prev) => [...prev, ...(body.items ?? [])]);
      setNextCursor(body.nextCursor ?? null);
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className={styles.filters}>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
          <option value="">すべての操作</option>
          {AUDIT_ACTIONS.map((action) => (
            <option key={action} value={action}>
              {AUDIT_ACTION_LABEL[action]}
            </option>
          ))}
        </select>
        <button type="button" className={styles.linkButton} onClick={loadFirstPage} disabled={loading}>
          再読み込み
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.table}>
        <div className={`${styles.row} ${styles.rowHeader}`}>
          <span className={styles.col}>日時</span>
          <span className={styles.col}>実行者</span>
          <span className={styles.col}>操作</span>
          <span className={styles.colWide}>詳細</span>
        </div>
        {items.map((log) => (
          <div key={log.id} className={styles.row}>
            <span className={styles.col}>{formatDateTime(log.createdAt)}</span>
            <span className={styles.col}>{log.user?.displayName ?? '—'}</span>
            <span className={styles.col}>
              {AUDIT_ACTION_LABEL[log.action as keyof typeof AUDIT_ACTION_LABEL] ?? log.action}
            </span>
            <span className={`${styles.colWide} ${styles.detail}`}>
              {log.targetType ? `${log.targetType}${log.targetId ? `#${log.targetId}` : ''} ` : ''}
              {log.detail ? JSON.stringify(log.detail) : ''}
            </span>
          </div>
        ))}
        {items.length === 0 && !loading && <p>記録がありません。</p>}
      </div>

      {nextCursor && (
        <button type="button" className={styles.linkButton} onClick={loadMore} disabled={loading}>
          もっと読み込む
        </button>
      )}
    </div>
  );
}
