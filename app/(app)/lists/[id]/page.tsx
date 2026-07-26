import { notFound } from 'next/navigation';
import { requireUser } from '@/server/lib/requireUser';
import { can } from '@/server/domain/permission/permissionService';
import * as listService from '@/server/domain/list/listService';
import { NotFoundError } from '@/server/lib/errors';
import ListDetailView from './ListDetailView';
import styles from './page.module.css';

type PageProps = { params: Promise<{ id: string }> };

export default async function ListDetailPage({ params }: PageProps) {
  const user = await requireUser('/lists');
  const { id } = await params;

  let detail: Awaited<ReturnType<typeof listService.getListDetail>> | null = null;
  let notFoundFlag = false;
  let loadError = false;

  try {
    detail = await listService.getListDetail(user, id);
  } catch (e) {
    if (e instanceof NotFoundError) {
      notFoundFlag = true;
    } else {
      loadError = true;
    }
  }

  if (notFoundFlag) {
    notFound();
  }

  if (loadError || !detail) {
    return (
      <main className={styles.main}>
        <p className={styles.error}>リストの取得に失敗しました。</p>
      </main>
    );
  }

  const resourceCtx = {
    ownerId: detail.ownerId,
    shares: detail.shares.map((s) => ({ userId: s.user.id, permission: s.permission })),
  };
  const canManage = can(user, 'list.delete', { list: resourceCtx });
  const canEditItems = can(user, 'list.item.edit', { list: resourceCtx });

  return (
    <ListDetailView
      listId={detail.id}
      initialName={detail.name}
      canManage={canManage}
      canEditItems={canEditItems}
      initialItems={detail.items}
      initialShares={detail.shares}
    />
  );
}
