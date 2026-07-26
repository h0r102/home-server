'use client';

import { useEffect, useState, type FormEvent } from 'react';
import styles from './page.module.css';

interface UserItem {
  id: string;
  username: string;
  displayName: string;
  role: 'ADMIN' | 'FAMILY' | 'GUEST';
  createdAt: string;
}

const ROLE_LABEL: Record<UserItem['role'], string> = { ADMIN: '管理者', FAMILY: '家族', GUEST: 'ゲスト' };

export default function UserManagementTab({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<UserItem['role']>('FAMILY');

  const [editDisplayName, setEditDisplayName] = useState('');
  const [editRole, setEditRole] = useState<UserItem['role']>('FAMILY');
  const [editPassword, setEditPassword] = useState('');

  async function loadUsers() {
    const response = await fetch('/api/users');
    if (response.ok) {
      const body = await response.json();
      setUsers(body.items ?? []);
    }
  }

  useEffect(() => {
    let ignore = false;
    (async () => {
      const response = await fetch('/api/users');
      if (response.ok && !ignore) {
        const body = await response.json();
        setUsers(body.items ?? []);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          displayName: newDisplayName || newUsername,
          role: newRole,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? 'ユーザーの作成に失敗しました');
        return;
      }
      setNewUsername('');
      setNewPassword('');
      setNewDisplayName('');
      setNewRole('FAMILY');
      setShowCreateForm(false);
      await loadUsers();
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setBusy(false);
    }
  }

  function startEdit(user: UserItem) {
    setEditingId(user.id);
    setEditDisplayName(user.displayName);
    setEditRole(user.role);
    setEditPassword('');
    setError(null);
  }

  async function handleSaveEdit(userId: string) {
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { displayName: editDisplayName, role: editRole };
      if (editPassword) body.password = editPassword;

      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const responseBody = await response.json();
      if (!response.ok) {
        setError(responseBody?.error?.message ?? '更新に失敗しました');
        return;
      }
      setEditingId(null);
      await loadUsers();
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm('このユーザーを削除しますか？関連するセッションは即座に失効します。')) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? '削除に失敗しました');
        return;
      }
      await loadUsers();
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setBusy(false);
    }
  }

  const adminCount = users.filter((u) => u.role === 'ADMIN').length;

  return (
    <div>
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.table}>
        <div className={`${styles.row} ${styles.rowHeader}`}>
          <span className={styles.col}>ユーザー名</span>
          <span className={styles.col}>表示名</span>
          <span className={styles.colNarrow}>ロール</span>
          <span className={styles.colWide}>操作</span>
        </div>
        {users.map((user) => {
          const isLastAdmin = user.role === 'ADMIN' && adminCount <= 1;
          return editingId === user.id ? (
            <div key={user.id} className={styles.row}>
              <span className={styles.col}>{user.username}</span>
              <span className={styles.col}>
                <input value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} disabled={busy} />
              </span>
              <span className={styles.colNarrow}>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserItem['role'])}
                  disabled={busy || isLastAdmin}
                  title={isLastAdmin ? '最後の管理者のロールは変更できません' : undefined}
                >
                  <option value="ADMIN">管理者</option>
                  <option value="FAMILY">家族</option>
                  <option value="GUEST">ゲスト</option>
                </select>
              </span>
              <span className={styles.colWide}>
                <input
                  type="password"
                  placeholder="新しいパスワード(任意)"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  disabled={busy}
                  style={{ marginRight: 8 }}
                />
                <button type="button" className={styles.linkButton} onClick={() => handleSaveEdit(user.id)} disabled={busy}>
                  保存
                </button>{' '}
                <button type="button" className={styles.linkButton} onClick={() => setEditingId(null)} disabled={busy}>
                  キャンセル
                </button>
              </span>
            </div>
          ) : (
            <div key={user.id} className={styles.row}>
              <span className={styles.col}>{user.username}</span>
              <span className={styles.col}>
                {user.displayName}
                {user.id === currentUserId && '（自分）'}
              </span>
              <span className={styles.colNarrow}>{ROLE_LABEL[user.role]}</span>
              <span className={styles.colWide}>
                <button type="button" className={styles.linkButton} onClick={() => startEdit(user)} disabled={busy}>
                  編集
                </button>{' '}
                <button
                  type="button"
                  className={`${styles.linkButton} ${styles.dangerButton}`}
                  onClick={() => handleDelete(user.id)}
                  disabled={busy || isLastAdmin}
                  title={isLastAdmin ? '最後の管理者は削除できません' : undefined}
                >
                  削除
                </button>
              </span>
            </div>
          );
        })}
      </div>

      {showCreateForm ? (
        <form className={styles.form} onSubmit={handleCreate}>
          <input placeholder="ユーザー名" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} disabled={busy} required />
          <input
            type="password"
            placeholder="初期パスワード(8文字以上)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={busy}
            required
          />
          <input
            placeholder="表示名(未入力ならユーザー名と同じ)"
            value={newDisplayName}
            onChange={(e) => setNewDisplayName(e.target.value)}
            disabled={busy}
          />
          <select value={newRole} onChange={(e) => setNewRole(e.target.value as UserItem['role'])} disabled={busy}>
            <option value="ADMIN">管理者</option>
            <option value="FAMILY">家族</option>
            <option value="GUEST">ゲスト</option>
          </select>
          <div>
            <button type="submit" disabled={busy}>
              作成
            </button>{' '}
            <button type="button" className={styles.linkButton} onClick={() => setShowCreateForm(false)} disabled={busy}>
              キャンセル
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className={styles.linkButton} onClick={() => setShowCreateForm(true)}>
          + ユーザーを追加
        </button>
      )}
    </div>
  );
}
