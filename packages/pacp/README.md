# @pacp/spec

Schema, profiles e validador do [PACP](https://pacp-org.github.io/pacp/) (Padrão Aberto de Catálogo e Precificação) como pacote npm.

## Instalação

```bash
npm install @pacp/spec
```

Para usar a função `validate()`, instale também as peer dependencies:

```bash
npm install @pacp/spec ajv ajv-formats
```

## Uso

### Schema e profiles (sem dependências extras)

```typescript
import { schema, profiles, profileIds } from '@pacp/spec';

// JSON Schema completo do PACP
console.log(schema.$id);

// Extension profiles disponíveis
console.log(profileIds); // ["moveis", "iluminacao", "pisos-revestimentos", "fiscal-br"]

// Acessar profile específico
console.log(profiles.moveis.title); // "PACP Profile: Moveis e Alta Decoracao"
```

### Validação de documentos

```typescript
import { validate } from '@pacp/spec';

const catalogDocument = {
  document_type: 'CATALOG',
  catalog: { id: 'meu_catalogo' },
  rulesets: [
    {
      id: 'rs_base',
      target: 'BASE',
      rules: [{ id: 'rule_setup', operation: 'ADD', value: 10 }],
    },
  ],
};

const result = validate(catalogDocument);

if (result.valid) {
  console.log('Documento PACP válido!');
} else {
  for (const issue of result.issues) {
    console.error(`[${issue.code}] ${issue.path}: ${issue.message}`);
  }
}
```

### Tipos TypeScript

Todos os tipos do PACP estão disponíveis:

```typescript
import type {
  CatalogDocument,
  ProductDocument,
  PacpDocument,
  Product,
  Ruleset,
  Rule,
  Table,
  Constraint,
  Dependency,
  Context,
  Option,
  Image,
  Measure,
  PhysicalDimensions,
  LookupAxis,
  ValidationResult,
} from '@pacp/spec';

const product: Product = {
  id: 'prod_mesa',
  name: 'Mesa de Jantar',
  sku: 'MES-001',
  manufacturer: 'Moveis Artisan',
  brand: 'Artisan Home',
  base_price: 2500,
  weight: { value: 45, unit: 'kg' },
  dimensions: { width: 160, height: 78, depth: 90, unit: 'cm' },
  options: [
    { id: 'opt_madeira', attribute_id: 'material', value: 'CARVALHO' },
  ],
  'x-finish': 'Natural envernizado',
  'x-warranty_months': 24,
};
```

### Acesso direto aos JSONs

Se preferir usar os JSONs diretamente (sem TypeScript):

```javascript
// Schema principal
const schema = require('@pacp/spec/schema.json');

// Profiles
const moveis = require('@pacp/spec/profiles/moveis.json');
const iluminacao = require('@pacp/spec/profiles/iluminacao.json');
const pisos = require('@pacp/spec/profiles/pisos-revestimentos.json');
const fiscal = require('@pacp/spec/profiles/fiscal-br.json');
```

## O que está incluído

| Export | Descrição |
|--------|-----------|
| `schema` | JSON Schema completo do PACP |
| `profiles` | Objeto com todos os profiles oficiais |
| `profileIds` | Array com IDs dos profiles: `moveis`, `iluminacao`, `pisos-revestimentos`, `fiscal-br` |
| `validate()` | Função de validação (requer `ajv` + `ajv-formats`) |
| Tipos TS | `CatalogDocument`, `ProductDocument`, `Product`, `Rule`, `Table`, etc. |

## Extension Profiles

| Profile | Vertical | Campos |
|---------|----------|--------|
| `moveis` | Móveis e Alta Decoração | `x-assembly_required`, `x-load_capacity`, `x-finish`, `x-warranty_months`, ... |
| `iluminacao` | Iluminação | `x-lumens`, `x-color_temp_k`, `x-voltage`, `x-dimmable`, ... |
| `pisos-revestimentos` | Pisos e Revestimentos | `x-pei`, `x-slip_resistance`, `x-rectified`, `x-usage`, ... |
| `fiscal-br` | Fiscal Brasil | `x-ncm`, `x-origem`, `x-cest`, `x-cfop`, ... |

## Links

- [Spec](https://github.com/pacp-org/pacp/blob/main/spec/latest/pacp.md)
- [Guia de integração](https://github.com/pacp-org/pacp/blob/main/docs/integration-guide.md)
- [Site](https://pacp-org.github.io/pacp/)
- [GitHub](https://github.com/pacp-org/pacp)

## Licença

MIT
