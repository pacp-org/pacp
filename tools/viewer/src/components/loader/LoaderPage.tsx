import { useCallback, useState } from 'react';
import { validatePacp, parsePacpJson } from '@/lib/validate';
import type { PacpDocument, PackedDocument } from '@/lib/pacp-types';
import { ExampleCard, type Example } from './ExampleCard';
import { PasteZone } from './PasteZone';
import { FileDrop } from './FileDrop';
import { Toast } from '@/components/ui/Toast';
import styles from './LoaderPage.module.css';

/** Base para exemplos: em dev usa /spec/ local; em prod usa GitHub raw. */
function getExamplesBase(): string {
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return `${window.location.origin}/spec/1.0.0/examples/`;
  }
  return 'https://raw.githubusercontent.com/pacp-org/pacp/main/spec/1.0.0/examples/';
}

function getExamples(): Example[] {
  const base = getExamplesBase();
  return [
    {
      label: 'Loja teste (real)',
      description: 'Catálogo completo com centenas de produtos',
      url: `${base}loja-teste/brazil-contemporaneo.catalog.pacp.json`,
      base: `${base}loja-teste/`,
    },
    {
      label: 'Móveis (MAX_OF)',
      description: 'Operação MAX_OF em rulesets',
      url: `${base}moveis/max_of.json`,
      base: `${base}moveis/`,
    },
    {
      label: 'Iluminação (LOOKUP)',
      description: 'Tabela matricial de preços',
      url: `${base}iluminacao/matrix_lookup.json`,
      base: `${base}iluminacao/`,
    },
    {
      label: 'Mínimo',
      description: 'Catálogo mínimo para começar',
      url: `${base}geral/minimal.json`,
      base: `${base}geral/`,
    },
    {
      label: 'Multi lista',
      description: 'Múltiplas listas de preço',
      url: `${base}geral/multi_price_list.json`,
      base: `${base}geral/`,
    },
  ];
}

const FETCH_CONCURRENCY = 12;

async function fetchWithConcurrency<T>(
  items: string[],
  fetcher: (url: string) => Promise<T | null>,
  onProgress?: (loaded: number, total: number) => void
): Promise<T[]> {
  const results: T[] = [];
  let idx = 0;
  async function worker(): Promise<void> {
    while (idx < items.length) {
      const i = idx++;
      try {
        const val = await fetcher(items[i]);
        if (val !== null) results.push(val);
      } catch {
        /* ignore */
      }
      onProgress?.(results.length, items.length);
    }
  }
  const workers = Array(Math.min(FETCH_CONCURRENCY, items.length)).fill(null).map(() => worker());
  await Promise.all(workers);
  return results;
}

interface LoaderPageProps {
  onLoad: (doc: PacpDocument, products: PacpDocument[]) => void;
}

export function LoaderPage({ onLoad }: LoaderPageProps) {
  const [pasteValue, setPasteValue] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: 'error' | 'success' } | null>(null);

  const processDocument = useCallback(
    async (raw: unknown): Promise<{ doc: PacpDocument; products: PacpDocument[] }> => {
      if (raw && typeof raw === 'object' && 'catalog' in raw && 'products' in raw) {
        const packed = raw as PackedDocument;
        return { doc: packed.catalog, products: packed.products };
      }
      const doc = raw as PacpDocument;
      if (doc.document_type === 'PRODUCT') {
        return { doc, products: [doc] };
      }
      return { doc, products: [] };
    },
    []
  );

  const loadAndValidate = useCallback(
    async (raw: unknown) => {
      setToast(null);
      try {
        const result = await validatePacp(raw);
        if (!result.valid) {
          setToast({
            message: `Validação falhou: ${result.issues.length} erro(s). ${result.issues.slice(0, 2).map((i) => `${i.path}: ${i.message}`).join('; ')}`,
            type: 'error',
          });
          return;
        }
        const { doc, products } = await processDocument(raw);
        onLoad(doc, products);
      } catch (e) {
        setToast({ message: e instanceof Error ? e.message : 'Erro desconhecido', type: 'error' });
      }
    },
    [onLoad, processDocument]
  );

  const handlePaste = useCallback(async () => {
    try {
      const parsed = parsePacpJson(pasteValue);
      await loadAndValidate(parsed);
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Erro ao parsear JSON', type: 'error' });
    }
  }, [pasteValue, loadAndValidate]);

  const handleFileUpload = useCallback(
    async (files: FileList) => {
      setLoading(files.length > 1 ? `${files.length} arquivos` : files[0].name);
      setToast(null);
      setLoadProgress(null);
      try {
        if (files.length === 1) {
          const text = await files[0].text();
          const parsed = parsePacpJson(text);
          await loadAndValidate(parsed);
        } else {
          const catalogIds = new Set<string>();
          let catalog: PacpDocument | null = null;
          const productMap = new Map<string, PacpDocument>();
          for (let i = 0; i < files.length; i++) {
            const f = files[i];
            if (!f.name.endsWith('.json') && !f.name.endsWith('.pacp.json')) continue;
            try {
              const text = await f.text();
              const doc = parsePacpJson(text) as PacpDocument;
              if (doc.document_type === 'CATALOG') {
                catalog = doc;
                if (catalog.product_refs) {
                  for (const ref of catalog.product_refs) catalogIds.add(ref.id);
                }
              } else if (doc.document_type === 'PRODUCT' && doc.product) {
                productMap.set(doc.product.id, doc);
              }
            } catch {
              /* skip */
            }
            if (files.length > 20) setLoadProgress({ loaded: i + 1, total: files.length });
          }
          setLoadProgress(null);
          if (!catalog) {
            setToast({ message: 'Nenhum arquivo de catálogo (document_type: CATALOG) encontrado.', type: 'error' });
            return;
          }
          const result = await validatePacp(catalog);
          if (!result.valid) {
            setToast({ message: `Validação falhou: ${result.issues.length} erro(s)`, type: 'error' });
            return;
          }
          const products: PacpDocument[] = [];
          for (const id of catalogIds) {
            const prod = productMap.get(id);
            if (prod) products.push(prod);
          }
          onLoad(catalog, products);
        }
      } catch (e) {
        setToast({ message: e instanceof Error ? e.message : 'Erro ao ler arquivo', type: 'error' });
      } finally {
        setLoading(null);
        setLoadProgress(null);
      }
    },
    [loadAndValidate, onLoad]
  );

  const handleLoadExample = useCallback(
    async (ex: Example) => {
      setLoading(ex.label);
      setLoadProgress(null);
      setToast(null);
      try {
        const res = await fetch(ex.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const catalog = (await res.json()) as PacpDocument;
        const result = await validatePacp(catalog);
        if (!result.valid) {
          setToast({ message: `Validação falhou: ${result.issues.length} erro(s)`, type: 'error' });
          setLoading(null);
          return;
        }
        let products: PacpDocument[] = [];
        if (catalog.document_type === 'CATALOG' && catalog.product_refs) {
          const urls = catalog.product_refs.map((ref) =>
            ref.path.startsWith('http') ? ref.path : `${ex.base}${ref.path}`
          );
          setLoadProgress({ loaded: 0, total: urls.length });
          products = await fetchWithConcurrency(
            urls,
            async (url) => {
              const pr = await fetch(url);
              if (!pr.ok) return null;
              return (await pr.json()) as PacpDocument;
            },
            (loaded, total) => setLoadProgress({ loaded, total })
          );
        }
        setLoadProgress(null);
        onLoad(catalog, products);
      } catch (e) {
        setToast({ message: e instanceof Error ? e.message : 'Erro ao carregar exemplo', type: 'error' });
      } finally {
        setLoading(null);
        setLoadProgress(null);
      }
    },
    [onLoad]
  );

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h1 className={styles.title}>Visualizador PACP</h1>
        <p className={styles.subtitle}>
          Envie um arquivo, cole um JSON ou carregue um exemplo para explorar o catálogo e a formação de preços.
        </p>
      </header>

      <section className={styles.section} aria-labelledby="examples-heading">
        <h2 id="examples-heading" className={styles.sectionTitle}>
          Exemplos oficiais
        </h2>
        <div className={styles.examplesGrid}>
          {getExamples().map((ex) => (
            <ExampleCard
              key={ex.url}
              example={ex}
              onClick={() => handleLoadExample(ex)}
              loading={loading === ex.label}
              progress={loadProgress ?? undefined}
            />
          ))}
        </div>
        {loadProgress && loadProgress.total > 10 && (
          <div className={styles.progress} role="progressbar" aria-valuenow={loadProgress.loaded} aria-valuemin={0} aria-valuemax={loadProgress.total}>
            <div
              className={styles.progressBar}
              style={{ width: `${(loadProgress.loaded / loadProgress.total) * 100}%` }}
            />
            <span className={styles.progressText}>
              Carregando {loadProgress.loaded} de {loadProgress.total} produtos…
            </span>
          </div>
        )}
      </section>

      <section className={styles.section} aria-labelledby="upload-heading">
        <h2 id="upload-heading" className={styles.sectionTitle}>
          Seus arquivos
        </h2>
        <FileDrop onFiles={handleFileUpload} loading={!!loading} />
      </section>

      <section className={styles.section} aria-labelledby="paste-heading">
        <h2 id="paste-heading" className={styles.sectionTitle}>
          Colar JSON
        </h2>
        <PasteZone
          value={pasteValue}
          onChange={setPasteValue}
          onSubmit={handlePaste}
          disabled={!!loading}
        />
      </section>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
