import Link from 'next/link';
import { can } from '@/server/domain/permission/permissionService';
import type { AuthUser } from '@/server/domain/shared/types';
import LogoutButton from './LogoutButton';
import styles from './AppHeader.module.css';

interface Props {
  user: AuthUser;
}

export default function AppHeader({ user }: Props) {
  const canManageUsers = can(user, 'user.manage');

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>
        ホームポータル
      </Link>
      <nav className={styles.nav}>
        <Link href="/aircon">エアコン</Link>
        <Link href="/lists">リスト</Link>
        <Link href="/settings">設定</Link>
        {canManageUsers && <Link href="/admin">管理</Link>}
      </nav>
      <div className={styles.actions}>
        <LogoutButton />
      </div>
    </header>
  );
}
