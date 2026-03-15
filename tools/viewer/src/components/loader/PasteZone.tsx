import { useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import styles from './PasteZone.module.css';

interface PasteZoneProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function PasteZone({ value, onChange, onSubmit, disabled }: PasteZoneProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onSubmit();
      }
    },
    [onSubmit]
  );

  return (
    <div className={styles.wrapper}>
      <label htmlFor="paste-json" className={styles.label}>
        Ou cole o JSON
      </label>
      <textarea
        id="paste-json"
        className={styles.textarea}
        placeholder='{"spec":"1.0.0","document_type":"CATALOG",…}'
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={6}
        disabled={disabled}
        spellCheck={false}
        autoComplete="off"
      />
      <Button
        variant="primary"
        size="md"
        onClick={onSubmit}
        disabled={!value.trim() || disabled}
      >
        Validar e abrir
      </Button>
    </div>
  );
}
