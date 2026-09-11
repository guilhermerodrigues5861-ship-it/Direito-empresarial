import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

type Variant = 'primary' | 'ghost' | 'outline' | 'danger-outline';
type Size = 'md' | 'sm';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  active?: boolean;
}

/** Botão único do sistema: um estilo, variações controladas por prop. */
export function Button({
  variant = 'primary',
  size = 'md',
  active = false,
  className,
  ...rest
}: ButtonProps) {
  const classes = [styles.btn, styles[variant], styles[size], active ? styles.active : '', className]
    .filter(Boolean)
    .join(' ');
  return <button className={classes} {...rest} />;
}
