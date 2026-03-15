import { useState } from 'react';
import type { CatalogDocument, Ruleset, Table } from '@/lib/pacp-types';
import styles from './CatalogPanel.module.css';

interface CatalogPanelProps {
  catalog: CatalogDocument;
}

export function CatalogPanel({ catalog }: CatalogPanelProps) {
  const { catalog: cat, rulesets = [], tables = [], constraints = [], dependencies = [] } = catalog;

  return (
    <div className={styles.wrapper}>
      <section className={styles.section} aria-labelledby="catalog-meta-heading">
        <h3 id="catalog-meta-heading">Catálogo</h3>
        <div className={styles.meta}>
          <span><strong>ID:</strong> {cat.id}</span>
          {cat.name && <span><strong>Nome:</strong> {cat.name}</span>}
          {catalog.profiles && catalog.profiles.length > 0 && (
            <span><strong>Profiles:</strong> {catalog.profiles.join(', ')}</span>
          )}
        </div>
      </section>

      {rulesets.length > 0 && (
        <section className={styles.section} aria-labelledby="rulesets-heading">
          <h3 id="rulesets-heading">Rulesets ({rulesets.length})</h3>
          <div className={styles.accordionList}>
            {rulesets.map((rs) => (
              <AccordionItem key={rs.id} id={rs.id} title={rs.id} badge={rs.target}>
                <RulesetContent ruleset={rs} />
              </AccordionItem>
            ))}
          </div>
        </section>
      )}

      {tables.length > 0 && (
        <section className={styles.section} aria-labelledby="tables-heading">
          <h3 id="tables-heading">Tabelas ({tables.length})</h3>
          <div className={styles.accordionList}>
            {tables.map((t) => (
              <AccordionItem key={t.id} id={t.id} title={t.id}>
                <TableContent table={t} />
              </AccordionItem>
            ))}
          </div>
        </section>
      )}

      {constraints.length > 0 && (
        <section className={styles.section} aria-labelledby="constraints-heading">
          <h3 id="constraints-heading">Constraints ({constraints.length})</h3>
          <ul className={styles.list}>
            {constraints.map((c) => (
              <li key={c.id}>
                <code>{c.id}</code>: {c.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      {dependencies.length > 0 && (
        <section className={styles.section} aria-labelledby="dependencies-heading">
          <h3 id="dependencies-heading">Dependencies ({dependencies.length})</h3>
          <ul className={styles.list}>
            {dependencies.map((d) => (
              <li key={d.id}>
                <code>{d.id}</code> ({d.type})
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function AccordionItem({
  id,
  title,
  badge,
  children,
}: {
  id: string;
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = `accordion-${id}`;

  return (
    <div className={styles.accordion}>
      <button
        type="button"
        className={styles.accordionTrigger}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        id={`accordion-trigger-${id}`}
      >
        <code>{title}</code>
        {badge && <span className={styles.badge}>{badge}</span>}
        <span className={styles.chevron} aria-hidden="true">
          {open ? '▼' : '▶'}
        </span>
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={`accordion-trigger-${id}`}
        className={`${styles.accordionPanel} ${open ? styles.accordionPanelOpen : ''}`}
        hidden={!open}
      >
        {children}
      </div>
    </div>
  );
}

function RulesetContent({ ruleset }: { ruleset: Ruleset }) {
  return (
    <ul className={styles.ruleList}>
      {ruleset.rules.map((r) => (
        <li key={r.id}>
          <span className={styles.ruleOp}>{r.operation}</span>
          {r.value != null && <span>value: {r.value}</span>}
          {r.percent != null && <span>percent: {r.percent}%</span>}
          {r.tableId && <span>tableId: {r.tableId}</span>}
        </li>
      ))}
    </ul>
  );
}

function TableContent({ table }: { table: Table }) {
  const dimKeys = table.dimensions.map((d) => d.key);
  const headers = [...dimKeys, 'Valor'];

  return (
    <div className={styles.tableWrapper}>
      <div className={styles.tableDims}>
        Dimensões: {table.dimensions.map((d) => `${d.key} (${d.source})`).join(', ')}
      </div>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.slice(0, 20).map((r, i) => (
              <tr key={i}>
                {dimKeys.map((k) => (
                  <td key={k}>{String(r.key[k] ?? '-')}</td>
                ))}
                <td>{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.rows.length > 20 && (
        <p className={styles.tableMore}>… e mais {table.rows.length - 20} linhas</p>
      )}
    </div>
  );
}
