'use client';

import { useState } from 'react';
import UserManagementTab from './UserManagementTab';
import AuditLogTab from './AuditLogTab';
import styles from './page.module.css';

type Tab = 'users' | 'auditlog';

export default function AdminView({ currentUserId }: { currentUserId: string }) {
  const [tab, setTab] = useState<Tab>('users');

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>管理画面</h1>
      <div className={styles.tabs}>
        <button
          type="button"
          className={tab === 'users' ? styles.tabActive : ''}
          onClick={() => setTab('users')}
        >
          ユーザー管理
        </button>
        <button
          type="button"
          className={tab === 'auditlog' ? styles.tabActive : ''}
          onClick={() => setTab('auditlog')}
        >
          監査ログ
        </button>
      </div>

      {tab === 'users' ? <UserManagementTab currentUserId={currentUserId} /> : <AuditLogTab />}
    </main>
  );
}
