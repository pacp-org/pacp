import { useCallback, useState } from 'react';
import styles from './FileDrop.module.css';

interface FileDropProps {
  onFiles: (files: FileList) => void;
  loading?: boolean;
}

export function FileDrop({ onFiles, loading }: FileDropProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = e.dataTransfer.files;
      if (files?.length) onFiles(files);
    },
    [onFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files?.length) onFiles(files);
      e.target.value = '';
    },
    [onFiles]
  );

  return (
    <div
      className={`${styles.zone} ${dragOver ? styles.dragOver : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <p className={styles.hint}>
        Arraste arquivos aqui ou use os botões abaixo
      </p>
      <div className={styles.buttons}>
        <label className={styles.fileLabel}>
          <input
            type="file"
            accept=".json,.pacp.json"
            onChange={handleFileInput}
            disabled={!!loading}
            aria-label="Enviar arquivo JSON"
          />
          <span className={styles.btnText}>{loading ? 'Carregando…' : 'Enviar arquivo'}</span>
        </label>
        <label className={styles.fileLabelSecondary}>
          <input
            type="file"
            {...({ webkitDirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
            accept=".json,.pacp.json"
            onChange={handleFileInput}
            disabled={!!loading}
            aria-label="Enviar pasta com catálogo e produtos"
          />
          <span className={styles.btnText}>Enviar pasta</span>
        </label>
      </div>
    </div>
  );
}
