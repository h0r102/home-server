import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger';
};

export default function Button({ variant = 'primary', className, type = 'button', ...props }: ButtonProps) {
  const combined = [styles.button, styles[variant], className].filter(Boolean).join(' ');
  return <button type={type} className={combined} {...props} />;
}
