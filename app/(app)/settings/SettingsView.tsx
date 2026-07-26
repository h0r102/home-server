'use client';

import { useEffect, useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { useWebAuthnSupported } from '@/app/lib/useWebAuthnSupported';
import styles from './page.module.css';

interface CredentialItem {
  id: string;
  deviceName: string;
  createdAt: string;
  lastUsedAt: string | null;
}

interface Props {
  username: string;
  displayName: string;
  roleLabel: string;
}

function guessDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Android/.test(ua)) return 'Android端末';
  if (/Windows/.test(ua)) return 'Windows PC';
  return 'この端末';
}

function formatDate(iso: string | null): string {
  if (!iso) return '未使用';
  return new Date(iso).toLocaleString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' });
}

export default function SettingsView({ username, displayName, roleLabel }: Props) {
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);
  const webauthnSupported = useWebAuthnSupported();
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadCredentials() {
    const response = await fetch('/api/auth/webauthn/credentials');
    if (response.ok) {
      const body = await response.json();
      setCredentials(body.items ?? []);
    }
  }

  useEffect(() => {
    let ignore = false;
    (async () => {
      const response = await fetch('/api/auth/webauthn/credentials');
      if (response.ok && !ignore) {
        const body = await response.json();
        setCredentials(body.items ?? []);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  async function handleRegister() {
    setError(null);
    setRegistering(true);
    try {
      const optionsResponse = await fetch('/api/auth/webauthn/registration-options', { method: 'POST' });
      const optionsJSON = await optionsResponse.json();
      if (!optionsResponse.ok) {
        setError(optionsJSON?.error?.message ?? '登録オプションの取得に失敗しました');
        return;
      }

      const attestation = await startRegistration({ optionsJSON });

      const verifyResponse = await fetch('/api/auth/webauthn/registration-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: attestation, deviceName: guessDeviceName() }),
      });
      const verifyBody = await verifyResponse.json();
      if (!verifyResponse.ok) {
        setError(verifyBody?.error?.message ?? '登録に失敗しました');
        return;
      }
      await loadCredentials();
    } catch (e) {
      if (e instanceof Error && e.name === 'NotAllowedError') return;
      setError('パスキーの登録に失敗しました');
    } finally {
      setRegistering(false);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm('このパスキーを削除しますか？')) return;
    setError(null);
    try {
      const response = await fetch(`/api/auth/webauthn/credentials/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const body = await response.json();
        setError(body?.error?.message ?? '削除に失敗しました');
        return;
      }
      setCredentials((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setError('通信エラーが発生しました');
    }
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>アカウント設定</h1>

      <div className={styles.profile}>
        <div className={styles.profileRow}>
          <span>ユーザー名</span>
          <span>{username}</span>
        </div>
        <div className={styles.profileRow}>
          <span>表示名</span>
          <span>{displayName}</span>
        </div>
        <div className={styles.profileRow}>
          <span>ロール</span>
          <span>{roleLabel}</span>
        </div>
      </div>

      <section>
        <h2 className={styles.sectionTitle}>Face ID / パスキー</h2>
        {error && <p className={styles.error}>{error}</p>}

        {credentials.length === 0 && <p>登録されているパスキーがありません。</p>}
        {credentials.map((c) => (
          <div key={c.id} className={styles.credentialRow}>
            <div>
              <div>{c.deviceName}</div>
              <div className={styles.credentialMeta}>
                登録: {formatDate(c.createdAt)} / 最終利用: {formatDate(c.lastUsedAt)}
              </div>
            </div>
            <button type="button" className={styles.removeButton} onClick={() => handleRemove(c.id)}>
              削除
            </button>
          </div>
        ))}

        {webauthnSupported ? (
          <p style={{ marginTop: 12 }}>
            <button type="button" className={styles.registerButton} onClick={handleRegister} disabled={registering}>
              {registering ? '登録中…' : 'このデバイスでFace IDを登録'}
            </button>
          </p>
        ) : (
          <p className={styles.notice}>このブラウザはパスキーに対応していません。</p>
        )}
      </section>
    </main>
  );
}
