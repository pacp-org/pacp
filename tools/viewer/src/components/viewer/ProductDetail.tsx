import type { Product, Ruleset, Table } from '@/lib/pacp-types';
import { PriceCalculator } from './PriceCalculator';
import styles from './ProductDetail.module.css';

interface ProductDetailProps {
  product: Product;
  products: Product[];
  rulesets: Ruleset[];
  tables: Table[];
  onBack: () => void;
}

export function ProductDetail({ product, products, rulesets, tables, onBack }: ProductDetailProps) {
  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.backBtn}
        onClick={onBack}
        aria-label="Voltar para lista de produtos"
      >
        ← Voltar
      </button>

      <div className={styles.layout}>
        <div className={styles.main}>
          <div className={styles.header}>
            <h2 className={styles.name}>{product.name || product.id}</h2>
            {product.sku && <code className={styles.sku}>{product.sku}</code>}
            {(product.category ?? (product as unknown as Record<string, unknown>)['x-category']) ? (
              <span className={styles.category}>
                {String(product.category ?? (product as unknown as Record<string, unknown>)['x-category'])}
              </span>
            ) : null}
          </div>

          {product.description && (
            <p className={styles.description}>{product.description}</p>
          )}

          <div className={styles.meta}>
            {product.base_price != null && (
              <span>Preço base: R$ {product.base_price.toFixed(2)}</span>
            )}
            {product.weight && (
              <span>
                Peso: {product.weight.value} {product.weight.unit}
              </span>
            )}
            {product.dimensions && (
              <span>
                Dimensões: {product.dimensions.width ?? '-'} x{' '}
                {product.dimensions.height ?? '-'} x{' '}
                {product.dimensions.depth ?? '-'} {product.dimensions.unit}
              </span>
            )}
          </div>

          {product.options && product.options.length > 0 && product.attributes?.length === 0 && (
            <div className={styles.section}>
              <h3>Opções</h3>
              <div className={styles.optionsGrid}>
                {product.options.map((opt) => (
                  <div key={opt.id} className={styles.optionGroup}>
                    <span className={styles.optionLabel}>
                      {opt.label ?? opt.attributeId ?? opt.id}
                    </span>
                    <span className={styles.optionValue}>{String(opt.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {product.images && product.images.length > 0 && (
            <div className={styles.section}>
              <h3>Imagens</h3>
              <div className={styles.images}>
                {product.images.map((img, i) => (
                  <a
                    key={i}
                    href={img.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.imgLink}
                  >
                    {img.label ?? `Imagem ${i + 1}`}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className={styles.sidebar}>
          <PriceCalculator
            key={product.id}
            product={product}
            products={products}
            rulesets={rulesets}
            tables={tables}
          />
        </aside>
      </div>
    </div>
  );
}
