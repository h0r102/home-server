'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from './ListDetailView.module.css';

interface ItemProp {
  id: string;
  title: string;
  note: string | null;
  tags: string[];
  url: string | null;
  completed: boolean;
  sortOrder: number;
  createdBy: { id: string; displayName: string };
  completedBy: { id: string; displayName: string } | null;
}

interface EditDraft {
  title: string;
  tags: string;
  url: string;
  note: string;
}

function parseTagsInput(value: string): string[] {
  return value
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function urlDisplayLabel(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
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
  const [showAddDetails, setShowAddDetails] = useState(false);
  const [newItemTags, setNewItemTags] = useState('');
  const [newItemUrl, setNewItemUrl] = useState('');
  const [newItemNote, setNewItemNote] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
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
        body: JSON.stringify({
          title: newItemTitle,
          tags: parseTagsInput(newItemTags),
          url: newItemUrl,
          note: newItemNote,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? '項目の追加に失敗しました');
        return;
      }
      setItems((prev) => [...prev, body]);
      setNewItemTitle('');
      setNewItemTags('');
      setNewItemUrl('');
      setNewItemNote('');
      setShowAddDetails(false);
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setBusy(false);
    }
  }

  function handleStartEdit(item: ItemProp) {
    setEditingItemId(item.id);
    setEditDraft({
      title: item.title,
      tags: item.tags.join(', '),
      url: item.url ?? '',
      note: item.note ?? '',
    });
  }

  function handleCancelEdit() {
    setEditingItemId(null);
    setEditDraft(null);
  }

  async function handleSaveEdit(itemId: string) {
    if (!editDraft) return;
    if (!editDraft.title.trim()) {
      setError('項目名を入力してください');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/lists/${listId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editDraft.title,
          tags: parseTagsInput(editDraft.tags),
          url: editDraft.url,
          note: editDraft.note,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? '更新に失敗しました');
        return;
      }
      setItems((prev) => prev.map((i) => (i.id === itemId ? body : i)));
      setEditingItemId(null);
      setEditDraft(null);
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
        {sortedItems.map((item) => {
          if (editingItemId === item.id && editDraft) {
            return (
              <div key={item.id} className={styles.editForm}>
                <input
                  placeholder="項目名"
                  value={editDraft.title}
                  onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
                  disabled={busy}
                />
                <input
                  placeholder="タグ（カンマ区切り）"
                  value={editDraft.tags}
                  onChange={(e) => setEditDraft({ ...editDraft, tags: e.target.value })}
                  disabled={busy}
                />
                <input
                  placeholder="URL"
                  value={editDraft.url}
                  onChange={(e) => setEditDraft({ ...editDraft, url: e.target.value })}
                  disabled={busy}
                />
                <textarea
                  placeholder="メモ"
                  value={editDraft.note}
                  onChange={(e) => setEditDraft({ ...editDraft, note: e.target.value })}
                  disabled={busy}
                />
                <div className={styles.editFormButtons}>
                  <button type="button" onClick={() => handleSaveEdit(item.id)} disabled={busy}>
                    保存
                  </button>
                  <button type="button" className={styles.iconButton} onClick={handleCancelEdit} disabled={busy}>
                    キャンセル
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div key={item.id} className={`${styles.item} ${item.completed ? styles.itemChecked : ''}`}>
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => handleToggleItem(item.id)}
                disabled={busy || !canEditItems}
              />
              <div className={styles.itemBody}>
                <div className={styles.itemTitle}>{item.title}</div>
                {item.tags.length > 0 && (
                  <div className={styles.tagList}>
                    {item.tags.map((tag) => (
                      <span key={tag} className={styles.tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className={styles.itemUrl}>
                    🔗 {urlDisplayLabel(item.url)}
                  </a>
                )}
                {item.note && <div className={styles.itemNote}>{item.note}</div>}
              </div>
              {canEditItems && (
                <div className={styles.itemButtons}>
                  <button type="button" className={styles.iconButton} onClick={() => handleStartEdit(item)} disabled={busy}>
                    編集
                  </button>
                  <button
                    type="button"
                    className={styles.itemDeleteButton}
                    onClick={() => handleDeleteItem(item.id)}
                    disabled={busy}
                  >
                    削除
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {canEditItems && (
        <form className={styles.addItemForm} onSubmit={handleAddItem}>
          <div className={styles.addItemRow}>
            <input
              placeholder="項目を追加"
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              disabled={busy}
            />
            <button type="submit" disabled={busy}>
              追加
            </button>
          </div>
          <button
            type="button"
            className={styles.detailsToggle}
            onClick={() => setShowAddDetails((prev) => !prev)}
          >
            {showAddDetails ? '詳細を閉じる' : '＋ 詳細を追加'}
          </button>
          {showAddDetails && (
            <div className={styles.addItemDetails}>
              <input
                placeholder="タグ（カンマ区切り）"
                value={newItemTags}
                onChange={(e) => setNewItemTags(e.target.value)}
                disabled={busy}
              />
              <input
                placeholder="URL"
                value={newItemUrl}
                onChange={(e) => setNewItemUrl(e.target.value)}
                disabled={busy}
              />
              <textarea
                placeholder="メモ"
                value={newItemNote}
                onChange={(e) => setNewItemNote(e.target.value)}
                disabled={busy}
              />
            </div>
          )}
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
