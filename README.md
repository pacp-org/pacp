# PACP - Padrão Aberto de Catálogo e Precificação

PACP define um contrato aberto para modelar catálogo e precificação de forma determinística, sem exigir expansão massiva de SKUs.

Projetado para **Móveis e Alta Decoração**, **Pisos e Revestimentos**, **Iluminação** e setores correlatos.

[![npm](https://img.shields.io/npm/v/@pacp/spec)](https://www.npmjs.com/package/@pacp/spec)
[![license](https://img.shields.io/github/license/pacp-org/pacp)](LICENSE)

## Início rápido

### Pacote npm

```bash
npm install @pacp/spec
```

```typescript
import { schema, profiles, validate } from '@pacp/spec';
import type { Product, CatalogDocument, Ruleset } from '@pacp/spec';

// Schema JSON completo
console.log(schema.$id);

// Validar um documento
const result = validate(meuCatalogo);
if (!result.valid) {
  result.issues.forEach(i => console.error(`[${i.code}] ${i.message}`));
}

// Extension profiles por vertical
console.log(profiles.moveis.title);
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

## CDN / URLs públicas

O schema e os profiles estão disponíveis via CDN pública (jsDelivr), sem necessidade de instalação:

| Recurso | URL |
|---------|-----|
| Schema (latest) | `https://cdn.jsdelivr.net/npm/@pacp/spec@latest/dist/pacp.schema.json` |
| Profile Móveis | `https://cdn.jsdelivr.net/npm/@pacp/spec@latest/dist/profiles/moveis.schema.json` |
| Profile Iluminação | `https://cdn.jsdelivr.net/npm/@pacp/spec@latest/dist/profiles/iluminacao.schema.json` |
| Profile Pisos | `https://cdn.jsdelivr.net/npm/@pacp/spec@latest/dist/profiles/pisos-revestimentos.schema.json` |
| Profile Fiscal BR | `https://cdn.jsdelivr.net/npm/@pacp/spec@latest/dist/profiles/fiscal-br.schema.json` |

## Estrutura do repositório

```
spec/
├── latest/
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
npm run validate -- ../../spec/latest/examples/minimal.json

# Validar todos os exemplos oficiais
npm run validate:examples
```

O validador verifica: schema, IDs duplicados, referências quebradas, semântica de operações, lote obrigatório, unidade de venda e campos de profiles.

## Canal `latest`

`spec/latest.json` aponta para a versão corrente:

```json
{
  "paths": {
    "spec": "spec/latest/pacp.md",
    "schema": "spec/latest/pacp.schema.json",
    "profiles": "spec/latest/profiles/",
    "examples": "spec/latest/examples/"
  }
}
```

## Documentação

- **[Guia de integração](docs/integration-guide.md)** — ponto de entrada para integradores
- [Guia do engine](docs/pricing-engine.md) — pipeline de processamento e semântica de operações
- [Guia de importação](docs/import-guidelines.md) — como converter planilhas para PACP
- [Princípios de design](docs/design-principles.md) — decisões arquiteturais do padrão
- [Governança](docs/governance.md)
- [Site](https://pacp-org.github.io/pacp/)

## Links

- **npm:** [@pacp/spec](https://www.npmjs.com/package/@pacp/spec)
- **Site:** [pacp-org.github.io/pacp](https://pacp-org.github.io/pacp/)
- **Spec:** [spec/latest/pacp.md](spec/latest/pacp.md)
- **JSON Schema:** [spec/latest/pacp.schema.json](spec/latest/pacp.schema.json)

## Licença

[MIT](LICENSE)
