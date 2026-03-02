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
