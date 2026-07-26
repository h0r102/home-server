import Link from 'next/link';
import styles from './page.module.css';

interface Props {
  id: string;
  name: string;
  itemCount: number;
  completedCount: number;
  isShared: boolean;
}

export default function ListCard({ id, name, itemCount, completedCount, isShared }: Props) {
  const remaining = itemCount - completedCount;
  return (
    <Link href={`/lists/${id}`} className={styles.card}>
      <div>
        <div className={styles.cardName}>{name}</div>
        <div className={styles.cardMeta}>
          未完了 {remaining} / 全{itemCount}件
        </div>
      </div>
      {isShared && <span className={styles.shareIcon}>共有中</span>}
    </Link>
  );
}
