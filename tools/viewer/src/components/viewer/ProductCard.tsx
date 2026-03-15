import { memo } from 'react';
import type { Product } from '@/lib/pacp-types';
import styles from './ProductCard.module.css';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
});

interface ProductCardProps {
  product: Product;
  onClick: () => void;
  selected?: boolean;
}

function ProductCardInner({ product, onClick, selected }: ProductCardProps) {
  const mainImage = product.images?.find((i) => i.type === 'MAIN') ?? product.images?.[0];
  const category = product.category ?? (product as unknown as Record<string, unknown>)['x-category'] as string | undefined;
  const hasPrice = product.base_price != null;

  return (
    <button
      type="button"
      className={`${styles.card} ${selected ? styles.selected : ''}`}
      onClick={onClick}
    >
      {mainImage && (
        <div className={styles.imageWrap}>
          <img
            src={mainImage.url}
            alt={mainImage.label ?? product.name ?? product.id}
            width={64}
            height={64}
            loading="lazy"
            className={styles.image}
          />
        </div>
      )}
      <div className={styles.content}>
        <span className={styles.name}>{product.name || product.id}</span>
        {product.sku && <code className={styles.sku}>{product.sku}</code>}
        {category && (
          <span className={styles.category}>{category}</span>
        )}
      </div>
      {hasPrice ? (
        <span className={styles.price}>{currencyFormatter.format(product.base_price!)}</span>
      ) : (
        <span className={styles.priceHint}>Ver preço</span>
      )}
    </button>
  );
}

export const ProductCard = memo(ProductCardInner);
