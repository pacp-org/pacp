import { useMemo, useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Product } from '@/lib/pacp-types';
import { ProductCard } from './ProductCard';
import { Input } from '@/components/ui/Input';
import styles from './ProductSidebar.module.css';

interface ProductSidebarProps {
  products: Product[];
  selectedProductId: string | null;
  onSelect: (product: Product) => void;
}

export function ProductSidebar({
  products,
  selectedProductId,
  onSelect,
}: ProductSidebarProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const parentRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(() => {
    const set = new Set(
      products
        .map((p) => p.category ?? (p as unknown as Record<string, unknown>)['x-category'] as string | undefined)
        .filter(Boolean) as string[]
    );
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    let list = products;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.sku?.toLowerCase().includes(q) ||
          p.id?.toLowerCase().includes(q) ||
          (p.name?.toLowerCase().includes(q) ?? false) ||
          p.gtin?.includes(q)
      );
    }
    if (categoryFilter) {
      list = list.filter(
        (p) =>
          (p.category ?? (p as unknown as Record<string, unknown>)['x-category']) === categoryFilter
      );
    }
    return list;
  }, [products, search, categoryFilter]);

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className={styles.wrapper}>
      <div role="search" className={styles.toolbar}>
        <Input
          type="search"
          placeholder="Buscar por SKU, id, nome…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          name="product-search"
          autoComplete="off"
        />
        <select
          className={styles.filter}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filtrar por categoria"
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.list}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <p>
              {products.length === 0
                ? 'Nenhum produto carregado. Carregue um catálogo ou produto.'
                : 'Nenhum produto corresponde à busca.'}
            </p>
          </div>
        ) : filtered.length > 50 ? (
          <div ref={parentRef} className={styles.virtualContainer}>
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualItems.map((virtualRow) => {
                const product = filtered[virtualRow.index];
                return (
                  <div
                    key={product.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      padding: '0 8px 8px',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <ProductCard
                      product={product}
                      onClick={() => onSelect(product)}
                      selected={selectedProductId === product.id}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={styles.listInner}>
            {filtered.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onClick={() => onSelect(p)}
                selected={selectedProductId === p.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
