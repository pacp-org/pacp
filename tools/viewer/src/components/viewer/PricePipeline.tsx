import { memo } from 'react';
import type { PriceStep } from '@/lib/price-engine';
import styles from './PricePipeline.module.css';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
});

interface PricePipelineProps {
  finalPrice: number;
  steps: PriceStep[];
  basePrice?: number;
}

function PricePipelineInner({ finalPrice, steps, basePrice }: PricePipelineProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.finalPrice}>
        <span className={styles.label}>Preço final</span>
        <span className={styles.value}>{currencyFormatter.format(finalPrice)}</span>
      </div>
      {steps.length > 0 ? (
        <div className={styles.steps}>
          {steps.map((s, i) => (
            <div key={i} className={styles.step}>
              <span className={styles.stepStage}>{s.stage}</span>
              <span className={styles.stepRule}>{s.ruleId}</span>
              <span className={styles.stepOp}>{s.operation}</span>
              {s.detail && <span className={styles.stepDetail}>{s.detail}</span>}
              <span className={styles.stepValue}>
                {currencyFormatter.format(s.input)} → {currencyFormatter.format(s.output)}
              </span>
            </div>
          ))}
        </div>
      ) : basePrice != null ? (
        <p className={styles.noRules}>
          Nenhuma regra aplicada. Preço base: {currencyFormatter.format(basePrice)}
        </p>
      ) : null}
    </div>
  );
}

export const PricePipeline = memo(PricePipelineInner);
