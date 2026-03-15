import { useMemo } from 'react';
import type { Product, Option, ScalarValue } from '@/lib/pacp-types';

/**
 * Encontra produtos "irmãos" (mesma família, variando só por dimensão) e retorna
 * produto enriquecido com opções de dimensão unificadas + função para obter o
 * produto efetivo conforme a dimensão selecionada.
 */
export function useProductVariants(product: Product, allProducts: Product[]) {
  return useMemo(() => {
    const baseId = product.id.replace(/-\d+$/, '');
    const collection = (product as unknown as Record<string, unknown>)['x-collection'] as string | undefined;

    const siblings = allProducts.filter((p) => {
      if (p.id === product.id) return true;
      const pBase = p.id.replace(/-\d+$/, '');
      const pCollection = (p as unknown as Record<string, unknown>)['x-collection'] as string | undefined;
      if (baseId !== pBase) return false;
      if (collection && pCollection && collection !== pCollection) return false;
      const productAttrIds = (product.attributes ?? []).map((a) => a.id).sort().join(',');
      const pAttrIds = (p.attributes ?? []).map((a) => a.id).sort().join(',');
      return productAttrIds === pAttrIds;
    });

    const dimensaoAttrId = 'dimensao';
    const mergedDimensaoOpts: { id: string; value: unknown; label?: string }[] = [];
    const seenValues = new Set<string>();

    for (const s of siblings) {
      for (const opt of s.options ?? []) {
        if (opt.attributeId === dimensaoAttrId) {
          const key = String(opt.value);
          if (!seenValues.has(key)) {
            seenValues.add(key);
            mergedDimensaoOpts.push({
              id: opt.id,
              value: opt.value,
              label: opt.label,
            });
          }
        }
      }
    }

    const hasMultipleDimensions = mergedDimensaoOpts.length > 1;

    const enrichedProduct: Product = hasMultipleDimensions
      ? {
          ...product,
          options: [
            ...(product.options ?? []).filter((o) => o.attributeId !== dimensaoAttrId),
            ...mergedDimensaoOpts.map((m): Option => ({
              id: m.id,
              attributeId: dimensaoAttrId,
              value: m.value as ScalarValue,
              label: m.label,
            })),
          ],
        }
      : product;

    const dimensionValueToProduct = new Map<string, Product>();
    for (const s of siblings) {
      for (const opt of s.options ?? []) {
        if (opt.attributeId === dimensaoAttrId) {
          dimensionValueToProduct.set(String(opt.value), s);
        }
      }
    }

    const getEffectiveProduct = (selectedDimensaoValue: string | undefined): Product => {
      if (!selectedDimensaoValue || !hasMultipleDimensions) return product;
      return dimensionValueToProduct.get(selectedDimensaoValue) ?? product;
    };

    return {
      enrichedProduct,
      getEffectiveProduct,
      hasMultipleDimensions,
      siblingProducts: siblings,
    };
  }, [product, allProducts]);
}
