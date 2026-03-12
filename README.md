# PACP - Padrão Aberto de Catálogo e Precificação

PACP define um contrato aberto para modelar catálogo e precificação de forma determinística, sem exigir expansão massiva de SKUs.

Projetado para **Móveis e Alta Decoração**, **Pisos e Revestimentos**, **Iluminação** e setores correlatos.

[![npm](https://img.shields.io/npm/v/@pacp/spec)](https://www.npmjs.com/package/@pacp/spec)
[![license](https://img.shields.io/github/license/pacp-org/pacp)](LICENSE)

## Início rápido

### Pacote npm

A forma mais simples de usar o PACP em qualquer projeto Node.js/TypeScript:

```bash
npm install @pacp/spec
```

```typescript
import { schema, profiles, validate, SPEC_VERSION } from '@pacp/spec';
import type { Product, CatalogDocument, Ruleset } from '@pacp/spec';

// Schema JSON completo
console.log(schema.$id); // "https://pacp.dev/spec/1.0.0/pacp.schema.json"

// Validar um documento
const result = validate(meuCatalogo);
if (!result.valid) {
  result.issues.forEach(i => console.error(`[${i.code}] ${i.message}`));
}

// Extension profiles por vertical
console.log(profiles.moveis.title);    // "PACP Profile: Moveis e Alta Decoracao"
console.log(profiles.iluminacao.title); // "PACP Profile: Iluminacao"
```

Para validação, instale também as peer dependencies:

```bash
npm install @pacp/spec ajv ajv-formats
```

### Acesso direto aos JSONs

```javascript
const schema = require('@pacp/spec/schema.json');
const moveis = require('@pacp/spec/profiles/moveis.json');
const pisos  = require('@pacp/spec/profiles/pisos-revestimentos.json');
```

## Estrutura do repositório

```
spec/
├── 1.0.0/
│   ├── pacp.md              ← especificação normativa
│   ├── pacp.schema.json     ← JSON Schema oficial
│   ├── profiles/            ← extension profiles por vertical
│   └── examples/            ← exemplos oficiais
├── latest.json              ← ponteiro estável para integração
packages/
└── pacp/                    ← pacote npm @pacp/spec
docs/                        ← guias (integração, engine, importação, princípios)
tools/
└── validator/               ← CLI de validação
site/                        ← site estático (GitHub Pages)
```

## Extension Profiles

O PACP adota um modelo híbrido: campos universais no core do `product` (`sku`, `manufacturer`, `brand`, `description`, `gtin`, `images`, `weight`, `dimensions`, `tags`) e **extension profiles** para campos específicos de cada vertical.

Profiles são JSON Schemas que padronizam campos `x-*` por setor, com validação formal.

| Profile | Vertical | Campos |
|---------|----------|--------|
| `moveis` | Móveis e Alta Decoração | `x-assembly_required`, `x-load_capacity`, `x-finish`, `x-warranty_months` |
| `iluminacao` | Iluminação | `x-lumens`, `x-color_temp_k`, `x-voltage`, `x-dimmable`, `x-cri` |
| `pisos-revestimentos` | Pisos e Revestimentos | `x-pei`, `x-slip_resistance`, `x-rectified`, `x-usage` |
| `fiscal-br` | Fiscal Brasil | `x-ncm`, `x-origem`, `x-cest`, `x-cfop` |

Para usar, declare `"profiles": ["moveis"]` no documento e o validador verificará os campos `x-*` contra o schema do profile.

## Validador CLI

```bash
cd tools/validator
npm ci && npm run build

# Validar um arquivo
npm run validate -- ../../spec/1.0.0/examples/moveis/max_of.json

# Validar todos os exemplos oficiais
npm run validate:examples

# Sincronizar product_refs automaticamente
npm run sync:product-refs -- ../../spec/1.0.0/examples/geral/minimal.json
```

O validador verifica: schema, IDs duplicados, referências quebradas, semântica de operações, lote obrigatório, unidade de venda e campos de profiles.

## Canal `latest`

Para integrações que não querem fixar versão, `spec/latest.json` aponta para a versão corrente:

```json
{
  "spec_version": "1.0.0",
  "paths": {
    "spec": "spec/1.0.0/pacp.md",
    "schema": "spec/1.0.0/pacp.schema.json",
    "profiles": "spec/1.0.0/profiles/",
    "examples": "spec/1.0.0/examples/"
  }
}
```

## Documentação

- **[Guia de integração](docs/integration-guide.md)** — ponto de entrada para integradores, com explicação completa da spec e exemplos por vertical
- [Guia do engine](docs/pricing-engine.md) — pipeline de processamento e semântica de operações
- [Guia de importação](docs/import-guidelines.md) — como converter planilhas para PACP
- [Princípios de design](docs/design-principles.md) — decisões arquiteturais do padrão
- [Governança](docs/governance.md)
- [Site](https://pacp-org.github.io/pacp/)

## Links

- **npm:** [@pacp/spec](https://www.npmjs.com/package/@pacp/spec)
- **Site:** [pacp-org.github.io/pacp](https://pacp-org.github.io/pacp/)
- **Spec v1.0.0:** [spec/1.0.0/pacp.md](spec/1.0.0/pacp.md)
- **JSON Schema:** [spec/1.0.0/pacp.schema.json](spec/1.0.0/pacp.schema.json)

## Licença

[MIT](LICENSE)
