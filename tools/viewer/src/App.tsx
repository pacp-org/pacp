import { useState, useMemo, lazy, Suspense } from 'react';
import { LoaderPage } from '@/components/loader/LoaderPage';
import { ShellLayout } from '@/components/viewer/ShellLayout';
import { ProductSidebar } from '@/components/viewer/ProductSidebar';

const ProductDetail = lazy(() =>
  import('@/components/viewer/ProductDetail').then((m) => ({ default: m.ProductDetail }))
);

import { useUrlState } from '@/hooks/useUrlState';
import { useCatalogData } from '@/hooks/useCatalogData';
import type { PacpDocument, Product, ProductDocument } from '@/lib/pacp-types';
import styles from './App.module.css';

export default function App() {
  const [catalogDoc, setCatalogDoc] = useState<PacpDocument | null>(null);
  const [productDocs, setProductDocs] = useState<PacpDocument[]>([]);
  const { productId, setProductId } = useUrlState();
  const { rulesets, tables } = useCatalogData(catalogDoc, productDocs);

  const products = useMemo(() => {
    return productDocs
      .filter((d): d is ProductDocument => d.document_type === 'PRODUCT')
      .map((d) => d.product);
  }, [productDocs]);

  const selectedProduct = useMemo(() => {
    if (!productId) return null;
    return products.find((p) => p.id === productId) ?? null;
  }, [products, productId]);

  const handleLoad = (doc: PacpDocument, productsLoaded: PacpDocument[]) => {
    setCatalogDoc(doc);
    setProductDocs(productsLoaded);
    setProductId(null);
  };

  const handleExport = () => {
    if (!catalogDoc) return;
    const payload =
      catalogDoc.document_type === 'CATALOG' && productDocs.length > 0
        ? { catalog: catalogDoc, products: productDocs }
        : catalogDoc;
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pacp-export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setCatalogDoc(null);
    setProductDocs([]);
    setProductId(null);
  };

  const handleSelectProduct = (product: Product) => {
    setProductId(product.id);
  };

  const handleBackFromProduct = () => {
    setProductId(null);
  };

  if (!catalogDoc) {
    return <LoaderPage onLoad={handleLoad} />;
  }

  const catalogName =
    catalogDoc.document_type === 'CATALOG' && catalogDoc.catalog
      ? catalogDoc.catalog.name ?? catalogDoc.catalog.id
      : undefined;

  const sidebar = (
    <ProductSidebar
      products={products}
      selectedProductId={productId}
      onSelect={handleSelectProduct}
    />
  );

  const main = selectedProduct ? (
    <Suspense fallback={<div className={styles.placeholder}>Carregando…</div>}>
      <ProductDetail
        product={selectedProduct}
        products={products}
        rulesets={rulesets}
        tables={tables}
        onBack={handleBackFromProduct}
      />
    </Suspense>
  ) : (
    <div className={styles.placeholder}>
      <p>Selecione um produto na lista para ver detalhes e formação de preço.</p>
    </div>
  );

  const catalogDocForModal =
    catalogDoc.document_type === 'CATALOG' ? catalogDoc : null;

  return (
    <ShellLayout
      catalogName={catalogName}
      catalogDoc={catalogDocForModal}
      onExport={handleExport}
      onReset={handleReset}
      sidebar={sidebar}
      main={main}
    />
  );
}
