export type ScalarValue = string | number | boolean;

export type ImageType = "MAIN" | "DETAIL" | "AMBIANCE" | "TECHNICAL" | "OTHER";

export interface Image {
  url: string;
  label?: string;
  alt?: string;
  position?: number;
  type?: ImageType;
}

export interface Measure {
  value: number;
  unit: string;
}

export interface PhysicalDimensions {
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
  attribute_id: string;
  value: ScalarValue;
  label?: string;
}

export interface Option {
  id: string;
  attribute_id: string;
  value: ScalarValue;
  label?: string;
  images?: Image[];
}

export interface LotPolicy {
  required: boolean;
  source: "CONTEXT" | "ATTRIBUTE";
  context_key?: string;
  attribute_id?: string;
}

export interface SalesUnit {
  requested_unit: string;
  sell_unit: string;
  quantity_per_sell_unit: number;
  rounding: "CEIL" | "FLOOR" | "ROUND" | "HALF_UP";
  min_sell_units?: number;
}

export interface Product {
  id: string;
  name?: string;
  visibility?: "PUBLIC" | "INTERNAL";
  sku?: string;
  manufacturer?: string;
  brand?: string;
  description?: string;
  category?: string;
  gtin?: string;
  base_price?: number;
  unit?: string;
  images?: Image[];
  tags?: string[];
  weight?: Measure;
  dimensions?: PhysicalDimensions;
  lot_policy?: LotPolicy;
  sales_unit?: SalesUnit;
  attributes?: AttributeRef[];
  attribute_values?: AttributeValue[];
  options: Option[];
  ruleset_ids?: string[];
  [key: `x-${string}`]: unknown;
}

export interface Predicate {
  fact: string;
  operator: "EQ" | "NEQ" | "IN" | "NOT_IN" | "GT" | "GTE" | "LT" | "LTE" | "EXISTS";
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
  table_id?: string;
  option_id?: string;
}

export type RuleOperation =
  | "ADD" | "PERCENT_OF" | "OVERRIDE" | "LOOKUP"
  | "MAX_OF" | "MIN_OF" | "PICK" | "ROUND" | "CAP" | "FLOOR";

export interface Rule {
  id: string;
  operation: RuleOperation;
  priority?: number;
  enabled?: boolean;
  when?: Condition;
  value?: number;
  percent?: number;
  table_id?: string;
  components?: Component[];
  precision?: number;
  max?: number;
  min?: number;
  fallback?: number;
  option_id?: string;
  option_ids?: string[];
  [key: `x-${string}`]: unknown;
}

export interface Ruleset {
  id: string;
  target: "BASE" | "SUBTOTAL" | "TOTAL";
  rules: Rule[];
  [key: `x-${string}`]: unknown;
}

export interface LookupAxis {
  key: string;
  source: "ATTRIBUTE" | "CONTEXT" | "LITERAL";
  attribute_id?: string;
  context_key?: string;
  literal?: ScalarValue;
}

export interface TableRow {
  key: Record<string, ScalarValue>;
  value: number;
}

export interface Table {
  id: string;
  type: "LOOKUP";
  dimensions: LookupAxis[];
  rows: TableRow[];
}

export interface Dependency {
  id: string;
  type: "REQUIRES" | "IMPLIES" | "AVAILABLE_OPTIONS_WHEN";
  product_id?: string;
  option_id?: string;
  requires_option_ids?: string[];
  allowed_option_ids?: string[];
  when?: Condition;
}

export interface Constraint {
  id: string;
  type: "DENY";
  when: Condition;
  message: string;
  product_id?: string;
  option_ids?: string[];
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
  [key: string]: ScalarValue | undefined;
}

export interface Pricing {
  calculation_mode?: "CASCADE" | "TABLE_LOOKUP" | "OVERRIDE_BY_VARIANT" | "COST_PLUS";
}

export interface CatalogDocument {
  document_type: "CATALOG";
  catalog: Catalog;
  rulesets: Ruleset[];
  product_refs?: ProductRef[];
  context?: Context;
  pricing?: Pricing;
  dictionaries?: Record<string, unknown>;
  tables?: Table[];
  dependencies?: Dependency[];
  constraints?: Constraint[];
  profiles?: string[];
  [key: `x-${string}`]: unknown;
}

export interface ProductDocument {
  document_type: "PRODUCT";
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

export type ProfileId = "moveis" | "iluminacao" | "pisos-revestimentos" | "fiscal-br";

export interface ValidationIssue {
  code: string;
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}
