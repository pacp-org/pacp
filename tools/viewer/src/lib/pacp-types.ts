export type ScalarValue = string | number | boolean;

export type ImageType = 'MAIN' | 'DETAIL' | 'AMBIANCE' | 'TECHNICAL' | 'OTHER';

export interface ImageRef {
  url: string;
  label?: string;
  type?: ImageType;
}

export interface Measure {
  value: number;
  unit: string;
}

export interface DimensionsObj {
  width?: number;
  height?: number;
  depth?: number;
  unit: string;
}

export interface AttributeRef {
  id: string;
  label?: string;
}

export interface AttributeValue {
  attributeId: string;
  value: ScalarValue;
  label?: string;
}

export interface Option {
  id: string;
  attributeId: string;
  value: ScalarValue;
  label?: string;
}

export interface LotPolicy {
  required: boolean;
  source: 'CONTEXT' | 'ATTRIBUTE';
  contextKey?: string;
  attributeId?: string;
}

export interface SalesUnit {
  requested_unit: string;
  sell_unit: string;
  quantity_per_sell_unit: number;
  rounding: 'CEIL';
  min_sell_units?: number;
}

export interface Product {
  id: string;
  name?: string;
  sku?: string;
  manufacturer?: string;
  brand?: string;
  description?: string;
  category?: string;
  gtin?: string;
  base_price?: number;
  images?: ImageRef[];
  tags?: string[];
  weight?: Measure;
  dimensions?: DimensionsObj;
  lot_policy?: LotPolicy;
  sales_unit?: SalesUnit;
  attributes?: AttributeRef[];
  attribute_values?: AttributeValue[];
  options: Option[];
  rulesetIds?: string[];
  [key: `x-${string}`]: unknown;
}

export interface Predicate {
  fact: string;
  operator: 'EQ' | 'NEQ' | 'IN' | 'NOT_IN' | 'GT' | 'GTE' | 'LT' | 'LTE' | 'EXISTS';
  value?: ScalarValue;
  values?: ScalarValue[];
}

export interface Condition {
  all?: Predicate[];
  any?: Predicate[];
}

export interface Component {
  label?: string;
  value?: number;
  tableId?: string;
  optionId?: string;
}

export type RuleOperation =
  | 'ADD'
  | 'PERCENT_OF'
  | 'OVERRIDE'
  | 'LOOKUP'
  | 'MAX_OF'
  | 'MIN_OF'
  | 'PICK'
  | 'ROUND'
  | 'CAP'
  | 'FLOOR';

export interface Rule {
  id: string;
  operation: RuleOperation;
  priority?: number;
  enabled?: boolean;
  when?: Condition;
  value?: number;
  percent?: number;
  tableId?: string;
  components?: Component[];
  precision?: number;
  max?: number;
  min?: number;
  fallback?: number;
  optionId?: string;
  optionIds?: string[];
  [key: `x-${string}`]: unknown;
}

export interface Ruleset {
  id: string;
  target: 'BASE' | 'SUBTOTAL' | 'TOTAL';
  rules: Rule[];
  [key: `x-${string}`]: unknown;
}

export interface Dimension {
  key: string;
  source: 'ATTRIBUTE' | 'CONTEXT' | 'LITERAL';
  attributeId?: string;
  contextKey?: string;
  literal?: ScalarValue;
}

export interface TableRow {
  key: Record<string, ScalarValue>;
  value: number;
}

export interface Table {
  id: string;
  type: 'LOOKUP';
  dimensions: Dimension[];
  rows: TableRow[];
  keys?: (string | { optionId?: string; id?: string; name?: string })[];
}

export interface Dependency {
  id: string;
  type: 'REQUIRES' | 'IMPLIES' | 'AVAILABLE_OPTIONS_WHEN';
  productId?: string;
  optionId?: string;
  requiresOptionIds?: string[];
  allowedOptionIds?: string[];
  when?: Condition;
}

export interface Constraint {
  id: string;
  type: 'DENY';
  when: Condition;
  message: string;
  productId?: string;
  optionIds?: string[];
}

export interface PriceList {
  id: string;
  currency: string;
  label?: string;
  context_match?: Record<string, ScalarValue>;
}

export interface Catalog {
  id: string;
  name?: string;
  default_price_list_id?: string;
  price_lists?: PriceList[];
  [key: `x-${string}`]: unknown;
}

export interface ProductRef {
  id: string;
  path: string;
}

export interface Context {
  price_list_id?: string;
  region?: string;
  channel?: string;
  customer?: string;
  lot_id?: string;
  requested_quantity?: number;
  requested_unit?: string;
  [key: `x-${string}`]: unknown;
}

export interface CatalogDocument {
  spec: '1.0.0';
  document_type: 'CATALOG';
  catalog: Catalog;
  rulesets: Ruleset[];
  product_refs?: ProductRef[];
  context?: Context;
  tables?: Table[];
  dependencies?: Dependency[];
  constraints?: Constraint[];
  profiles?: string[];
  [key: `x-${string}`]: unknown;
}

export interface ProductDocument {
  spec: '1.0.0';
  document_type: 'PRODUCT';
  catalog_id: string;
  product: Product;
  rulesets?: Ruleset[];
  tables?: Table[];
  constraints?: Constraint[];
  dependencies?: Dependency[];
  profiles?: string[];
  [key: `x-${string}`]: unknown;
}

export type PacpDocument = CatalogDocument | ProductDocument;

export interface ValidationIssue {
  code: string;
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

/** Formato empacotado para colar/upload: catalog + products inline */
export interface PackedDocument {
  catalog: CatalogDocument;
  products: ProductDocument[];
}
