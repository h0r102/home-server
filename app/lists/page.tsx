import { requireUser } from '@/server/lib/requireUser';
import { can } from '@/server/domain/permission/permissionService';
import * as listService from '@/server/domain/list/listService';
import CreateListForm from './CreateListForm';
import ListCard from './ListCard';
import styles from './page.module.css';

export default async function ListsPage() {
  const user = await requireUser('/lists');
  const canCreate = can(user, 'list.create');

  let lists: Awaited<ReturnType<typeof listService.listListsForUser>> = [];
  let loadError = false;

  try {
    lists = await listService.listListsForUser(user);
  } catch {
    loadError = true;
  }

  const ownLists = lists.filter((l) => l.role === 'OWNER');
  const sharedLists = lists.filter((l) => l.role !== 'OWNER');

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>リスト</h1>

      {canCreate && <CreateListForm />}
      {loadError && <p className={styles.error}>リストの取得に失敗しました。</p>}

      {!loadError && (
        <>
          <section>
            <h2 className={styles.sectionTitle}>自分のリスト</h2>
            {ownLists.length === 0 ? (
              <p>まだリストがありません。</p>
            ) : (
              <div className={styles.grid}>
                {ownLists.map((list) => (
                  <ListCard
                    key={list.id}
                    id={list.id}
                    name={list.name}
                    itemCount={list.itemCount}
                    completedCount={list.completedCount}
                    isShared={false}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className={styles.sectionTitle}>共有されているリスト</h2>
            {sharedLists.length === 0 ? (
              <p>共有されたリストがありません。</p>
            ) : (
              <div className={styles.grid}>
                {sharedLists.map((list) => (
                  <ListCard
                    key={list.id}
                    id={list.id}
                    name={list.name}
                    itemCount={list.itemCount}
                    completedCount={list.completedCount}
                    isShared
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
