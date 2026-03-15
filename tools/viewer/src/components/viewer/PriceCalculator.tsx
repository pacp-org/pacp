import { useMemo, useState } from 'react';
import type { Product, Ruleset, Table } from '@/lib/pacp-types';
import { calculatePrice } from '@/lib/price-engine';
import { useProductVariants } from '@/hooks/useProductVariants';
import { PricePipeline } from './PricePipeline';
import styles from './PriceCalculator.module.css';

interface PriceCalculatorProps {
  product: Product;
  products: Product[];
  rulesets: Ruleset[];
  tables: Table[];
}

export function PriceCalculator({ product, products, rulesets, tables }: PriceCalculatorProps) {
  const { enrichedProduct, getEffectiveProduct } = useProductVariants(product, products);
  const attributes = enrichedProduct.attributes ?? [];
  const optionsByAttr = useMemo(() => {
    const map = new Map<string, { id: string; value: unknown; label?: string }[]>();
    for (const opt of enrichedProduct.options ?? []) {
      const list = map.get(opt.attributeId) ?? [];
      list.push({ id: opt.id, value: opt.value, label: opt.label });
      map.set(opt.attributeId, list);
    }
    return map;
  }, [enrichedProduct.options]);

  const optionsById = useMemo(() => {
    const map = new Map<string, { attributeId: string; value: unknown }>();
    for (const opt of enrichedProduct.options ?? []) {
      map.set(opt.id, { attributeId: opt.attributeId, value: opt.value });
    }
    return map;
  }, [enrichedProduct.options]);

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const [, opts] of optionsByAttr) {
      if (opts.length >= 1) init[opts[0].id] = String(opts[0].value);
    }
    return init;
  });

  /** Converte optId→value para attributeId→value (formato esperado pelo price-engine). */
  const selectedOptionsForEngine = useMemo(() => {
    const out: Record<string, string | number | boolean> = {};
    for (const [optId, val] of Object.entries(selectedOptions)) {
      const opt = optionsById.get(optId);
      if (!opt) continue;
      const attributeId = opt.attributeId;
      const num = Number(val);
      out[attributeId] = Number.isNaN(num) ? val : num;
    }
    return out;
  }, [selectedOptions, optionsById]);

  const selectedDimensaoValue = selectedOptionsForEngine['dimensao'] != null
    ? String(selectedOptionsForEngine['dimensao'])
    : undefined;
  const effectiveProduct = getEffectiveProduct(selectedDimensaoValue);

  const priceResult = useMemo(() => {
    return calculatePrice(effectiveProduct, rulesets, tables, selectedOptionsForEngine);
  }, [effectiveProduct, rulesets, tables, selectedOptionsForEngine]);

  const handleOptionChange = (optId: string, value: string) => {
    setSelectedOptions((prev) => {
      const next = { ...prev };
      if (value) next[optId] = value;
      else delete next[optId];
      return next;
    });
  };

  if (attributes.length === 0 && (!enrichedProduct.options || enrichedProduct.options.length === 0)) {
    return (
      <PricePipeline
        finalPrice={priceResult.finalPrice}
        steps={priceResult.steps}
        basePrice={effectiveProduct.base_price}
      />
    );
  }

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>Formação de preço</h3>
      <p className={styles.desc}>Selecione as opções para ver o cálculo.</p>
      {attributes.length > 0 && (
        <div className={styles.options}>
          {attributes.map((attr) => {
            const opts = optionsByAttr.get(attr.id) ?? [];
            return (
              <div key={attr.id} className={styles.optionGroup}>
                <label className={styles.optionLabel} htmlFor={`opt-${attr.id}`}>
                  {attr.label ?? attr.id}
                </label>
                {opts.length <= 4 ? (
                  <div className={styles.chips}>
                    {opts.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        id={o.id === opts[0]?.id ? `opt-${attr.id}` : undefined}
                        className={`${styles.chip} ${selectedOptions[o.id] !== undefined ? styles.chipActive : ''}`}
                        onClick={() => {
                          const current = selectedOptions[o.id];
                          if (current) {
                            handleOptionChange(o.id, '');
                          } else {
                            setSelectedOptions((prev) => {
                              const next = { ...prev };
                              for (const opt of opts) delete next[opt.id];
                              next[o.id] = String(o.value);
                              return next;
                            });
                          }
                        }}
                      >
                        {o.label ?? String(o.value)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <select
                    id={`opt-${attr.id}`}
                    className={styles.select}
                    value={opts.find((o) => selectedOptions[o.id] !== undefined)?.id ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const opt = opts.find((o) => o.id === val);
                      if (opt) handleOptionChange(opt.id, String(opt.value));
                      else {
                        setSelectedOptions((prev) => {
                          const next = { ...prev };
                          for (const o of opts) delete next[o.id];
                          return next;
                        });
                      }
                    }}
                  >
                    <option value="">--</option>
                    {opts.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label ?? String(o.value)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>
      )}
      <PricePipeline
        finalPrice={priceResult.finalPrice}
        steps={priceResult.steps}
        basePrice={effectiveProduct.base_price}
      />
    </div>
  );
}
