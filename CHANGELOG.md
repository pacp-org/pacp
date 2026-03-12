# Changelog

Todas as mudanças relevantes deste projeto serão registradas neste arquivo.

## [1.0.0] - 2026-02-13

### Added

- Especificação normativa inicial em `spec/1.0.0/pacp.md`.
- JSON Schema oficial em `spec/1.0.0/pacp.schema.json`.
- Exemplos oficiais em `spec/1.0.0/examples/`.
- Guias operacionais em `docs/`.
- CLI mínima de validação em `tools/validator/`.
- Documentos de publicação na raiz (`LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `README.md`).

### Added (2026-03-02)

- Campo opcional `product.reference` para identificação de referência comercial/ERP do produto.
- Campo opcional `product.category` para classificação simples de categoria no nível do produto.
- Campo opcional `product.attribute_values` para declarar valores fixos de atributos no nível do produto.
- Arquivo `spec/latest.json` como ponteiro estável para a última spec publicada.

### Compatibility (2026-03-02)

- Mudança backward-compatible: nenhum campo obrigatório foi alterado.
- Documentos `v1.0.0` continuam válidos; os novos campos são opcionais.

### Changed (2026-03-12) — Core Universal + Extension Profiles

**BREAKING:** Campo `product.reference` renomeado para `product.sku`.

**Campos universais adicionados ao `product`** (todos opcionais):

- `sku` (substitui `reference`): código SKU do produto.
- `manufacturer`: fabricante do produto.
- `brand`: marca comercial.
- `description`: descrição legível do produto.
- `gtin`: código de barras GS1 (EAN-8/13, GTIN-14).
- `images`: array de referências a imagens (`imageRef` com `url`, `label`, `type`).
- `tags`: tags livres para busca e classificação.
- `weight`: peso com valor e unidade (`measure`).
- `dimensions`: largura, altura, profundidade com unidade (`dimensionsObj`).

**Novos `$defs` no schema:** `imageRef`, `measure`, `dimensionsObj`.

**Extension Profiles:**

- Campo opcional `profiles` adicionado a `catalogDocument` e `productDocument`.
- Profiles oficiais em `spec/1.0.0/profiles/`:
  - `moveis.schema.json` — Móveis e Alta Decoração.
  - `iluminacao.schema.json` — Iluminação.
  - `pisos-revestimentos.schema.json` — Pisos e Revestimentos.
  - `fiscal-br.schema.json` — Dados Fiscais Brasil.

**Validador atualizado:**

- Suporte a validação de extensões `x-*` contra profile schemas declarados.
- Detecção de profiles desconhecidos (`UNKNOWN_PROFILE`).

**Exemplos atualizados:**

- Produtos enriquecidos com campos universais e extensões de profile.
- Catálogos de verticais declaram `profiles`.

### Compatibility (2026-03-12)

- `product.reference` → `product.sku` é **breaking change** (pre-release).
- Todos os demais campos adicionados são opcionais.
- Profiles são opcionais e aditivos.
