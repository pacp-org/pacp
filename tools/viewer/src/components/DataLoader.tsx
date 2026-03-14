import { useCallback, useState } from 'react';
import { validatePacp, parsePacpJson } from '@/lib/validate';
import type { PacpDocument, PackedDocument, ValidationIssue } from '@/lib/pacp-types';
import styles from './DataLoader.module.css';

const EXAMPLES = [
  { label: 'Loja teste (real)', url: 'https://raw.githubusercontent.com/pacp-org/pacp/main/spec/1.0.0/examples/loja-teste/brazil-contemporaneo.catalog.pacp.json', base: 'https://raw.githubusercontent.com/pacp-org/pacp/main/spec/1.0.0/examples/loja-teste/' },
  { label: 'Móveis (MAX_OF)', url: 'https://raw.githubusercontent.com/pacp-org/pacp/main/spec/1.0.0/examples/moveis/max_of.json', base: 'https://raw.githubusercontent.com/pacp-org/pacp/main/spec/1.0.0/examples/moveis/' },
  { label: 'Iluminação (LOOKUP)', url: 'https://raw.githubusercontent.com/pacp-org/pacp/main/spec/1.0.0/examples/iluminacao/matrix_lookup.json', base: 'https://raw.githubusercontent.com/pacp-org/pacp/main/spec/1.0.0/examples/iluminacao/' },
  { label: 'Mínimo', url: 'https://raw.githubusercontent.com/pacp-org/pacp/main/spec/1.0.0/examples/geral/minimal.json', base: 'https://raw.githubusercontent.com/pacp-org/pacp/main/spec/1.0.0/examples/geral/' },
  { label: 'Multi lista', url: 'https://raw.githubusercontent.com/pacp-org/pacp/main/spec/1.0.0/examples/geral/multi_price_list.json', base: 'https://raw.githubusercontent.com/pacp-org/pacp/main/spec/1.0.0/examples/geral/' },
] as const;

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
      const url = items[i];
      try {
        const val = await fetcher(url);
        if (val !== null) results.push(val);
      } catch {
        // ignore failed fetches
      }
      onProgress?.(results.length, items.length);
    }
  }

  const workers = Array(Math.min(FETCH_CONCURRENCY, items.length))
    .fill(null)
    .map(() => worker());
  await Promise.all(workers);
  return results;
}

interface DataLoaderProps {
  onLoad: (doc: PacpDocument, products: PacpDocument[]) => void;
}

export function DataLoader({ onLoad }: DataLoaderProps) {
  const [pasteValue, setPasteValue] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[] | null>(null);

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
      setError(null);
      setValidationIssues(null);
      try {
        const result = await validatePacp(raw);
        if (!result.valid) {
          setValidationIssues(result.issues);
          setError(`Validação falhou: ${result.issues.length} erro(s)`);
          return;
        }
        const { doc, products } = await processDocument(raw);
        onLoad(doc, products);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro desconhecido');
      }
    },
    [onLoad, processDocument]
  );

  const handlePaste = useCallback(async () => {
    try {
      const parsed = parsePacpJson(pasteValue);
      await loadAndValidate(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao parsear JSON');
    }
  }, [pasteValue, loadAndValidate]);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;
      setLoading(files.length > 1 ? `${files.length} arquivos` : files[0].name);
      setError(null);
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
              // skip invalid files
            }
            if (files.length > 20) {
              setLoadProgress({ loaded: i + 1, total: files.length });
            }
          }

          setLoadProgress(null);
          if (!catalog) {
            setError('Nenhum arquivo de catálogo (document_type: CATALOG) encontrado.');
            return;
          }
          const result = await validatePacp(catalog);
          if (!result.valid) {
            setValidationIssues(result.issues);
            setError(`Validação falhou: ${result.issues.length} erro(s)`);
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
        setError(e instanceof Error ? e.message : 'Erro ao ler arquivo');
      } finally {
        setLoading(null);
        setLoadProgress(null);
        e.target.value = '';
      }
    },
    [loadAndValidate, onLoad]
  );

  const handleLoadExample = useCallback(
    async (ex: (typeof EXAMPLES)[number]) => {
      setLoading(ex.label);
      setLoadProgress(null);
      setError(null);
      setValidationIssues(null);
      try {
        const res = await fetch(ex.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const catalog = (await res.json()) as PacpDocument;
        const result = await validatePacp(catalog);
        if (!result.valid) {
          setValidationIssues(result.issues);
          setError(`Validação falhou: ${result.issues.length} erro(s)`);
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
        setError(e instanceof Error ? e.message : 'Erro ao carregar exemplo');
      } finally {
        setLoading(null);
        setLoadProgress(null);
      }
    },
    [onLoad]
  );

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Visualizador PACP</h1>
      <p className={styles.subtitle}>
        Envie um arquivo, cole um JSON ou carregue um exemplo oficial para explorar o catálogo e a formação de preços.
      </p>

      <div className={styles.actions}>
        <label className={styles.btn}>
          <input type="file" accept=".json,.pacp.json" onChange={handleFileUpload} disabled={!!loading} />
          {loading ? 'Carregando...' : 'Enviar arquivo .json'}
        </label>
        <label className={styles.btnSecondary}>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <input
            type="file"
            {...({ webkitDirectory: '', directory: '' } as any)}
            accept=".json,.pacp.json"
            onChange={handleFileUpload}
            disabled={!!loading}
          />
          {loading ? 'Carregando...' : 'Enviar pasta (catálogo + produtos)'}
        </label>

        <div className={styles.examples}>
          <span className={styles.examplesLabel}>Exemplos:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.url}
              type="button"
              className={styles.exampleBtn}
              onClick={() => handleLoadExample(ex)}
              disabled={!!loading}
            >
              {loading === ex.label
                ? loadProgress
                  ? `${loadProgress.loaded}/${loadProgress.total} produtos`
                  : '...'
                : ex.label}
            </button>
          ))}
        </div>
        {loadProgress && loadProgress.total > 10 && (
          <div className={styles.progress}>
            <div
              className={styles.progressBar}
              style={{ width: `${(loadProgress.loaded / loadProgress.total) * 100}%` }}
            />
            <span className={styles.progressText}>
              Carregando {loadProgress.loaded} de {loadProgress.total} produtos...
            </span>
          </div>
        )}
      </div>

      <div className={styles.pasteSection}>
        <label className={styles.pasteLabel}>Ou cole o JSON:</label>
        <textarea
          className={styles.textarea}
          placeholder='{"spec":"1.0.0","document_type":"CATALOG",...}'
          value={pasteValue}
          onChange={(e) => setPasteValue(e.target.value)}
          rows={6}
        />
        <button type="button" className={styles.pasteBtn} onClick={handlePaste} disabled={!pasteValue.trim()}>
          Validar e abrir
        </button>
      </div>

      {error && (
        <div className={styles.error}>
          <strong>Erro:</strong> {error}
          {validationIssues && validationIssues.length > 0 && (
            <ul className={styles.issues}>
              {validationIssues.slice(0, 5).map((i, idx) => (
                <li key={idx}>
                  {i.path}: {i.message}
                </li>
              ))}
              {validationIssues.length > 5 && (
                <li>... e mais {validationIssues.length - 5} erro(s)</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
