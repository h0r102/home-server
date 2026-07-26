import { requireUser } from '@/server/lib/requireUser';
import AppHeader from '@/app/components/AppHeader';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser('/');

  return (
    <>
      <AppHeader user={user} />
      {children}
    </>
  );
}
