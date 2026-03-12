# PACP - Padrão Aberto de Catálogo e Precificação

PACP define um contrato aberto para modelar catálogo e precificação de forma determinística, sem exigir expansão massiva de SKUs.

Também cobre cenários de venda por unidade comercial (ex.: caixa) a partir de quantidade solicitada em outra unidade (ex.: m2), com cálculo mínimo vendável via `CEIL`, além de controle de lote por produto quando aplicável.

## Estrutura principal

- `spec/1.0.0/pacp.md`: especificação normativa v1.0.0.
- `spec/1.0.0/pacp.schema.json`: JSON Schema oficial.
- `spec/1.0.0/profiles/`: extension profiles por vertical (móveis, iluminação, pisos, fiscal-br).
- `spec/1.0.0/examples/`: exemplos oficiais da versão.
- `spec/latest.json`: ponteiro estável para a última spec publicada.
- `docs/`: guias práticos de engine, importação, governança e princípios.
- `tools/validator/`: CLI mínima para validação.

## Extension Profiles

O PACP adota um modelo híbrido de extensibilidade: campos universais no core do `product` (sku, manufacturer, brand, description, gtin, images, weight, dimensions, tags) e **extension profiles** para verticais de mercado.

Profiles são JSON Schemas que padronizam campos `x-*` por setor, permitindo validação formal de extensões.

| Profile | Vertical | Exemplo |
|---------|----------|---------|
| `moveis` | Móveis e Alta Decoração | `x-assembly_required`, `x-load_capacity`, `x-finish` |
| `iluminacao` | Iluminação | `x-lumens`, `x-color_temp_k`, `x-voltage`, `x-dimmable` |
| `pisos-revestimentos` | Pisos e Revestimentos | `x-pei`, `x-slip_resistance`, `x-rectified` |
| `fiscal-br` | Fiscal Brasil | `x-ncm`, `x-origem`, `x-cest` |

Para usar, declare `"profiles": ["moveis"]` no documento e o validador verificará os campos `x-*` contra o schema do profile.

## Canal `latest` para integração

Para integrações que não querem fixar versão no código, use `spec/latest.json` como ponto de entrada estável.

Ele informa a versão publicada no canal `latest` e os caminhos oficiais de:
- spec (`pacp.md`);
- schema (`pacp.schema.json`);
- exemplos (`examples/`).

Fluxo recomendado para sistemas:
1. Ler `spec/latest.json`.
2. Resolver `paths.schema`.
3. Validar documentos contra o schema da versão publicada.

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

### Sincronizar `product_refs` automaticamente

Atualiza `product_refs` de um manifesto `CATALOG` com base nos arquivos `PRODUCT` da pasta `products/` (ordem lexicográfica determinística):

```bash
cd tools/validator
npm run sync:product-refs -- ../../spec/1.0.0/examples/geral/minimal.json
```

Opcionalmente, informe um diretório de produtos diferente (relativo ao manifesto):

```bash
cd tools/validator
node dist/sync-product-refs.js ../../spec/1.0.0/examples/geral/minimal.json products
```

O validador também executa checks semânticos para:
- lote obrigatório configurado por produto;
- coerência entre `requested_unit` e `sales_unit.requested_unit`;
- consistência do cálculo mínimo vendável (`CEIL`) em exemplos com `x-expected_required_sell_units`.

## Documentação complementar

- **Guia de integração: `docs/integration-guide.md`** — ponto de entrada para integradores, com explicação completa da spec, exemplos por vertical e passo a passo.
- Guia de engine: `docs/pricing-engine.md`
- Guia de importação: `docs/import-guidelines.md`
- Governança: `docs/governance.md`
- Princípios: `docs/design-principles.md`
- Contribuição: `CONTRIBUTING.md`
- Conduta: `CODE_OF_CONDUCT.md`
- Changelog: `CHANGELOG.md`
- Licença: `LICENSE` (MIT)
