'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from './ListDetailView.module.css';

interface ItemProp {
  id: string;
  title: string;
  note: string | null;
  completed: boolean;
  sortOrder: number;
  createdBy: { id: string; displayName: string };
  completedBy: { id: string; displayName: string } | null;
}

interface ShareProp {
  id: string;
  user: { id: string; displayName: string };
  permission: 'VIEW' | 'EDIT';
}

interface Props {
  listId: string;
  initialName: string;
  canManage: boolean;
  canEditItems: boolean;
  initialItems: ItemProp[];
  initialShares: ShareProp[];
}

export default function ListDetailView({
  listId,
  initialName,
  canManage,
  canEditItems,
  initialItems,
  initialShares,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [items, setItems] = useState(initialItems);
  const [shares, setShares] = useState(initialShares);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lookupUsers, setLookupUsers] = useState<{ id: string; displayName: string }[]>([]);
  const [newShareUserId, setNewShareUserId] = useState('');
  const [newSharePermission, setNewSharePermission] = useState<'VIEW' | 'EDIT'>('VIEW');

  useEffect(() => {
    if (!canManage) return;
    fetch('/api/users/lookup')
      .then((r) => r.json())
      .then((body) => setLookupUsers(body.items ?? []))
      .catch(() => {});
  }, [canManage]);

  async function handleRename() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === initialName) {
      setName(initialName);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/lists/${listId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? '名称変更に失敗しました');
        setName(initialName);
      }
    } catch {
      setError('通信エラーが発生しました');
      setName(initialName);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteList() {
    if (!confirm('このリストを削除しますか？元に戻せません。')) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/lists/${listId}`, { method: 'DELETE' });
      if (!response.ok) {
        const body = await response.json();
        setError(body?.error?.message ?? '削除に失敗しました');
        return;
      }
      router.push('/lists');
      router.refresh();
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setBusy(false);
    }
  }

  async function handleAddItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newItemTitle.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/lists/${listId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newItemTitle }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? '項目の追加に失敗しました');
        return;
      }
      setItems((prev) => [...prev, body]);
      setNewItemTitle('');
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleItem(itemId: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/lists/${listId}/items/${itemId}/toggle`, { method: 'POST' });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? '更新に失敗しました');
        return;
      }
      setItems((prev) => prev.map((i) => (i.id === itemId ? body : i)));
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteItem(itemId: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/lists/${listId}/items/${itemId}`, { method: 'DELETE' });
      if (!response.ok) {
        const body = await response.json();
        setError(body?.error?.message ?? '削除に失敗しました');
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setBusy(false);
    }
  }

  async function handleAddShare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newShareUserId) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/lists/${listId}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: newShareUserId, permission: newSharePermission }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? '共有の追加に失敗しました');
        return;
      }
      setShares((prev) => [...prev, body]);
      setNewShareUserId('');
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateSharePermission(shareId: string, permission: 'VIEW' | 'EDIT') {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/lists/${listId}/shares/${shareId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? '権限の変更に失敗しました');
        return;
      }
      setShares((prev) => prev.map((s) => (s.id === shareId ? body : s)));
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveShare(shareId: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/lists/${listId}/shares/${shareId}`, { method: 'DELETE' });
      if (!response.ok) {
        const body = await response.json();
        setError(body?.error?.message ?? '共有の解除に失敗しました');
        return;
      }
      setShares((prev) => prev.filter((s) => s.id !== shareId));
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setBusy(false);
    }
  }

  const availableUsers = lookupUsers.filter((u) => !shares.some((s) => s.user.id === u.id));
  const sortedItems = items.slice().sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        {canManage ? (
          <input
            className={styles.nameInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleRename}
            disabled={busy}
          />
        ) : (
          <span className={styles.nameInput}>{name}</span>
        )}
        {canManage && (
          <div className={styles.headerButtons}>
            <button
              type="button"
              className={`${styles.iconButton} ${styles.dangerButton}`}
              onClick={handleDeleteList}
              disabled={busy}
            >
              削除
            </button>
          </div>
        )}
      </div>

      {!canEditItems && <p className={styles.notice}>閲覧のみ（編集権限がありません）</p>}
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.itemList}>
        {sortedItems.length === 0 && <p>項目がありません。</p>}
        {sortedItems.map((item) => (
          <div key={item.id} className={`${styles.item} ${item.completed ? styles.itemChecked : ''}`}>
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() => handleToggleItem(item.id)}
              disabled={busy || !canEditItems}
            />
            <div className={styles.itemBody}>
              <div className={styles.itemTitle}>{item.title}</div>
              {item.note && <div className={styles.itemNote}>{item.note}</div>}
            </div>
            {canEditItems && (
              <button
                type="button"
                className={styles.itemDeleteButton}
                onClick={() => handleDeleteItem(item.id)}
                disabled={busy}
              >
                削除
              </button>
            )}
          </div>
        ))}
      </div>

      {canEditItems && (
        <form className={styles.addItemForm} onSubmit={handleAddItem}>
          <input
            placeholder="項目を追加"
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            disabled={busy}
          />
          <button type="submit" disabled={busy}>
            追加
          </button>
        </form>
      )}

      {canManage && (
        <div className={styles.sharePanel}>
          <div className={styles.sharePanelTitle}>共有設定</div>
          {shares.length === 0 && <p>まだ共有されていません。</p>}
          {shares.map((share) => (
            <div key={share.id} className={styles.shareRow}>
              <span>{share.user.displayName}</span>
              <select
                value={share.permission}
                onChange={(e) => handleUpdateSharePermission(share.id, e.target.value as 'VIEW' | 'EDIT')}
                disabled={busy}
              >
                <option value="VIEW">閲覧</option>
                <option value="EDIT">編集</option>
              </select>
              <button
                type="button"
                className={styles.itemDeleteButton}
                onClick={() => handleRemoveShare(share.id)}
                disabled={busy}
              >
                解除
              </button>
            </div>
          ))}

          {availableUsers.length > 0 && (
            <form className={styles.addShareForm} onSubmit={handleAddShare}>
              <select value={newShareUserId} onChange={(e) => setNewShareUserId(e.target.value)} disabled={busy}>
                <option value="">ユーザーを選択</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName}
                  </option>
                ))}
              </select>
              <select
                value={newSharePermission}
                onChange={(e) => setNewSharePermission(e.target.value as 'VIEW' | 'EDIT')}
                disabled={busy}
              >
                <option value="VIEW">閲覧</option>
                <option value="EDIT">編集</option>
              </select>
              <button type="submit" disabled={busy || !newShareUserId}>
                共有
              </button>
            </form>
          )}
        </div>
      )}
    </main>
  );
}
