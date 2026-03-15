import { memo } from 'react';
import { Card } from '@/components/ui/Card';
import styles from './ExampleCard.module.css';

export interface Example {
  label: string;
  description?: string;
  url: string;
  base: string;
}

interface ExampleCardProps {
  example: Example;
  onClick: () => void;
  loading?: boolean;
  progress?: { loaded: number; total: number };
}

function ExampleCardInner({ example, onClick, loading, progress }: ExampleCardProps) {
  return (
    <Card as="article" className={styles.card}>
      <button
        type="button"
        className={styles.button}
        onClick={onClick}
        disabled={!!loading}
        aria-label={`Carregar exemplo: ${example.label}`}
      >
        <span className={styles.icon} aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </span>
        <span className={styles.label}>{example.label}</span>
        {example.description && (
          <span className={styles.desc}>{example.description}</span>
        )}
        {loading && (
          <span className={styles.loading}>
            {progress && progress.total > 10
              ? `${progress.loaded}/${progress.total} produtos`
              : 'Validando…'}
          </span>
        )}
      </button>
    </Card>
  );
}

export const ExampleCard = memo(ExampleCardInner);
