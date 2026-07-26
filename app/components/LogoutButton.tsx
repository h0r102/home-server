'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Button from './ui/Button';

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
      router.refresh();
    }
  }

  return (
    <Button type="button" variant="secondary" onClick={handleClick} disabled={loading}>
      {loading ? 'ログアウト中…' : 'ログアウト'}
    </Button>
  );
}
