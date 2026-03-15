import { useEffect } from 'react';
import styles from './Toast.module.css';

interface ToastProps {
  message: string;
  type?: 'error' | 'success' | 'info';
  onDismiss?: () => void;
  autoDismiss?: number;
}

export function Toast({ message, type = 'error', onDismiss, autoDismiss = 5000 }: ToastProps) {
  useEffect(() => {
    if (autoDismiss && onDismiss) {
      const t = setTimeout(onDismiss, autoDismiss);
      return () => clearTimeout(t);
    }
  }, [autoDismiss, onDismiss]);

  const typeClass =
    type === 'error' ? styles.toastError : type === 'success' ? styles.toastSuccess : styles.toastInfo;

  return (
    <div role="alert" aria-live="polite" className={`${styles.toast} ${typeClass}`}>
      <p className={styles.message}>{message}</p>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className={styles.dismiss} aria-label="Fechar mensagem">
          Fechar
        </button>
      )}
    </div>
  );
}
