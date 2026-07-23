'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { startAuthentication } from '@simplewebauthn/browser';
import { useWebAuthnSupported } from '@/app/lib/useWebAuthnSupported';
import styles from './page.module.css';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const webauthnSupported = useWebAuthnSupported();

  function goToRedirectTarget() {
    const redirectTo = searchParams.get('redirect') || '/';
    router.push(redirectTo);
    router.refresh();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error?.message ?? 'ログインに失敗しました');
        return;
      }
      goToRedirectTarget();
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePasskeyLogin() {
    setError(null);
    setSubmitting(true);
    try {
      const optionsResponse = await fetch('/api/auth/webauthn/authentication-options', { method: 'POST' });
      const optionsBody = await optionsResponse.json();
      if (!optionsResponse.ok) {
        setError(optionsBody?.error?.message ?? 'パスキー認証を開始できませんでした');
        return;
      }

      const assertion = await startAuthentication({ optionsJSON: optionsBody.options });

      const verifyResponse = await fetch('/api/auth/webauthn/authentication-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowId: optionsBody.flowId, response: assertion }),
      });
      if (!verifyResponse.ok) {
        const body = await verifyResponse.json().catch(() => null);
        setError(body?.error?.message ?? 'パスキー認証に失敗しました');
        return;
      }
      goToRedirectTarget();
    } catch (e) {
      if (e instanceof Error && e.name === 'NotAllowedError') return;
      setError('パスキー認証に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>ホームポータル</h1>
        <div className={styles.field}>
          <label htmlFor="username">ユーザー名</label>
          <input
            id="username"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={submitting}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="password">パスワード</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            required
          />
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? 'ログイン中…' : 'ログイン'}
        </button>
        {webauthnSupported && (
          <button type="button" className={styles.secondary} onClick={handlePasskeyLogin} disabled={submitting}>
            Face IDでログイン
          </button>
        )}
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
