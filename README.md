# PACP - Padrão Aberto de Catálogo e Precificação

PACP define um contrato aberto para modelar catálogo e precificação de forma determinística, sem exigir expansão massiva de SKUs.

Também cobre cenários de venda por unidade comercial (ex.: caixa) a partir de quantidade solicitada em outra unidade (ex.: m2), com cálculo mínimo vendável via `CEIL`, além de controle de lote por produto quando aplicável.

## Estrutura principal

- `spec/1.0.0/pacp.md`: especificação normativa v1.0.0.
- `spec/1.0.0/pacp.schema.json`: JSON Schema oficial.
- `spec/1.0.0/examples/`: exemplos oficiais da versão.
- `docs/`: guias práticos de engine, importação, governança e princípios.
- `tools/validator/`: CLI mínima para validação.

## Validador CLI (`pacp-validate`)

### Requisitos

- Node.js 20+
- npm

### Instalação

```bash
cd tools/validator
npm ci
```

### Build

```bash
npm run build
```

### Validar um arquivo

```bash
npm run validate -- ../../spec/1.0.0/examples/geral/minimal.json
```

ou:

```bash
npx --prefix tools/validator pacp-validate spec/1.0.0/examples/geral/minimal.json
```

### Validar exemplos oficiais

```bash
cd tools/validator
npm run validate:examples
```

O validador também executa checks semânticos para:
- lote obrigatório configurado por produto;
- coerência entre `requested_unit` e `sales_unit.requested_unit`;
- consistência do cálculo mínimo vendável (`CEIL`) em exemplos com `x-expected_required_sell_units`.

## Documentação complementar

- Guia de engine: `docs/pricing-engine.md`
- Guia de importação: `docs/import-guidelines.md`
- Governança: `docs/governance.md`
- Princípios: `docs/design-principles.md`
- Contribuição: `CONTRIBUTING.md`
- Conduta: `CODE_OF_CONDUCT.md`
- Changelog: `CHANGELOG.md`
- Licença: `LICENSE` (MIT)
