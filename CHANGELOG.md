# Changelog

Todas as mudanças relevantes deste projeto serão registradas neste arquivo.

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
