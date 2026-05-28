/**
 * Valor escalar simples permitido em options, contexts, tabelas e regras.
 * Sempre primitivo: string, number ou boolean (sem objetos ou arrays).
 */
export type ScalarValue = string | number | boolean;

/**
 * Tipo semântico de uma imagem. Consumidores podem usar para selecionar
 * a imagem certa em cada contexto (vitrine, detalhe, ambientação, técnica).
 */
export type ImageType = "MAIN" | "DETAIL" | "AMBIANCE" | "TECHNICAL" | "OTHER";

/**
 * Referência a uma imagem de produto ou variante.
 *
 * Quando uma `option` possui `images`, consumidores DEVEM priorizá-las sobre
 * `product.images` para exibição contextual daquela variante.
 *
 * Ver spec/latest/pacp.md §4.
 */
export interface Image {
  /** URI válida da imagem. */
  url: string;
  /** Rótulo legível / legenda. */
  label?: string;
  /** Texto alternativo descritivo (acessibilidade). */
  alt?: string;
  /** Inteiro ≥ 0 para ordenação explícita. Quando ausente em todas as imagens, prevalece a ordem do array. */
  position?: number;
  /** Tipo semântico. */
  type?: ImageType;
}

/**
 * Medida física com valor numérico e unidade.
 *
 * Exemplo: `{ value: 65, unit: "kg" }`.
 */
export interface Measure {
  /** Valor numérico positivo. */
  value: number;
  /** Unidade SI ou comercial (ex: `kg`, `g`, `m`, `cm`). */
  unit: string;
}

/**
 * Dimensões físicas de um produto (largura × altura × profundidade).
 *
 * `unit` é obrigatório; cada dimensão individual é opcional.
 * Exemplo: `{ width: 230, height: 95, depth: 100, unit: "cm" }`.
 */
export interface PhysicalDimensions {
  width?: number;
  height?: number;
  depth?: number;
  /** Unidade comum a todas as dimensões (ex: `cm`, `mm`, `m`). */
  unit: string;
}

/**
 * Declaração de um atributo configurável do produto (ex.: "cor", "tecido", "tamanho").
 *
 * Apenas declara o atributo; os valores selecionáveis vivem em `Option[]`
 * referenciando esse `id` via `attribute_id`.
 */
export interface AttributeRef {
  /** ID estável do atributo, único por produto. */
  id: string;
  /** Rótulo legível ao usuário final. */
  label?: string;
}

/**
 * Valor fixo de um atributo no nível do produto (não escolhível, informativo).
 *
 * Complementar a `Option[]` — use `AttributeValue` para atributos que NÃO variam
 * no orçamento. Use `Option` para atributos selecionáveis. Ver spec §4.4.
 */
export interface AttributeValue {
  attribute_id: string;
  value: ScalarValue;
  label?: string;
}

/**
 * Valor selecionável de um atributo do produto (ex.: "VELUDO" para `tecido`).
 *
 * O `id` é o handle PACP-interno (use em rules, dependencies, etc.);
 * o `value` é o valor semântico do atributo (use em tabelas e `source_when`).
 */
export interface Option {
  /** ID estável da option, único por catálogo. */
  id: string;
  /** Atributo ao qual esta option pertence. DEVE existir em `Product.attributes`. */
  attribute_id: string;
  /** Valor semântico (string/number/boolean). Usado em lookups de tabelas e em `source_when`. */
  value: ScalarValue;
  /** Rótulo legível ao usuário final. */
  label?: string;
  /** Imagens contextuais da variante (priorizadas sobre `product.images`). */
  images?: Image[];
}

/**
 * Política de lote obrigatório no nível do produto. Ver spec §4.1.
 *
 * - `source: "CONTEXT"` → lote vem de `context[context_key]`.
 * - `source: "ATTRIBUTE"` → lote vem da option selecionada do attribute.
 *
 * Quando `required=true`, ausência do lote bloqueia o cálculo.
 */
export interface LotPolicy {
  required: boolean;
  source: "CONTEXT" | "ATTRIBUTE";
  /** Obrigatório quando `source="CONTEXT"`. */
  context_key?: string;
  /** Obrigatório quando `source="ATTRIBUTE"`. */
  attribute_id?: string;
}

/**
 * Política de conversão de unidade solicitada → unidade vendável. Ver spec §4.2 e §5.5.
 *
 * Exemplo: piso vendido em caixas de 2.5 m². Cliente pede 18 m² →
 * `required_sell_units = CEIL(18 / 2.5) = 8 caixas`.
 *
 * Em PACP, `rounding` DEVE ser `CEIL`.
 */
export interface SalesUnit {
  /** Unidade do pedido (m², L, kg). DEVE ser igual a `Product.unit` quando ambos existem. */
  requested_unit: string;
  /** Unidade comercial vendável (caixa, galão, saco). */
  sell_unit: string;
  /** Quantidade da unidade solicitada que cabe em 1 unidade vendável. */
  quantity_per_sell_unit: number;
  /** Em PACP DEVE ser `CEIL` (regra normativa). */
  rounding: "CEIL" | "FLOOR" | "ROUND" | "HALF_UP";
  /** Piso mínimo de unidades vendáveis. */
  min_sell_units?: number;
}

/**
 * Quem fornece o material físico para a fábrica produzir o item.
 *
 * - `FACTORY`: fábrica fornece (preço somado via `factory_cost`).
 * - `CUSTOMER`: cliente fornece (preço ignorado; sai em `supplied_quantities[]`).
 */
export type SuppliedMaterialSource = "FACTORY" | "CUSTOMER";

/** Quantidade fixa de insumo (use quando não varia por configuração). */
export interface SuppliedMaterialQuantityValue {
  /** Quantidade positiva. */
  value: number;
  /** Unidade (m², m, kg, un). */
  unit: string;
}

/** Quantidade resolvida via lookup em tabela (use quando varia por configuração — ex: sofá 3 vs 4 lugares). */
export interface SuppliedMaterialQuantityTable {
  /** ID de uma tabela `LOOKUP` definida no catálogo. */
  table_id: string;
  /** Unidade do valor retornado pela tabela. */
  unit: string;
}

/**
 * Quantidade de insumo necessária por produto. Aceita valor fixo OU lookup.
 *
 * Sempre exige `unit`. Ver spec §4.8.
 */
export type SuppliedMaterialQuantity = SuppliedMaterialQuantityValue | SuppliedMaterialQuantityTable;

/** Custo do material declarado como valor literal. */
export interface SuppliedMaterialCostValue {
  /** Valor ≥ 0. Custo zero é permitido (material gratuito); negativo é inválido. */
  value: number;
}
/** Custo do material resolvido via lookup em tabela. */
export interface SuppliedMaterialCostTable { table_id: string; }
/** Custo do material resolvido executando um ruleset específico. */
export interface SuppliedMaterialCostRuleset { ruleset_id: string; }

/**
 * Custo do material quando fonte resolvida = `FACTORY`.
 * Exatamente um de `value`, `table_id` ou `ruleset_id`.
 *
 * Ausente → engine NÃO soma (custo já incluso em `base_price` ou em rulesets externos).
 */
export type SuppliedMaterialCost =
  | SuppliedMaterialCostValue
  | SuppliedMaterialCostTable
  | SuppliedMaterialCostRuleset;

/**
 * Mapeia valores de `option.value` (do attribute referenciado por `sourcing_attribute_id`)
 * para o modo de sourcing.
 *
 * Cada `value` distinto de option do attribute DEVE aparecer em `factory[]` OU `customer[]`;
 * validadores reportam `UNCOVERED_OPTION_VALUE` caso contrário.
 *
 * Exemplo: `{ factory: ["FABRICA", "OWN"], customer: ["EU_FORNECO", "COB"] }`.
 */
export interface SourceWhen {
  /** Valores que mapeiam para fonte = FACTORY. */
  factory: ScalarValue[];
  /** Valores que mapeiam para fonte = CUSTOMER. */
  customer: ScalarValue[];
}

/**
 * Insumo consumido pelo produto, com regra de quem fornece (fábrica ou cliente).
 *
 * Caso-tipo: sofá que aceita tecido próprio do lojista. Ver spec §4.8.
 *
 * Convenção dura: quando `supplied_materials` está presente, `base_price` representa
 * o produto SEM os materiais declarados. Custo vive em `factory_cost`.
 */
export interface SuppliedMaterial {
  /** ID único do insumo no produto. */
  id: string;
  /** Tipo do material em SNAKE_UPPER (ex: `TECIDO`, `COURO`, `VIDRO`, `MARMORE`). */
  material: string;
  /** Quantidade necessária. */
  quantity: SuppliedMaterialQuantity;
  /** Quem fornece quando não há escolha no orçamento. Default `FACTORY`. */
  default_source?: SuppliedMaterialSource;
  /** Attribute do produto cuja option selecionada decide a fonte. Quando presente, `source_when` é OBRIGATÓRIO. */
  sourcing_attribute_id?: string;
  /** Mapeia `option.value` para `FACTORY`/`CUSTOMER`. Obrigatório quando `sourcing_attribute_id` está presente. */
  source_when?: SourceWhen;
  /** Custo somado quando fonte resolvida = `FACTORY`. Ignorado quando = `CUSTOMER`. */
  factory_cost?: SuppliedMaterialCost;
  /** Bloco livre de requisitos do material. Profile `moveis` padroniza `x-fabric_requirements`. */
  requirements?: Record<string, unknown>;
  [key: `x-${string}`]: unknown;
}

/**
 * Entrada no output do orçamento descrevendo material que o CLIENTE precisa fornecer.
 *
 * O engine produz uma entrada por cada `SuppliedMaterial` cuja fonte resolvida = `CUSTOMER`.
 * PDV consome para exibir "fornecer X m² de tecido"; sistema de gestão gera pedido de fornecimento.
 */
export interface SupplyOutputEntry {
  /** ID do `SuppliedMaterial` que originou esta entrada. */
  material_id: string;
  /** Tipo do material (`TECIDO`, `COURO`, etc.). */
  material: string;
  /** Quantidade resolvida pelo engine (após lookup, se aplicável). */
  quantity: number;
  /** Unidade da quantidade. */
  unit: string;
  /** Requisitos copiados do `SuppliedMaterial.requirements`. */
  requirements?: Record<string, unknown>;
}

/**
 * Produto único do catálogo. Ver spec §4.
 *
 * Campos descritivos (`sku`, `manufacturer`, `category`, etc.) são opcionais e não alteram cálculo.
 * Configurabilidade vem de `attributes` + `options` + `rulesets` + `tables`.
 *
 * Estrutura típica:
 * - `id`, `name`, `base_price`
 * - `attributes: [{ id: "tecido" }, { id: "cor" }]`
 * - `options: [{ id: "opt_veludo", attribute_id: "tecido", value: "VELUDO" }, ...]`
 * - `ruleset_ids: ["rs_base"]`
 */
export interface Product {
  /** ID estável do produto, único por catálogo. Case-sensitive. */
  id: string;
  /** Nome legível. */
  name?: string;
  /**
   * `PUBLIC` (default): exibível em vitrines.
   * `INTERNAL`: existe no catálogo para orçamento mas não para vitrine pública.
   * Caso típico INTERNAL: insumos, ferragens, componentes.
   */
  visibility?: "PUBLIC" | "INTERNAL";
  /** Código SKU para integração com ERP. */
  sku?: string;
  manufacturer?: string;
  brand?: string;
  description?: string;
  /**
   * Categorias hierárquicas. Cada path é um array da raiz à folha.
   * Permite múltipla classificação. Exemplo: `[["Móveis", "Estofados", "Sofá"], ["Promoções"]]`.
   */
  category?: string[][];
  /** Código de barras GS1 (8-14 dígitos). */
  gtin?: string;
  /**
   * Preço base do produto. Ponto de partida dos rulesets de `BASE`.
   * Quando `supplied_materials` está presente, representa o produto SEM os materiais declarados.
   */
  base_price?: number;
  /**
   * Unidade base na qual `base_price` é cotado (ex: `un`, `m2`, `kg`). Default implícito: `un`.
   * Quando coexistir com `sales_unit`, `sales_unit.requested_unit` DEVE ser igual a `unit`.
   */
  unit?: string;
  images?: Image[];
  /** Tags livres para busca. Sem garantia de estabilidade (diferente de `collections`). */
  tags?: string[];
  /**
   * IDs de coleções (agrupamento curatorial/sazonal estável).
   * Disponível em rules como fato `product.collections` com operadores `IN`/`NOT_IN`.
   * Exemplo: `["verao_2026", "linha_premium"]`. Ver spec §4.7.
   */
  collections?: string[];
  weight?: Measure;
  dimensions?: PhysicalDimensions;
  lot_policy?: LotPolicy;
  sales_unit?: SalesUnit;
  /** Atributos configuráveis do produto. */
  attributes?: AttributeRef[];
  /** Valores fixos de atributos (não escolhíveis). Complementar a `options`. */
  attribute_values?: AttributeValue[];
  /** Valores selecionáveis dos atributos. */
  options: Option[];
  /** Insumos consumidos pelo produto, com sourcing factory/customer. Ver spec §4.8. */
  supplied_materials?: SuppliedMaterial[];
  /** IDs de rulesets aplicados a este produto. */
  ruleset_ids?: string[];
  [key: `x-${string}`]: unknown;
}

/**
 * Condição atômica em `Condition.all`/`Condition.any`.
 *
 * Fatos disponíveis incluem: `option.<id>`, `attribute.<id>`, `context.<key>`,
 * `product.collections`, `product.category`, `supplied_materials.<id>.source`,
 * `supplied_materials.<id>.quantity`, `supplied_materials.any.source`, `supplied_materials.all.source`.
 */
export interface Predicate {
  /** Fato a avaliar. */
  fact: string;
  operator: "EQ" | "NEQ" | "IN" | "NOT_IN" | "GT" | "GTE" | "LT" | "LTE" | "EXISTS";
  /** Use para operadores escalares (`EQ`, `NEQ`, `GT`, etc.). */
  value?: ScalarValue;
  /** Use para operadores de conjunto (`IN`, `NOT_IN`). */
  values?: ScalarValue[];
}

/**
 * Condição lógica composta. `all` = AND; `any` = OR.
 * Pelo menos um dos campos é obrigatório.
 */
export interface Condition {
  all?: Predicate[];
  any?: Predicate[];
}

/** Componente de operações `MAX_OF`/`MIN_OF`/`PICK`. */
export interface Component {
  label?: string;
  value?: number;
  table_id?: string;
  option_id?: string;
}

/**
 * Operação executada por uma regra. Ver spec §6.
 *
 * - `ADD` / `PERCENT_OF`: acumulam.
 * - `OVERRIDE` / `PICK`: substituem.
 * - `LOOKUP`: busca em tabela.
 * - `MAX_OF` / `MIN_OF`: agregam componentes.
 * - `ROUND` / `CAP` / `FLOOR`: pós-processamento.
 */
export type RuleOperation =
  | "ADD" | "PERCENT_OF" | "OVERRIDE" | "LOOKUP"
  | "MAX_OF" | "MIN_OF" | "PICK" | "ROUND" | "CAP" | "FLOOR";

/**
 * Regra de precificação aplicada dentro de um ruleset.
 *
 * Ordem de execução: por `priority` decrescente, desempate por `id` lexicográfico.
 * Default: `priority=0`, `enabled=true`, `when` sempre verdadeiro.
 */
export interface Rule {
  /** ID único por ruleset. */
  id: string;
  operation: RuleOperation;
  /** Maior primeiro. Default 0. */
  priority?: number;
  /** Default true. */
  enabled?: boolean;
  /** Quando ausente, regra sempre dispara. */
  when?: Condition;
  /** Para `ADD`/`OVERRIDE`. */
  value?: number;
  /** Para `PERCENT_OF`. */
  percent?: number;
  /** Para `LOOKUP`. */
  table_id?: string;
  /** Para `MAX_OF`/`MIN_OF`/`PICK`. */
  components?: Component[];
  /** Para `ROUND`. */
  precision?: number;
  /** Para `CAP`. */
  max?: number;
  /** Para `FLOOR`. */
  min?: number;
  /** Para `LOOKUP` sem chave correspondente. */
  fallback?: number;
  option_id?: string;
  option_ids?: string[];
  [key: `x-${string}`]: unknown;
}

/**
 * Conjunto de regras aplicadas em um estágio (`target`) do cálculo.
 *
 * Estágios: `BASE` (preço base), `SUBTOTAL` (após base), `TOTAL` (final).
 */
export interface Ruleset {
  id: string;
  target: "BASE" | "SUBTOTAL" | "TOTAL";
  rules: Rule[];
  [key: `x-${string}`]: unknown;
}

/**
 * Dimensão de uma tabela `LOOKUP`. Define como obter o valor da chave.
 *
 * - `ATTRIBUTE`: usa option selecionada do attribute.
 * - `CONTEXT`: usa valor de `context[context_key]`.
 * - `LITERAL`: usa valor fixo.
 */
export interface LookupAxis {
  /** Nome da chave usada nas `rows`. */
  key: string;
  source: "ATTRIBUTE" | "CONTEXT" | "LITERAL";
  attribute_id?: string;
  context_key?: string;
  literal?: ScalarValue;
}

/** Linha de uma tabela `LOOKUP` (chave composta → valor numérico). */
export interface TableRow {
  /** Mapa de chave: `{ "tecido": "VELUDO", "lugares": "3" }`. */
  key: Record<string, ScalarValue>;
  /** Valor retornado quando todas as dimensões batem. */
  value: number;
}

/**
 * Tabela de lookup determinística usada por regras `LOOKUP` ou por `supplied_materials.quantity.table_id`.
 *
 * A chave de busca é construída pelas `dimensions` na ordem declarada.
 */
export interface Table {
  id: string;
  type: "LOOKUP";
  dimensions: LookupAxis[];
  rows: TableRow[];
}

/**
 * Relação lógica entre opções. Avaliada na fase de validação (antes do cálculo).
 *
 * - `REQUIRES`: opção A exige opção B selecionada.
 * - `IMPLIES`: seleção de A implica B.
 * - `AVAILABLE_OPTIONS_WHEN`: lista opções habilitadas sob condição.
 */
export interface Dependency {
  id: string;
  type: "REQUIRES" | "IMPLIES" | "AVAILABLE_OPTIONS_WHEN";
  product_id?: string;
  option_id?: string;
  requires_option_ids?: string[];
  allowed_option_ids?: string[];
  when?: Condition;
}

/**
 * Bloqueio duro de combinação. Quando `when` é verdadeiro, cálculo é interrompido.
 *
 * Avaliada antes do cálculo de preço (junto com dependencies).
 */
export interface Constraint {
  id: string;
  type: "DENY";
  when: Condition;
  /** Mensagem legível exibida ao orçamentista. */
  message: string;
  product_id?: string;
  option_ids?: string[];
}

/**
 * Lista de preço do catálogo.
 *
 * `context.price_list_id` seleciona qual lista usar; fallback para `catalog.default_price_list_id`.
 */
export interface PriceList {
  id: string;
  currency: string;
  label?: string;
  /** Casamento com `context` para seleção automática. */
  context_match?: Record<string, ScalarValue>;
}

/** Metadados do catálogo (lista de preço, default). */
export interface Catalog {
  id: string;
  name?: string;
  /** Observações públicas sobre o catálogo. Consumidores PODEM exibir. */
  notes?: string;
  /** Anotações não-públicas. Consumidores que geram catálogos públicos DEVEM omitir. Ver spec §9.1. */
  internal_notes?: string;
  default_price_list_id?: string;
  price_lists?: PriceList[];
  [key: `x-${string}`]: unknown;
}

/** Referência a um documento `PRODUCT` em arquivo separado, a partir do `CATALOG`. */
export interface ProductRef {
  /** DEVE ser igual ao `product.id` do arquivo apontado. */
  id: string;
  /** Caminho relativo ao diretório do manifesto. */
  path: string;
}

/**
 * Contexto de execução do orçamento. Carrega dados externos que rules e validações leem.
 *
 * Chaves arbitrárias `x-*` são permitidas para extensões customizadas.
 */
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

/** Hint informativo sobre o modo de cálculo predominante do catálogo. */
export interface Pricing {
  calculation_mode?: "CASCADE" | "TABLE_LOOKUP" | "OVERRIDE_BY_VARIANT" | "COST_PLUS";
}

/**
 * Manifesto do catálogo. Contém metadados, listas de preço, rulesets globais,
 * tabelas, dependencies, constraints e referências para arquivos `PRODUCT`.
 *
 * Identifica-se por `document_type: "CATALOG"`.
 */
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
  /** Extension profiles ativos (`moveis`, `iluminacao`, `pisos-revestimentos`, `fiscal-br`). */
  profiles?: string[];
  [key: `x-${string}`]: unknown;
}

/**
 * Documento isolado de um produto. Referenciado por um `CatalogDocument` via `product_refs[]`.
 *
 * Identifica-se por `document_type: "PRODUCT"`.
 */
export interface ProductDocument {
  document_type: "PRODUCT";
  /** ID do catálogo ao qual este produto pertence. DEVE bater com `catalog.id` no manifesto. */
  catalog_id: string;
  product: Product;
  rulesets?: Ruleset[];
  tables?: Table[];
  constraints?: Constraint[];
  dependencies?: Dependency[];
  profiles?: string[];
  [key: `x-${string}`]: unknown;
}

/** Qualquer documento PACP válido (CATALOG ou PRODUCT). */
export type PacpDocument = CatalogDocument | ProductDocument;

/** IDs dos profiles oficiais PACP. */
export type ProfileId = "moveis" | "iluminacao" | "pisos-revestimentos" | "fiscal-br";

/** Problema reportado pelo validador. */
export interface ValidationIssue {
  /** Código machine-readable (ex: `SCHEMA`, `DUPLICATE_ID`, `MISSING_SOURCING_ATTRIBUTE`). */
  code: string;
  /** JSON Pointer apontando para o local exato do problema. */
  path: string;
  /** Mensagem humana descrevendo o problema. */
  message: string;
}

/** Resultado da validação. `valid=true` ⇔ `issues.length === 0`. */
export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}
