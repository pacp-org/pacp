# Changelog

Todas as mudanças relevantes deste projeto serão registradas neste arquivo.

## [Unreleased] - 2026-04-06 — Schema Refactoring

### Breaking Changes

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
