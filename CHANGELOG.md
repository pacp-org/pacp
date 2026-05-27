# Changelog

Todas as mudanças relevantes deste projeto serão registradas neste arquivo.

## [3.4.1] - 2026-05-27

**npm:** `@pacp/spec@3.4.1`

### Added

- **`AGENTS.md`** no root do repo: guia conciso para agentes (Claude Code, Codex, etc.) que geram ou consomem PACP. Cobre quickstart, convenções não-óbvias, receitas comuns (supplied_materials, sales_unit, lookup, queima de coleção, constraint), tabela de erros do validador → fix, e don'ts.
- **JSDoc** em todas as interfaces e tipos exportados pelo pacote `@pacp/spec`. Descrições inline em PT-BR, com referência cruzada às seções da spec normativa (§4, §4.7, §4.8, §5.2, §5.5, §6, etc.). Tornam `Product.supplied_materials`, `SuppliedMaterial`, `SourceWhen`, `SalesUnit`, `Rule`, `Predicate` autoexplicativos quando consumidos via TS server / completions / agentes.

### Changed

- Tamanho do bundle `.d.ts` cresceu de ~7 KB para ~20 KB (JSDoc included). Sem mudança de runtime.

## [3.4.0] - 2026-05-27

**npm:** `@pacp/spec@3.4.0`

### Added

- **`product.supplied_materials`**: campo opcional `array` que declara insumos consumidos pelo produto (tecido, couro, vidro, etc.) com regra de quem fornece (fábrica ou cliente). Resolve casos como "sofá com tecido fornecido pelo lojista". Cada item declara `id`, `material`, `quantity` (fixa ou via `table_id`), `default_source`, `sourcing_attribute_id` opcional (vincula a uma escolha de attribute/option no orçamento) com `source_when` correspondente, `factory_cost` opcional (custo quando fonte=FACTORY) e bloco livre `requirements`.
- **Spec normativa (4.8)**: nova seção definindo modelo, semântica do engine (resolução de fonte/quantidade, output `supplied_quantities[]`) e fatos expostos para rules/constraints (`supplied_materials.<id>.source`, `.quantity`, agregados `any`/`all`).
- **Pipeline (5.2)**: novo passo 5 de resolução de `supplied_materials` entre `sales_unit` e inicialização de `base_price`.
- **Profile `moveis`**: novo schema `x-fabric_requirements` para padronizar requisitos de tecido (`min_weight_gsm`, `max_weight_gsm`, `min_width_cm`, `allowed_compositions`, `abrasion_min_cycles_martindale`, `flammability_standard`).
- **Validador CLI**: novas validações `MISSING_SOURCING_ATTRIBUTE`, `INVALID_SOURCE_WHEN`, `UNCOVERED_OPTION_VALUE`, `DUPLICATE_SUPPLIED_MATERIAL_ID`.
- **Pacote `@pacp/spec`**: tipos `SuppliedMaterial`, `SuppliedMaterialQuantity`, `SuppliedMaterialCost`, `SourceWhen`, `SuppliedMaterialSource`, `SupplyOutputEntry`; `Product.supplied_materials?: SuppliedMaterial[]`.
- **Exemplo oficial**: `examples/supplied_materials.json` + `products/prod_sofa_modular.json` com tabelas `tbl_tecido_qty_por_lugares` e `tbl_tecido_preco_por_tipo`.
- **Docs**: `integration-guide.md`, `import-guidelines.md` e `pricing-engine.md` atualizados.

### Convention

- Quando `supplied_materials` está presente, `base_price` representa o produto SEM os materiais declarados. Custo do material vive em `factory_cost`. Importadores que recebem planilha "tudo incluso" precisam desentrelaçar.

## [3.3.0] - 2026-05-05

**npm:** `@pacp/spec@3.3.0`

### Added

- **`product.collections`**: campo opcional `array of string` que lista IDs de coleções às quais o produto pertence (ex.: `["verao_2026", "linha_premium"]`). Itens devem ser únicos (`uniqueItems`) e seguem as regras gerais de IDs (estáveis, case-sensitive, únicos por catálogo).
- **Spec normativa (4.7)**: nova seção definindo semântica de coleção como agrupamento curatorial/sazonal, distinto de `tags` (livre) e `category` (taxonomia). Implementações podem usar coleções em condições de `rules` via fact `product.collections` com operadores `IN`/`NOT_IN`.
- **Exemplo dedicado**: `examples/collections.json` + `prod_camisa_inverno.json` + `prod_jaqueta_premium.json` demonstrando "queima de coleção" (`-30%` para `inverno_2025`) com proteção de linha premium.
- **Exemplos existentes** atualizados: `prod_camiseta.json`, `prod_sofa.json` e `prod_mesa.json` ganham `collections` para refletir uso típico em moda e mobiliário.
- **Pacote `@pacp/spec`**: tipo `Product.collections?: string[]` adicionado e `Product.category` corrigido para `string[][]` (alinhado ao schema desde v3.0.0).

### Fixed

- **Tipo `Product.category`** no pacote npm estava `string` por engano desde a v3.0.0; agora é `string[][]` (array de paths hierárquicos), alinhado ao schema.

## [3.2.0] - 2026-04-14

**npm:** `@pacp/spec@3.2.0`

### Added

- **`product.visibility`**: campo opcional com valores `PUBLIC` (default) ou `INTERNAL`. Permite marcar produtos como internos (componentes, insumos, ferragens) que não devem aparecer em catálogos públicos mas continuam válidos para orçamento e precificação.
- **Exemplo**: produto `prod_ferragem.json` com `visibility: "INTERNAL"` adicionado ao catálogo de dependencies.

## [3.1.0] - 2026-04-13

**npm:** `@pacp/spec@3.1.0`

### Added

- **`image`**: campos opcionais `alt` (texto alternativo / acessibilidade) e `position` (inteiro ≥ 0 para ordenação explícita de exibição).
- **`option.images`**: array de `image` por variante, com mesma estrutura de `product.images`; consumidores devem priorizar imagens da option selecionada sobre as do produto para exibição contextual.
- **Pacote `@pacp/spec`**: tipos `Image` e `Option` alinhados ao schema (`alt`, `position`, `Option.images`).
- **Docs**: `docs/integration-guide.md` atualizado com `alt`, `position` e `option.images`.

## [3.0.0] - 2026-04-07

### Breaking Changes

- **`category` agora é array de paths hierárquicos** (`string[][]`). Cada item é um array de segmentos da raiz à folha na árvore de categorias (ex.: `[["Móveis", "Sofá"], ["Promoções"]]`). Substitui o formato anterior `string` (v2) e `string[]` (unreleased). Permite classificação múltipla e hierárquica no mesmo produto.
- **Removido campo `spec`** dos documentos CATALOG e PRODUCT. A versão da spec agora vive apenas em `spec/latest.json`.
- **Normalização snake_case** em todos os field names de documentos:
  - `attributeId` → `attribute_id`
  - `optionId` → `option_id`
  - `optionIds` → `option_ids`
  - `tableId` → `table_id`
  - `contextKey` → `context_key`
  - `rulesetIds` → `ruleset_ids`
  - `productId` → `product_id`
  - `requiresOptionIds` → `requires_option_ids`
  - `allowedOptionIds` → `allowed_option_ids`
- **Removido `table.keys`** (redundante com `table.dimensions`).
- **`condition`** agora exige pelo menos `all` ou `any` (não aceita objeto vazio).

### Changed

- **Diretório `spec/1.0.0/`** renomeado para **`spec/latest/`**.
- **`$defs` renomeados** para snake_case com nomes semânticos claros:
  - `dimension` → `lookup_axis` (eixo de tabela de lookup, não confundir com dimensões físicas)
  - `dimensionsObj` → `physical_dimensions`
  - `imageRef` → `image`
  - Todos os demais: camelCase → snake_case
- **`context`** agora aceita chaves arbitrárias (`additionalProperties: scalar_value`) além das pré-definidas.
- **`sales_unit.rounding`** expandido: `CEIL`, `FLOOR`, `ROUND`, `HALF_UP`.
- **`dependency`** com validação condicional por tipo (`REQUIRES` exige `requires_option_ids`, `AVAILABLE_OPTIONS_WHEN` exige `allowed_option_ids` + `when`).

### Removed

- Viewer (`tools/viewer/`) removido para reconstrução futura.
- Exemplos antigos (incluindo `loja-teste/`) removidos e substituídos por 6 exemplos didáticos novos.
- Constante `SPEC_VERSION` removida do pacote npm.

### Added

- 6 exemplos novos: `minimal`, `matrix_lookup`, `max_of_components`, `dependencies`, `multi_price_list`, `extensions`.
