import { requireUser } from '@/server/lib/requireUser';
import SettingsView from './SettingsView';

const ROLE_LABEL: Record<string, string> = { ADMIN: '管理者', FAMILY: '家族', GUEST: 'ゲスト' };

export default async function SettingsPage() {
  const user = await requireUser('/settings');
  return (
    <SettingsView
      username={user.username}
      displayName={user.displayName}
      roleLabel={ROLE_LABEL[user.role] ?? user.role}
    />
  );
}
