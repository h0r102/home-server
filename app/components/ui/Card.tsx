import type { HTMLAttributes } from 'react';
import styles from './Card.module.css';

type CardProps = HTMLAttributes<HTMLDivElement>;

export default function Card({ className, ...props }: CardProps) {
  const combined = className ? `${styles.card} ${className}` : styles.card;
  return <div className={combined} {...props} />;
}
