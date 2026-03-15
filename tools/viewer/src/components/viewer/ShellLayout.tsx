import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { CatalogPanel } from './CatalogPanel';
import type { CatalogDocument } from '@/lib/pacp-types';
import styles from './ShellLayout.module.css';

interface ShellLayoutProps {
  catalogName?: string;
  catalogDoc?: CatalogDocument | null;
  onExport: () => void;
  onReset: () => void;
  sidebar: React.ReactNode;
  main: React.ReactNode;
}

export function ShellLayout({ catalogName, catalogDoc, onExport, onReset, sidebar, main }: ShellLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.menuBtn}
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={sidebarOpen}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <h1 className={styles.logo}>PACP Viewer</h1>
          {catalogName && <span className={styles.catalogName}>{catalogName}</span>}
        </div>
        <div className={styles.headerRight}>
          {catalogDoc && (
            <Button variant="ghost" size="sm" onClick={() => setCatalogModalOpen(true)}>
              Estrutura do catálogo
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={onExport}>
            Exportar JSON
          </Button>
          <Button variant="ghost" size="sm" onClick={onReset}>
            Carregar outro
          </Button>
        </div>
      </header>

      <div className={styles.body}>
        <aside
          className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}
          aria-label="Painel lateral"
        >
          <div className={styles.sidebarContent}>{sidebar}</div>
          {sidebarOpen && (
            <div
              className={styles.overlay}
              onClick={() => setSidebarOpen(false)}
              onKeyDown={(e) => e.key === 'Escape' && setSidebarOpen(false)}
              role="button"
              tabIndex={0}
              aria-label="Fechar menu"
            />
          )}
        </aside>

        <main id="main" className={styles.main} tabIndex={-1}>
          {main}
        </main>
      </div>

      {catalogModalOpen && catalogDoc && (
        <div
          className={styles.modalOverlay}
          onClick={() => setCatalogModalOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setCatalogModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="catalog-modal-title"
          tabIndex={0}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 id="catalog-modal-title">Estrutura do catálogo</h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setCatalogModalOpen(false)}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <CatalogPanel catalog={catalogDoc} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
