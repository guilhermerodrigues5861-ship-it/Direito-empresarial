import styles from './Toast.module.css';

interface ToastProps {
  message: string;
  show: boolean;
}

export function Toast({ message, show }: ToastProps) {
  return (
    <div className={[styles.toast, show ? styles.show : ''].join(' ')} role="status" aria-live="polite">
      {message}
    </div>
  );
}
