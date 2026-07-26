import { redirect } from 'next/navigation';
import { requireUser } from '@/server/lib/requireUser';
import { can } from '@/server/domain/permission/permissionService';
import AdminView from './AdminView';

export default async function AdminPage() {
  const user = await requireUser('/admin');
  if (!can(user, 'user.manage')) {
    redirect('/');
  }

  return <AdminView currentUserId={user.id} />;
}
