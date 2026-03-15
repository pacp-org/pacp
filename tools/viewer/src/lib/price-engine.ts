import type {
  Product,
  Ruleset,
  Rule,
  Table,
  Component,
  Condition,
  Predicate,
  ScalarValue,
} from './pacp-types';

export interface PriceStep {
  stage: 'BASE' | 'SUBTOTAL' | 'TOTAL';
  ruleId: string;
  operation: string;
  input: number;
  output: number;
  detail?: string;
}

export interface PriceResult {
  finalPrice: number;
  steps: PriceStep[];
  error?: string;
}

function evaluateCondition(cond: Condition | undefined, ctx: Record<string, ScalarValue>): boolean {
  if (!cond) return true;
  if (cond.all) {
    return cond.all.every((p) => evaluatePredicate(p, ctx));
  }
  if (cond.any) {
    return cond.any.some((p) => evaluatePredicate(p, ctx));
  }
  return true;
}

function evaluatePredicate(p: Predicate, ctx: Record<string, ScalarValue>): boolean {
  const factVal = ctx[p.fact];
  const op = p.operator;
  const val = p.value;
  const vals = p.values;

  switch (op) {
    case 'EQ':
      return factVal === val;
    case 'NEQ':
      return factVal !== val;
    case 'IN':
      return Array.isArray(vals) && vals.includes(factVal);
    case 'NOT_IN':
      return Array.isArray(vals) && !vals.includes(factVal);
    case 'GT':
      return typeof factVal === 'number' && typeof val === 'number' && factVal > val;
    case 'GTE':
      return typeof factVal === 'number' && typeof val === 'number' && factVal >= val;
    case 'LT':
      return typeof factVal === 'number' && typeof val === 'number' && factVal < val;
    case 'LTE':
      return typeof factVal === 'number' && typeof val === 'number' && factVal <= val;
    case 'EXISTS':
      return factVal !== undefined && factVal !== null;
    default:
      return false;
  }
}

function sortRules(rules: Rule[]): Rule[] {
  return [...rules].sort((a, b) => {
    const pa = a.priority ?? 0;
    const pb = b.priority ?? 0;
    if (pa !== pb) return pb - pa;
    return (a.id || '').localeCompare(b.id || '');
  });
}

function lookupTable(
  table: Table,
  selectedOptions: Record<string, ScalarValue>,
  context: Record<string, ScalarValue>
): number | null {
  for (const row of table.rows) {
    let match = true;
    for (const dim of table.dimensions) {
      let keyVal: ScalarValue | undefined;
      if (dim.source === 'ATTRIBUTE') {
        keyVal = selectedOptions[dim.key] ?? selectedOptions[dim.attributeId ?? ''];
      } else if (dim.source === 'CONTEXT') {
        keyVal = context[dim.contextKey ?? dim.key];
      } else if (dim.source === 'LITERAL') {
        keyVal = dim.literal;
      }
      const rowKeyVal = row.key[dim.key];
      if (rowKeyVal !== undefined && keyVal !== undefined) {
        if (String(rowKeyVal) !== String(keyVal)) {
          match = false;
          break;
        }
      } else if (rowKeyVal !== undefined) {
        match = false;
        break;
      }
    }
    if (match) return row.value;
  }
  return null;
}

function getComponentValue(
  comp: Component,
  tables: Map<string, Table>,
  selectedOptions: Record<string, ScalarValue>,
  context: Record<string, ScalarValue>
): number | null {
  if (comp.value !== undefined) return comp.value;
  if (comp.tableId) {
    const tbl = tables.get(comp.tableId);
    if (tbl) return lookupTable(tbl, selectedOptions, context);
  }
  return null;
}

export function calculatePrice(
  product: Product,
  rulesets: Ruleset[],
  tables: Table[],
  selectedOptions: Record<string, ScalarValue>,
  context: Record<string, ScalarValue> = {}
): PriceResult {
  const steps: PriceStep[] = [];
  const tablesMap = new Map(tables.map((t) => [t.id, t]));

  let price = product.base_price ?? 0;
  const ctx = { ...context, ...selectedOptions };

  const stageOrder: Array<'BASE' | 'SUBTOTAL' | 'TOTAL'> = ['BASE', 'SUBTOTAL', 'TOTAL'];

  for (const stage of stageOrder) {
    const rs = rulesets.filter((r) => r.target === stage);
    const productRulesetIds = product.rulesetIds ?? [];
    const applicableRulesets = rs.filter((r) => productRulesetIds.includes(r.id));

    for (const ruleset of applicableRulesets) {
      const sortedRules = sortRules(ruleset.rules).filter((r) => r.enabled !== false);

      for (const rule of sortedRules) {
        if (!evaluateCondition(rule.when, ctx)) continue;

        const input = price;
        let output = price;
        let detail: string | undefined;

        switch (rule.operation) {
          case 'ADD':
            output = price + (rule.value ?? 0);
            detail = `+ ${rule.value}`;
            break;
          case 'PERCENT_OF':
            output = price + price * ((rule.percent ?? 0) / 100);
            detail = `+ ${rule.percent}%`;
            break;
          case 'OVERRIDE':
            output = rule.value ?? 0;
            detail = `= ${rule.value}`;
            break;
          case 'LOOKUP': {
            const tbl = tablesMap.get(rule.tableId ?? '');
            if (!tbl) {
              output = rule.fallback ?? price;
              detail = `LOOKUP (tabela não encontrada, fallback: ${rule.fallback ?? price})`;
            } else {
              const val = lookupTable(tbl, selectedOptions, context);
              if (val !== null) {
                output = val;
                detail = `LOOKUP → ${val}`;
              } else {
                output = rule.fallback ?? price;
                detail = `LOOKUP (sem match, fallback: ${rule.fallback ?? price})`;
              }
            }
            break;
          }
          case 'MAX_OF':
          case 'MIN_OF': {
            const comps = (rule.components ?? [])
              .map((c) => getComponentValue(c, tablesMap, selectedOptions, context))
              .filter((v): v is number => v !== null);
            if (comps.length > 0) {
              output =
                rule.operation === 'MAX_OF' ? Math.max(...comps) : Math.min(...comps);
              detail = `${rule.operation}(${comps.join(', ')}) = ${output}`;
            }
            break;
          }
          case 'PICK': {
            const comps = rule.components ?? [];
            for (const c of comps) {
              const v = getComponentValue(c, tablesMap, selectedOptions, context);
              if (v !== null) {
                output = v;
                detail = `PICK ${c.label ?? ''} = ${v}`;
                break;
              }
            }
            break;
          }
          case 'ROUND':
            output = Number(
              (price).toFixed(rule.precision ?? 2)
            );
            detail = `arredondar ${rule.precision} decimais`;
            break;
          case 'CAP':
            output = Math.min(price, rule.max ?? Infinity);
            detail = `cap ${rule.max}`;
            break;
          case 'FLOOR':
            output = Math.max(price, rule.min ?? 0);
            detail = `floor ${rule.min}`;
            break;
          default:
            break;
        }

        price = output;
        steps.push({
          stage,
          ruleId: rule.id,
          operation: rule.operation,
          input,
          output,
          detail,
        });
      }
    }
  }

  return { finalPrice: price, steps };
}
