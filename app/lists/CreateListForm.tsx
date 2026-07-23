'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function CreateListForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? 'リストの作成に失敗しました');
        return;
      }
      setName('');
      router.refresh();
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.createForm} onSubmit={handleSubmit}>
      <input
        placeholder="新しいリスト名"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={submitting}
        required
      />
      <button type="submit" disabled={submitting}>
        作成
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}
