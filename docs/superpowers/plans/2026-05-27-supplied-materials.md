# Supplied Materials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o campo `product.supplied_materials` no PACP 3.4.0 — declaração de insumos consumidos pelo produto com sourcing factory/customer, viabilizando casos como "tecido fornecido pelo cliente em sofá".

**Architecture:** PACP é uma spec (documento normativo + JSON Schema), não um engine. As mudanças vivem em:
- `spec/latest/pacp.md` — normativa textual
- `spec/latest/pacp.schema.json` — JSON Schema 2020-12 (validação estrutural)
- `tools/validator/src/cli.ts` — validações de referências cruzadas em Node/AJV
- `packages/pacp/src/types.ts` — tipos TypeScript exportados via npm
- `spec/latest/profiles/moveis.schema.json` — campos `x-fabric_requirements`
- `spec/latest/examples/` — exemplo oficial validado em CI

Não há "engine" a implementar. Testes acontecem via `npm run validate:examples` (exemplos positivos) e execução manual do CLI em fixtures negativos (exit code 2 esperado).

**Tech Stack:** TypeScript, JSON Schema 2020-12, AJV 8 (`ajv/dist/2020`), `ajv-formats`, Node 20+, tsup (build do pacote npm).

**Design doc:** `docs/superpowers/specs/2026-05-27-supplied-materials-design.md`.

---

## File Structure

**Files to create:**
- `spec/latest/examples/supplied_materials.json` — manifesto CATALOG do exemplo oficial
- `spec/latest/examples/products/prod_sofa_modular.json` — documento PRODUCT do exemplo
- `tools/validator/test/fixtures/supplied_invalid_no_source_when.json` — fixture negativa
- `tools/validator/test/fixtures/supplied_invalid_unknown_attribute.json` — fixture negativa
- `tools/validator/test/fixtures/supplied_invalid_uncovered_option.json` — fixture negativa
- `tools/validator/test/fixtures/supplied_invalid_duplicate_id.json` — fixture negativa
- `tools/validator/test/README.md` — explica como rodar fixtures negativas

**Files to modify:**
- `spec/latest/pacp.schema.json` — adicionar `$defs.supplied_material*` e propriedade `supplied_materials` em `product`
- `spec/latest/profiles/moveis.schema.json` — adicionar `x-fabric_requirements`
- `spec/latest/pacp.md` — nova seção 4.8, ajustar 5.2 (pipeline), atualizar 14 (glossário) e 15 (conformidade)
- `tools/validator/src/cli.ts` — nova função `checkSuppliedMaterials()` chamada em ambos `CATALOG` e `PRODUCT`
- `packages/pacp/src/types.ts` — interfaces `SuppliedMaterial`, `SuppliedMaterialQuantity`, `SuppliedMaterialCost`, `SourceWhen`, `SupplyOutput`; adicionar `supplied_materials?` em `Product`
- `packages/pacp/src/index.ts` — exportar novos tipos
- `packages/pacp/package.json` — bump versão para `3.4.0`
- `docs/integration-guide.md` — seção nova "Materiais fornecidos pelo cliente"
- `docs/import-guidelines.md` — mapeamento planilha → `supplied_materials`
- `docs/pricing-engine.md` — novo passo de pipeline
- `CHANGELOG.md` — entrada `## [3.4.0]`

---

## Task 1: JSON Schema — `$defs` auxiliares (quantity, cost, source_when)

**Files:**
- Modify: `spec/latest/pacp.schema.json`

- [ ] **Step 1: Localizar o ponto de inserção dos novos `$defs`**

Abrir `spec/latest/pacp.schema.json` e localizar o último `$defs` existente. Os novos `$defs` (`supplied_material`, `supplied_material_quantity`, `supplied_material_cost`, `source_when`) serão adicionados imediatamente antes do fechamento `} }` final do bloco `$defs`. Não substituir nada nesta task — só identificar a linha. Tipicamente fica no final do arquivo.

- [ ] **Step 2: Adicionar `$defs.supplied_material_quantity`**

No `$defs`, adicionar:

```json
"supplied_material_quantity": {
  "type": "object",
  "additionalProperties": false,
  "patternProperties": { "^x-": true },
  "properties": {
    "value": { "type": "number", "exclusiveMinimum": 0 },
    "table_id": { "type": "string", "minLength": 1 },
    "unit": { "type": "string", "minLength": 1 }
  },
  "required": ["unit"],
  "oneOf": [
    { "required": ["value"], "not": { "required": ["table_id"] } },
    { "required": ["table_id"], "not": { "required": ["value"] } }
  ],
  "description": "Quantidade de insumo necessária. Aceita value fixo (number > 0) OU table_id (lookup). Sempre exige unit."
}
```

- [ ] **Step 3: Adicionar `$defs.supplied_material_cost`**

```json
"supplied_material_cost": {
  "type": "object",
  "additionalProperties": false,
  "patternProperties": { "^x-": true },
  "properties": {
    "value": { "type": "number" },
    "table_id": { "type": "string", "minLength": 1 },
    "ruleset_id": { "type": "string", "minLength": 1 }
  },
  "oneOf": [
    { "required": ["value"], "not": { "anyOf": [{ "required": ["table_id"] }, { "required": ["ruleset_id"] }] } },
    { "required": ["table_id"], "not": { "anyOf": [{ "required": ["value"] }, { "required": ["ruleset_id"] }] } },
    { "required": ["ruleset_id"], "not": { "anyOf": [{ "required": ["value"] }, { "required": ["table_id"] }] } }
  ],
  "description": "Custo do material quando fonte=FACTORY. Exatamente um de value, table_id ou ruleset_id."
}
```

- [ ] **Step 4: Adicionar `$defs.source_when`**

```json
"source_when": {
  "type": "object",
  "additionalProperties": false,
  "required": ["factory", "customer"],
  "properties": {
    "factory": {
      "type": "array",
      "minItems": 1,
      "uniqueItems": true,
      "items": { "type": ["string", "number", "boolean"] }
    },
    "customer": {
      "type": "array",
      "minItems": 1,
      "uniqueItems": true,
      "items": { "type": ["string", "number", "boolean"] }
    }
  },
  "description": "Mapeia option.value -> modo de sourcing. Cada valor da option do attribute referenciado por sourcing_attribute_id deve aparecer em factory[] OU customer[]."
}
```

- [ ] **Step 5: Validar que o schema continua compilando**

Run: `cd /home/rafito/repos/hoop/pacp/tools/validator && npm run build && node dist/cli.js ../../spec/latest/examples/minimal.json`
Expected: `OK: ../../spec/latest/examples/minimal.json esta valido.`

- [ ] **Step 6: Commit**

```bash
cd /home/rafito/repos/hoop/pacp
git add spec/latest/pacp.schema.json
git commit -m "feat(schema): add \$defs for supplied_material quantity/cost/source_when

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: JSON Schema — `$defs.supplied_material`

**Files:**
- Modify: `spec/latest/pacp.schema.json`

- [ ] **Step 1: Adicionar `$defs.supplied_material`**

No mesmo bloco `$defs`, adicionar:

```json
"supplied_material": {
  "type": "object",
  "additionalProperties": false,
  "patternProperties": { "^x-": true },
  "required": ["id", "material", "quantity"],
  "properties": {
    "id": { "type": "string", "minLength": 1 },
    "material": { "type": "string", "minLength": 1, "pattern": "^[A-Z][A-Z0-9_]*$" },
    "quantity": { "$ref": "#/$defs/supplied_material_quantity" },
    "default_source": { "type": "string", "enum": ["FACTORY", "CUSTOMER"], "default": "FACTORY" },
    "sourcing_attribute_id": { "type": "string", "minLength": 1 },
    "source_when": { "$ref": "#/$defs/source_when" },
    "factory_cost": { "$ref": "#/$defs/supplied_material_cost" },
    "requirements": {
      "type": "object",
      "additionalProperties": true,
      "patternProperties": { "^x-": true },
      "description": "Bloco livre de requisitos do material. Profiles podem padronizar subgrupos como x-fabric_requirements."
    }
  },
  "allOf": [
    {
      "if": { "required": ["sourcing_attribute_id"] },
      "then": { "required": ["source_when"] }
    }
  ],
  "description": "Insumo consumido pelo produto, com regra de quem fornece (fábrica ou cliente). Ver seção 4.8 da spec."
}
```

- [ ] **Step 2: Validar que o schema continua compilando**

Run: `cd /home/rafito/repos/hoop/pacp/tools/validator && npm run build && node dist/cli.js ../../spec/latest/examples/minimal.json`
Expected: `OK: ../../spec/latest/examples/minimal.json esta valido.`

- [ ] **Step 3: Commit**

```bash
cd /home/rafito/repos/hoop/pacp
git add spec/latest/pacp.schema.json
git commit -m "feat(schema): add \$defs.supplied_material with sourcing_attribute_id implies source_when

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: JSON Schema — Adicionar `supplied_materials` em `product`

**Files:**
- Modify: `spec/latest/pacp.schema.json:215-222` (após bloco `options`, antes de `ruleset_ids`)

- [ ] **Step 1: Localizar bloco `options` em `$defs.product.properties`**

No `$defs.product.properties`, encontrar o bloco `options` (linha ~215-218) e o bloco `ruleset_ids` (linha ~219-222) que vem depois.

- [ ] **Step 2: Inserir propriedade `supplied_materials` entre `options` e `ruleset_ids`**

Adicionar ANTES de `ruleset_ids`:

```json
        "supplied_materials": {
          "type": "array",
          "items": { "$ref": "#/$defs/supplied_material" },
          "description": "Materiais consumidos pelo produto, com sourcing factory/customer. Ver seção 4.8."
        },
```

- [ ] **Step 3: Validar schema continua compilando + exemplo minimal passa**

Run: `cd /home/rafito/repos/hoop/pacp/tools/validator && npm run build && npm run validate:examples`
Expected: todos exemplos válidos (zero erros).

- [ ] **Step 4: Commit**

```bash
cd /home/rafito/repos/hoop/pacp
git add spec/latest/pacp.schema.json
git commit -m "feat(schema): add product.supplied_materials property

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Criar exemplo oficial — produto PRODUCT

**Files:**
- Create: `spec/latest/examples/products/prod_sofa_modular.json`

- [ ] **Step 1: Criar o arquivo do produto exemplo**

Conteúdo exato:

```json
{
  "document_type": "PRODUCT",
  "catalog_id": "cat_supplied_materials",
  "product": {
    "id": "prod_sofa_modular",
    "name": "Sofá Modular Retrátil",
    "sku": "SOF-MOD-RET",
    "manufacturer": "Estofados Atelier",
    "brand": "AtelierLine",
    "description": "Sofá modular retrátil com tecido configurável (fábrica ou cliente).",
    "category": [["Móveis", "Estofados", "Sofá"]],
    "base_price": 4200,
    "attributes": [
      { "id": "lugares" },
      { "id": "modo_tecido" },
      { "id": "tecido_tipo" }
    ],
    "options": [
      { "id": "opt_3lug", "attribute_id": "lugares", "value": "3_LUGARES" },
      { "id": "opt_4lug", "attribute_id": "lugares", "value": "4_LUGARES" },
      { "id": "opt_tec_fab", "attribute_id": "modo_tecido", "value": "FABRICA" },
      { "id": "opt_tec_eu",  "attribute_id": "modo_tecido", "value": "EU_FORNECO" },
      { "id": "opt_linho",   "attribute_id": "tecido_tipo", "value": "LINHO" },
      { "id": "opt_veludo",  "attribute_id": "tecido_tipo", "value": "VELUDO" }
    ],
    "supplied_materials": [
      {
        "id": "mat_tecido",
        "material": "TECIDO",
        "quantity": { "table_id": "tbl_tecido_qty_por_lugares", "unit": "m2" },
        "default_source": "FACTORY",
        "sourcing_attribute_id": "modo_tecido",
        "source_when": {
          "factory":  ["FABRICA"],
          "customer": ["EU_FORNECO"]
        },
        "factory_cost": { "table_id": "tbl_tecido_preco_por_tipo" },
        "requirements": {
          "x-fabric_requirements": {
            "min_weight_gsm": 380,
            "min_width_cm": 140,
            "allowed_compositions": ["LINHO", "ALGODAO", "VELUDO"]
          }
        }
      }
    ],
    "ruleset_ids": ["rs_base"]
  }
}
```

- [ ] **Step 2: Validar standalone**

Run: `cd /home/rafito/repos/hoop/pacp/tools/validator && node dist/cli.js ../../spec/latest/examples/products/prod_sofa_modular.json`
Expected: `OK: ../../spec/latest/examples/products/prod_sofa_modular.json esta valido.`

(Não commitar ainda — sem o manifesto CATALOG correspondente, `validate:examples` quebra na próxima task.)

---

## Task 5: Criar exemplo oficial — manifesto CATALOG

**Files:**
- Create: `spec/latest/examples/supplied_materials.json`

- [ ] **Step 1: Criar o manifesto CATALOG com tabelas**

Conteúdo exato:

```json
{
  "document_type": "CATALOG",
  "catalog": {
    "id": "cat_supplied_materials",
    "name": "Exemplo — Supplied Materials",
    "default_price_list_id": "pl_varejo",
    "price_lists": [
      { "id": "pl_varejo", "currency": "BRL", "label": "Varejo" }
    ]
  },
  "profiles": ["moveis"],
  "product_refs": [
    { "id": "prod_sofa_modular", "path": "products/prod_sofa_modular.json" }
  ],
  "tables": [
    {
      "id": "tbl_tecido_qty_por_lugares",
      "type": "LOOKUP",
      "dimensions": [
        { "key": "lugares", "source": "ATTRIBUTE", "attribute_id": "lugares" }
      ],
      "rows": [
        { "key": { "lugares": "3_LUGARES" }, "value": 15.0 },
        { "key": { "lugares": "4_LUGARES" }, "value": 22.0 }
      ]
    },
    {
      "id": "tbl_tecido_preco_por_tipo",
      "type": "LOOKUP",
      "dimensions": [
        { "key": "tecido_tipo", "source": "ATTRIBUTE", "attribute_id": "tecido_tipo" }
      ],
      "rows": [
        { "key": { "tecido_tipo": "LINHO" }, "value": 800 },
        { "key": { "tecido_tipo": "VELUDO" }, "value": 1200 }
      ]
    }
  ],
  "rulesets": [
    {
      "id": "rs_base",
      "target": "BASE",
      "rules": [
        {
          "id": "rule_tecido_factory",
          "operation": "LOOKUP",
          "table_id": "tbl_tecido_preco_por_tipo",
          "when": {
            "all": [
              { "fact": "supplied_materials.mat_tecido.source", "operator": "EQ", "value": "FACTORY" }
            ]
          }
        }
      ]
    }
  ]
}
```

- [ ] **Step 2: Rodar validate:examples**

Run: `cd /home/rafito/repos/hoop/pacp/tools/validator && npm run validate:examples`
Expected: exit code 0 — todos os exemplos (incluindo o novo) validos.

- [ ] **Step 3: Commit (exemplo positivo)**

```bash
cd /home/rafito/repos/hoop/pacp
git add spec/latest/examples/supplied_materials.json spec/latest/examples/products/prod_sofa_modular.json
git commit -m "feat(examples): add supplied_materials example (sofa modular)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Validador CLI — função `checkSuppliedMaterials` (estrutura base)

**Files:**
- Modify: `tools/validator/src/cli.ts`

- [ ] **Step 1: Adicionar função `checkSuppliedMaterials` no `cli.ts`**

Inserir esta função imediatamente antes de `function checkProductDocumentSemanticBasics` (linha ~426):

```typescript
function checkSuppliedMaterials(
  product: Record<string, unknown>,
  productPath: string,
  productId: string,
  issues: Issue[]
): void {
  const suppliedMaterials = getArray<Record<string, unknown>>(product.supplied_materials);
  if (suppliedMaterials.length === 0) {
    return;
  }

  const attributes = getArray<Record<string, unknown>>(product.attributes);
  const attributeIds = new Set<string>();
  for (const attr of attributes) {
    if (typeof attr.id === "string") {
      attributeIds.add(attr.id);
    }
  }

  const optionsByAttribute = new Map<string, Set<string | number | boolean>>();
  const options = getArray<Record<string, unknown>>(product.options);
  for (const opt of options) {
    const attrId = opt.attribute_id;
    const value = opt.value;
    if (typeof attrId !== "string") continue;
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") continue;
    if (!optionsByAttribute.has(attrId)) {
      optionsByAttribute.set(attrId, new Set());
    }
    optionsByAttribute.get(attrId)!.add(value);
  }

  const seenIds = new Set<string>();
  for (let i = 0; i < suppliedMaterials.length; i += 1) {
    const sm = suppliedMaterials[i];
    const smPath = `${productPath}/supplied_materials[${i}]`;
    const smId = sm.id;

    if (typeof smId !== "string" || smId.trim().length === 0) {
      continue;
    }

    if (seenIds.has(smId)) {
      issues.push({
        code: "DUPLICATE_SUPPLIED_MATERIAL_ID",
        path: `${smPath}/id`,
        message: `ID duplicado em supplied_materials do produto "${productId}": "${smId}"`
      });
      continue;
    }
    seenIds.add(smId);

    const sourcingAttrId = sm.sourcing_attribute_id;
    if (typeof sourcingAttrId === "string") {
      if (!attributeIds.has(sourcingAttrId)) {
        issues.push({
          code: "MISSING_SOURCING_ATTRIBUTE",
          path: `${smPath}/sourcing_attribute_id`,
          message: `Produto "${productId}" referencia sourcing_attribute_id="${sourcingAttrId}" inexistente em product.attributes`
        });
        continue;
      }

      const sourceWhen = sm.source_when;
      if (!isRecord(sourceWhen)) {
        issues.push({
          code: "INVALID_SOURCE_WHEN",
          path: `${smPath}/source_when`,
          message: `Produto "${productId}" declara sourcing_attribute_id mas omite source_when`
        });
        continue;
      }

      const factoryValues = new Set(getArray(sourceWhen.factory));
      const customerValues = new Set(getArray(sourceWhen.customer));
      const optionValues = optionsByAttribute.get(sourcingAttrId) ?? new Set();

      for (const v of optionValues) {
        if (!factoryValues.has(v) && !customerValues.has(v)) {
          issues.push({
            code: "UNCOVERED_OPTION_VALUE",
            path: `${smPath}/source_when`,
            message: `Produto "${productId}": option.value="${String(v)}" do attribute "${sourcingAttrId}" não está mapeado em source_when.factory nem .customer`
          });
        }
      }
    }
  }
}
```

- [ ] **Step 2: Chamar `checkSuppliedMaterials` em `checkProductDocumentSemanticBasics`**

Localizar o final da função `checkProductDocumentSemanticBasics` (linha ~476, antes do fechamento `}`). Adicionar antes do fechamento:

```typescript
  checkSuppliedMaterials(product, "/product", productId, issues);
```

- [ ] **Step 3: Chamar `checkSuppliedMaterials` para produtos carregados via product_refs (CATALOG)**

Localizar `loadProductsFromRefs` retornando `loadedProducts` e o ponto onde a `validatePacp` itera sobre `loadedProducts`. Na função `validatePacp`, dentro do branch `if (documentType === "CATALOG")`, após `checkProfileExtensions(...)`, adicionar:

```typescript
      for (let i = 0; i < loadedProducts.length; i += 1) {
        const p = loadedProducts[i];
        const pid = typeof p.id === "string" ? p.id : `index_${i}`;
        checkSuppliedMaterials(p, `/products[${i}]`, pid, issues);
      }
```

- [ ] **Step 4: Rebuild e validar exemplo positivo ainda passa**

Run: `cd /home/rafito/repos/hoop/pacp/tools/validator && npm run build && npm run validate:examples`
Expected: exit 0, todos exemplos válidos.

- [ ] **Step 5: Commit**

```bash
cd /home/rafito/repos/hoop/pacp
git add tools/validator/src/cli.ts
git commit -m "feat(validator): add checkSuppliedMaterials with sourcing/source_when refs

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Fixtures negativas — sourcing_attribute_id sem source_when

**Files:**
- Create: `tools/validator/test/fixtures/supplied_invalid_no_source_when.json`
- Create: `tools/validator/test/README.md`

- [ ] **Step 1: Criar pasta de fixtures e README**

```bash
mkdir -p /home/rafito/repos/hoop/pacp/tools/validator/test/fixtures
```

Criar `tools/validator/test/README.md` com:

```markdown
# Fixtures negativas do validador

Cada arquivo aqui é um PACP document **deliberadamente inválido** que o validador CLI DEVE rejeitar com um código de erro específico.

## Como rodar

```bash
cd tools/validator
npm run build
node dist/cli.js test/fixtures/<arquivo>.json
```

Cada execução deve sair com **exit code 2** (validação falhou) e imprimir o código de erro esperado no formato `[CODE] /path: mensagem`.

## Fixtures

| Arquivo | Código esperado |
|---|---|
| `supplied_invalid_no_source_when.json` | `INVALID_SOURCE_WHEN` (via schema, oneOf) ou `SCHEMA` (allOf if/then) |
| `supplied_invalid_unknown_attribute.json` | `MISSING_SOURCING_ATTRIBUTE` |
| `supplied_invalid_uncovered_option.json` | `UNCOVERED_OPTION_VALUE` |
| `supplied_invalid_duplicate_id.json` | `DUPLICATE_SUPPLIED_MATERIAL_ID` |

Fixtures NÃO são executadas por `npm run validate:examples` (pasta está fora de `spec/latest/examples`).
```

- [ ] **Step 2: Criar fixture `supplied_invalid_no_source_when.json`**

Conteúdo:

```json
{
  "document_type": "PRODUCT",
  "catalog_id": "cat_test",
  "product": {
    "id": "prod_test",
    "attributes": [{ "id": "modo_tecido" }],
    "options": [
      { "id": "opt_fab", "attribute_id": "modo_tecido", "value": "FABRICA" }
    ],
    "supplied_materials": [
      {
        "id": "mat_tecido",
        "material": "TECIDO",
        "quantity": { "value": 15, "unit": "m2" },
        "sourcing_attribute_id": "modo_tecido"
      }
    ]
  }
}
```

- [ ] **Step 3: Rodar a fixture, esperar falha**

Run: `cd /home/rafito/repos/hoop/pacp/tools/validator && node dist/cli.js test/fixtures/supplied_invalid_no_source_when.json; echo "exit=$?"`
Expected: exit=2 e mensagem contendo `SCHEMA` (porque o schema captura via `allOf if/then` da Task 2). Se for capturado pelo validador semântico depois (porque schema é silencioso), também aceita `INVALID_SOURCE_WHEN`.

- [ ] **Step 4: Commit**

```bash
cd /home/rafito/repos/hoop/pacp
git add tools/validator/test/README.md tools/validator/test/fixtures/supplied_invalid_no_source_when.json
git commit -m "test(validator): add negative fixture for sourcing_attribute_id without source_when

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Fixture negativa — attribute desconhecido em sourcing_attribute_id

**Files:**
- Create: `tools/validator/test/fixtures/supplied_invalid_unknown_attribute.json`

- [ ] **Step 1: Criar fixture**

```json
{
  "document_type": "PRODUCT",
  "catalog_id": "cat_test",
  "product": {
    "id": "prod_test",
    "attributes": [{ "id": "modo_tecido" }],
    "options": [
      { "id": "opt_fab", "attribute_id": "modo_tecido", "value": "FABRICA" },
      { "id": "opt_eu",  "attribute_id": "modo_tecido", "value": "EU_FORNECO" }
    ],
    "supplied_materials": [
      {
        "id": "mat_tecido",
        "material": "TECIDO",
        "quantity": { "value": 15, "unit": "m2" },
        "sourcing_attribute_id": "modo_inexistente",
        "source_when": { "factory": ["FABRICA"], "customer": ["EU_FORNECO"] }
      }
    ]
  }
}
```

- [ ] **Step 2: Rodar, esperar `MISSING_SOURCING_ATTRIBUTE`**

Run: `cd /home/rafito/repos/hoop/pacp/tools/validator && node dist/cli.js test/fixtures/supplied_invalid_unknown_attribute.json; echo "exit=$?"`
Expected: exit=2, mensagem com código `[MISSING_SOURCING_ATTRIBUTE]`.

- [ ] **Step 3: Commit**

```bash
cd /home/rafito/repos/hoop/pacp
git add tools/validator/test/fixtures/supplied_invalid_unknown_attribute.json
git commit -m "test(validator): add negative fixture for unknown sourcing attribute

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Fixture negativa — option.value não coberto em source_when

**Files:**
- Create: `tools/validator/test/fixtures/supplied_invalid_uncovered_option.json`

- [ ] **Step 1: Criar fixture**

```json
{
  "document_type": "PRODUCT",
  "catalog_id": "cat_test",
  "product": {
    "id": "prod_test",
    "attributes": [{ "id": "modo_tecido" }],
    "options": [
      { "id": "opt_fab", "attribute_id": "modo_tecido", "value": "FABRICA" },
      { "id": "opt_eu",  "attribute_id": "modo_tecido", "value": "EU_FORNECO" },
      { "id": "opt_misto", "attribute_id": "modo_tecido", "value": "MISTO" }
    ],
    "supplied_materials": [
      {
        "id": "mat_tecido",
        "material": "TECIDO",
        "quantity": { "value": 15, "unit": "m2" },
        "sourcing_attribute_id": "modo_tecido",
        "source_when": { "factory": ["FABRICA"], "customer": ["EU_FORNECO"] }
      }
    ]
  }
}
```

- [ ] **Step 2: Rodar, esperar `UNCOVERED_OPTION_VALUE`**

Run: `cd /home/rafito/repos/hoop/pacp/tools/validator && node dist/cli.js test/fixtures/supplied_invalid_uncovered_option.json; echo "exit=$?"`
Expected: exit=2, mensagem com `[UNCOVERED_OPTION_VALUE]` referente a `"MISTO"`.

- [ ] **Step 3: Commit**

```bash
cd /home/rafito/repos/hoop/pacp
git add tools/validator/test/fixtures/supplied_invalid_uncovered_option.json
git commit -m "test(validator): add negative fixture for uncovered option value in source_when

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Fixture negativa — supplied_material ID duplicado

**Files:**
- Create: `tools/validator/test/fixtures/supplied_invalid_duplicate_id.json`

- [ ] **Step 1: Criar fixture**

```json
{
  "document_type": "PRODUCT",
  "catalog_id": "cat_test",
  "product": {
    "id": "prod_test",
    "options": [],
    "supplied_materials": [
      { "id": "mat_x", "material": "TECIDO", "quantity": { "value": 15, "unit": "m2" } },
      { "id": "mat_x", "material": "COURO",  "quantity": { "value": 2,  "unit": "m2" } }
    ]
  }
}
```

- [ ] **Step 2: Rodar, esperar `DUPLICATE_SUPPLIED_MATERIAL_ID`**

Run: `cd /home/rafito/repos/hoop/pacp/tools/validator && node dist/cli.js test/fixtures/supplied_invalid_duplicate_id.json; echo "exit=$?"`
Expected: exit=2, mensagem com `[DUPLICATE_SUPPLIED_MATERIAL_ID]`.

- [ ] **Step 3: Commit**

```bash
cd /home/rafito/repos/hoop/pacp
git add tools/validator/test/fixtures/supplied_invalid_duplicate_id.json
git commit -m "test(validator): add negative fixture for duplicate supplied_material id

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Profile móveis — `x-fabric_requirements`

**Files:**
- Modify: `spec/latest/profiles/moveis.schema.json`

- [ ] **Step 1: Adicionar `x-fabric_requirements` ao profile**

No bloco `properties` do `moveis.schema.json`, antes de `additionalProperties: true` (final do arquivo, linha ~42), adicionar:

```json
    "x-fabric_requirements": {
      "type": "object",
      "additionalProperties": true,
      "properties": {
        "min_weight_gsm": { "type": "number", "exclusiveMinimum": 0, "description": "Gramatura mínima do tecido (g/m²)." },
        "max_weight_gsm": { "type": "number", "exclusiveMinimum": 0, "description": "Gramatura máxima do tecido (g/m²)." },
        "min_width_cm": { "type": "number", "exclusiveMinimum": 0, "description": "Largura mínima do rolo (cm)." },
        "allowed_compositions": {
          "type": "array",
          "minItems": 1,
          "uniqueItems": true,
          "items": { "type": "string", "pattern": "^[A-Z][A-Z0-9_]*$" },
          "description": "Composições aceitas (uppercase, ex: LINHO, ALGODAO, VELUDO)."
        },
        "abrasion_min_cycles_martindale": { "type": "integer", "minimum": 0, "description": "Resistência mínima à abrasão (ciclos Martindale)." },
        "flammability_standard": { "type": "string", "minLength": 1, "description": "Norma de inflamabilidade exigida (ex: NBR_15805)." }
      },
      "description": "Requisitos para tecido fornecido pelo cliente. Usado dentro de supplied_materials[].requirements."
    },
```

(Vírgula no final é importante porque vem `additionalProperties: true` logo depois — schema requer separador.)

- [ ] **Step 2: Validar exemplo passa (já declara profile móveis e usa x-fabric_requirements)**

Run: `cd /home/rafito/repos/hoop/pacp/tools/validator && npm run build && npm run validate:examples`
Expected: exit 0.

**Importante (limitação conhecida):** a função `checkProfileExtensions` em `cli.ts` valida `x-*` apenas no nível raiz do produto (ver `extractXFields`). Logo, `x-fabric_requirements` dentro de `supplied_materials[].requirements` NÃO é automaticamente validado contra o profile schema. Esta limitação é aceitável no MVP: o schema do profile documenta a forma esperada, e consumidores (loja/PDV) que precisam validar fazem a validação cliente-side usando o profile carregado via `@pacp/spec/profiles/moveis.json`. Esta limitação está documentada na Task 13 (seção 4.8 da spec) através do parágrafo "Profiles PODEM padronizar subgrupos" — não criar tasks adicionais para isso.

- [ ] **Step 3: Commit**

```bash
cd /home/rafito/repos/hoop/pacp
git add spec/latest/profiles/moveis.schema.json
git commit -m "feat(profile/moveis): add x-fabric_requirements definition

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Tipos TypeScript — `SuppliedMaterial` e siblings

**Files:**
- Modify: `packages/pacp/src/types.ts`
- Modify: `packages/pacp/src/index.ts`

- [ ] **Step 1: Adicionar interfaces em `types.ts`**

Após `interface SalesUnit` (linha ~57) e antes de `interface Product` (linha ~59), adicionar:

```typescript
export type SuppliedMaterialSource = "FACTORY" | "CUSTOMER";

export interface SuppliedMaterialQuantityValue {
  value: number;
  unit: string;
}

export interface SuppliedMaterialQuantityTable {
  table_id: string;
  unit: string;
}

export type SuppliedMaterialQuantity = SuppliedMaterialQuantityValue | SuppliedMaterialQuantityTable;

export interface SuppliedMaterialCostValue { value: number; }
export interface SuppliedMaterialCostTable { table_id: string; }
export interface SuppliedMaterialCostRuleset { ruleset_id: string; }
export type SuppliedMaterialCost =
  | SuppliedMaterialCostValue
  | SuppliedMaterialCostTable
  | SuppliedMaterialCostRuleset;

export interface SourceWhen {
  factory: ScalarValue[];
  customer: ScalarValue[];
}

export interface SuppliedMaterial {
  id: string;
  material: string;
  quantity: SuppliedMaterialQuantity;
  default_source?: SuppliedMaterialSource;
  sourcing_attribute_id?: string;
  source_when?: SourceWhen;
  factory_cost?: SuppliedMaterialCost;
  requirements?: Record<string, unknown>;
  [key: `x-${string}`]: unknown;
}

export interface SupplyOutputEntry {
  material_id: string;
  material: string;
  quantity: number;
  unit: string;
  requirements?: Record<string, unknown>;
}
```

- [ ] **Step 2: Adicionar `supplied_materials?` em `Product`**

Em `interface Product` (linha ~59-83), adicionar entre `options` e `ruleset_ids`:

```typescript
  supplied_materials?: SuppliedMaterial[];
```

- [ ] **Step 3: Exportar novos tipos em `index.ts`**

No `export type { ... } from "./types.js"` (linha 3-37), adicionar (mantendo ordem alfabética solta do bloco):

```typescript
  SourceWhen,
  SuppliedMaterial,
  SuppliedMaterialCost,
  SuppliedMaterialQuantity,
  SuppliedMaterialSource,
  SupplyOutputEntry,
```

- [ ] **Step 4: Build do pacote npm e checar tipos**

Run: `cd /home/rafito/repos/hoop/pacp/packages/pacp && npm run build`
Expected: build limpo, sem erros TS.

- [ ] **Step 5: Commit**

```bash
cd /home/rafito/repos/hoop/pacp
git add packages/pacp/src/types.ts packages/pacp/src/index.ts
git commit -m "feat(npm): add SuppliedMaterial types and Product.supplied_materials

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: Spec normativa — nova seção 4.8

**Files:**
- Modify: `spec/latest/pacp.md`

- [ ] **Step 1: Inserir seção 4.8 após 4.7 (Coleções)**

Localizar o final da seção 4.7 (linha ~158, antes de "### 4.4 Valores de atributos por produto"). Aviso: a numeração atual está fora de ordem (4.7 vem antes de 4.4). Esta task adiciona a nova seção `### 4.8 Materiais fornecidos (\`supplied_materials\`)` IMEDIATAMENTE após o último parágrafo de 4.7, antes do bloco de 4.4. Conteúdo a adicionar:

```markdown
### 4.8 Materiais fornecidos (`supplied_materials`)

- Produto PODE declarar `supplied_materials` (`array`) para listar insumos consumidos pelo produto e a regra de quem os fornece (fábrica ou cliente).
- Cada item DEVE conter `id` (único por produto), `material` (string em SNAKE_UPPER, ex.: `TECIDO`, `COURO`, `VIDRO`) e `quantity`.
- `quantity` DEVE conter `unit` e exatamente um de `value` (number > 0) OU `table_id` (referência a tabela LOOKUP). O lookup usa as dimensões PACP padrão (`ATTRIBUTE`, `CONTEXT`, `LITERAL`).
- `default_source` (`FACTORY` | `CUSTOMER`, default `FACTORY`) DEFINE quem fornece quando não há escolha do orçamentista.
- `sourcing_attribute_id`, quando presente, DEVE apontar para um `attribute` declarado no produto. A `option` selecionada para esse attribute determina a fonte no orçamento.
- `source_when` é OBRIGATÓRIO quando `sourcing_attribute_id` está presente. DEVE conter arrays `factory` e `customer` mapeando `option.value` para o modo. Cada `value` distinto de option do attribute referenciado DEVE aparecer em `factory[]` OU `customer[]` (validadores DEVEM reportar `UNCOVERED_OPTION_VALUE` caso contrário).
- `factory_cost`, quando presente, declara o custo do material quando a fonte resolvida = `FACTORY`. Aceita um de `value`, `table_id` ou `ruleset_id`. Ausente → o engine NÃO soma nada (custo já incluso em `base_price` por convenção).
- `requirements` é bloco livre (`x-*`); profiles PODEM padronizar subgrupos (ver `x-fabric_requirements` no profile `moveis`).

**Convenção normativa de `base_price`:** quando `supplied_materials` está presente, `base_price` DEVE representar o produto SEM os materiais declarados. Importadores que recebem planilha "tudo incluso" DEVEM desentrelaçar.

**Semântica do engine** (resolução, por material):
1. Fonte: se `sourcing_attribute_id` ausente → `default_source`. Se presente: ler `option` selecionada; primeiro match em `source_when.factory`/`.customer` define a fonte. Sem option selecionada → `default_source`. Option fora dos mapas → falha `UNRESOLVED_MATERIAL_SOURCE`.
2. Quantidade: `value` direto ou lookup em `table_id` (pode falhar com `LOOKUP_MISS`).
3. Preço: fonte=`FACTORY` + `factory_cost` presente → soma. Fonte=`CUSTOMER` → ignora `factory_cost`.
4. Output: para cada material com fonte=`CUSTOMER`, o resultado do orçamento DEVE incluir uma entrada em `supplied_quantities[]` com `material_id`, `material`, `quantity`, `unit` e (quando presente) `requirements`.

**Fatos disponíveis em rules e constraints:**

| Fato | Tipo | Operadores |
|---|---|---|
| `supplied_materials.<id>.source` | enum (`FACTORY`/`CUSTOMER`) | `EQ`, `NEQ`, `IN`, `NOT_IN` |
| `supplied_materials.<id>.quantity` | number | `EQ`, `NEQ`, `LT`, `LTE`, `GT`, `GTE`, `BETWEEN` |
| `supplied_materials.any.source` | enum | `EQ` (verdadeiro se PELO MENOS UM material tem essa fonte) |
| `supplied_materials.all.source` | enum | `EQ` (verdadeiro se TODOS têm essa fonte) |
```

- [ ] **Step 2: Validar markdown não quebra**

Run: `cd /home/rafito/repos/hoop/pacp && head -200 spec/latest/pacp.md | wc -l`
Expected: número > 0 (arquivo lê normalmente).

- [ ] **Step 3: Commit**

```bash
cd /home/rafito/repos/hoop/pacp
git add spec/latest/pacp.md
git commit -m "docs(spec): add section 4.8 supplied_materials

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: Spec normativa — atualizar seção 5.2 (pipeline)

**Files:**
- Modify: `spec/latest/pacp.md:180-196` (seção 5.2 ordem normativa)

- [ ] **Step 1: Reescrever a lista numerada da seção 5.2**

Localizar a lista atual:

```markdown
A execução DEVE seguir esta ordem:

1. Validação estrutural (schema + checks básicos).
2. Avaliação de `constraints` e `dependencies` (bloqueio de combinação).
3. Validação de dados de entrada de lote e quantidade solicitada (quando o produto exigir).
4. Normalização da quantidade mínima vendável (`sales_unit`) com arredondamento normativo.
5. Inicialização do preço base.
6. Aplicação de rulesets de `BASE`.
7. Formação de subtotal.
8. Aplicação de rulesets de `SUBTOTAL`.
9. Formação de total.
10. Aplicação de rulesets de `TOTAL`.
11. Pós-processamento de arredondamento/limites (`ROUND`, `CAP`, `FLOOR`), quando configurado.
```

Substituir por:

```markdown
A execução DEVE seguir esta ordem:

1. Validação estrutural (schema + checks básicos).
2. Avaliação de `constraints` e `dependencies` (bloqueio de combinação).
3. Validação de dados de entrada de lote e quantidade solicitada (quando o produto exigir).
4. Normalização da quantidade mínima vendável (`sales_unit`) com arredondamento normativo.
5. Resolução de `supplied_materials` (fonte + quantidade); rulesets de `BASE` em diante PODEM ler fatos `supplied_materials.<id>.source`, `.quantity` e agregados `any`/`all`.
6. Inicialização do preço base.
7. Aplicação de rulesets de `BASE`.
8. Formação de subtotal.
9. Aplicação de rulesets de `SUBTOTAL`.
10. Formação de total.
11. Aplicação de rulesets de `TOTAL`.
12. Pós-processamento de arredondamento/limites (`ROUND`, `CAP`, `FLOOR`), quando configurado.
```

- [ ] **Step 2: Commit**

```bash
cd /home/rafito/repos/hoop/pacp
git add spec/latest/pacp.md
git commit -m "docs(spec): add supplied_materials resolution step in pipeline (5.2)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: Spec normativa — atualizar glossário e conformidade

**Files:**
- Modify: `spec/latest/pacp.md` (seção 14 glossário, seção 15 conformidade)

- [ ] **Step 1: Adicionar entradas no glossário (seção 14)**

Localizar `## 14. Glossário` e adicionar antes de `## 15.`:

```markdown
- `supplied_material`: insumo declarado em `product.supplied_materials[]` (ex.: tecido, couro), com quantidade necessária e regra de quem fornece.
- `source` (em supplied_material): valor `FACTORY` (fábrica fornece) ou `CUSTOMER` (cliente fornece) resolvido pelo engine no orçamento.
- `supplied_quantities`: lista no output do orçamento com os materiais que a fonte resolveu como `CUSTOMER`, indicando quantidade que o cliente precisa fornecer.
- `x-fabric_requirements`: subgrupo de `requirements` padronizado pelo profile `moveis` para descrever requisitos de tecido (gramatura, largura, composição, abrasão, inflamabilidade).
```

- [ ] **Step 2: Adicionar item na lista de conformidade (seção 15)**

Localizar a lista `## 15. Conformidade PACP PACP` e adicionar antes de `- [ ] Permite e preserva extensões`:

```markdown
- [ ] Quando `supplied_materials` é declarado, cada item segue regras da seção 4.8: `quantity` válido, `sourcing_attribute_id` (se presente) aponta para attribute existente e implica `source_when` com cobertura de todos os `option.value` do attribute.
- [ ] Quando `supplied_materials` é declarado, `base_price` representa o produto sem os materiais listados (custo via `factory_cost` por material).
```

- [ ] **Step 3: Commit**

```bash
cd /home/rafito/repos/hoop/pacp
git add spec/latest/pacp.md
git commit -m "docs(spec): add supplied_materials entries in glossary and conformity

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 16: Docs — integration-guide.md

**Files:**
- Modify: `docs/integration-guide.md`

- [ ] **Step 1: Adicionar seção "Materiais fornecidos pelo cliente"**

Encontrar a última seção do `integration-guide.md` e adicionar antes do final:

```markdown
## Materiais fornecidos pelo cliente (`supplied_materials`)

Quando o produto declara `supplied_materials`, o consumidor (PDV, e-commerce, sistema da loja) deve tratar dois fluxos:

**1. Resolver a fonte no orçamento.** Para cada material com `sourcing_attribute_id`, a `option` selecionada decide entre `FACTORY` e `CUSTOMER` via `source_when`. Quando o atributo não está mapeado para opção alguma, usar `default_source`.

**2. Consumir o output `supplied_quantities[]`.** O engine de precificação deve expor, no resultado do orçamento, uma lista de materiais com fonte resolvida = `CUSTOMER`:

```json
{
  "total": 4200,
  "supplied_quantities": [
    {
      "material_id": "mat_tecido",
      "material": "TECIDO",
      "quantity": 15,
      "unit": "m2",
      "requirements": {
        "x-fabric_requirements": {
          "min_weight_gsm": 380,
          "min_width_cm": 140
        }
      }
    }
  ]
}
```

O PDV exibe ao vendedor: "Fornecer 15 m² de tecido, gramatura ≥ 380 g/m², largura do rolo ≥ 140 cm". Sistemas downstream (gestão da loja) usam o array para gerar pedidos de fornecimento à fábrica.

**Convenção de preço.** Quando `supplied_materials` está presente, `base_price` é o produto **sem** os materiais declarados. O custo do material aparece em `factory_cost` (somado quando fonte=FACTORY, ignorado quando CUSTOMER).

**Rules e constraints.** Condições podem referenciar:
- `supplied_materials.<id>.source` (== / != / IN / NOT_IN)
- `supplied_materials.<id>.quantity` (numeric ops)
- `supplied_materials.any.source == "CUSTOMER"` (ao menos um)
- `supplied_materials.all.source == "CUSTOMER"` (todos)
```

- [ ] **Step 2: Commit**

```bash
cd /home/rafito/repos/hoop/pacp
git add docs/integration-guide.md
git commit -m "docs(integration): add supplied_materials integration section

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 17: Docs — import-guidelines.md

**Files:**
- Modify: `docs/import-guidelines.md`

- [ ] **Step 1: Adicionar seção sobre mapeamento de planilha**

Adicionar ao final do `import-guidelines.md`:

```markdown
## Importando `supplied_materials` de planilha

Mapeamento típico de uma aba "Materiais" da planilha do fornecedor:

| Coluna planilha | Campo PACP | Notas |
|---|---|---|
| `produto_id` | (chave de agrupamento) | Materiais com mesmo `produto_id` viram itens em `supplied_materials[]` |
| `material_id` | `supplied_materials[].id` | Único por produto |
| `material_tipo` | `supplied_materials[].material` | Normalizar para SNAKE_UPPER (ex.: "tecido" → `TECIDO`) |
| `qty` | `supplied_materials[].quantity.value` | Se a planilha tiver coluna `qty_tabela` em vez de `qty`, mapear para `quantity.table_id` |
| `unidade` | `supplied_materials[].quantity.unit` | `m2`, `m`, `kg`, etc. |
| `padrao_fonte` | `supplied_materials[].default_source` | `FABRICA` → `FACTORY`, `CLIENTE` → `CUSTOMER` |
| `attribute_id_escolha` | `supplied_materials[].sourcing_attribute_id` | Quando presente, importador DEVE gerar `source_when` lendo as opções declaradas para esse attribute |
| `factory_cost` ou `cost_tabela` | `supplied_materials[].factory_cost.value` ou `.table_id` | Mutuamente exclusivos |
| Colunas `gramatura_min`, `largura_min`, etc. | `requirements.x-fabric_requirements.*` | Profile `moveis` |

**Desentrelaçar `base_price`.** Se a planilha traz `preço_total` (com tecido padrão incluso), o importador DEVE:
1. Subtrair o custo do tecido padrão do `preço_total`.
2. Gravar o resultado em `base_price`.
3. Gravar o custo do tecido padrão (e variações) em `supplied_materials[].factory_cost`.

Sem essa separação, o engine não consegue calcular corretamente o caso "tecido fornecido pelo cliente" (não sabe quanto subtrair).
```

- [ ] **Step 2: Commit**

```bash
cd /home/rafito/repos/hoop/pacp
git add docs/import-guidelines.md
git commit -m "docs(import): add supplied_materials spreadsheet mapping guide

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 18: Docs — pricing-engine.md

**Files:**
- Modify: `docs/pricing-engine.md`

- [ ] **Step 1: Adicionar passo de resolução na seção do pipeline**

Abrir `docs/pricing-engine.md`. Procurar pela seção que descreve a ordem de execução do pipeline (deve replicar ou referenciar a seção 5.2 do `pacp.md`). Inserir a sub-seção abaixo imediatamente APÓS a descrição do passo de `sales_unit` e ANTES da inicialização de `base_price`. Se o doc não tiver esse nível de detalhe, adicionar a sub-seção como nova `### Resolução de supplied_materials` ao final do arquivo:

```markdown
### Passo 5: Resolução de `supplied_materials`

Após normalização de `sales_unit` e antes de inicializar `base_price`, o engine resolve, para cada `supplied_material` declarado no produto:

1. **Fonte**: combina `sourcing_attribute_id` + option selecionada + `source_when` (ou usa `default_source`).
2. **Quantidade**: avalia `quantity.value` direto ou executa lookup em `quantity.table_id`.

A fonte resolvida fica disponível como fato (`supplied_materials.<id>.source`, `.quantity`, e agregados `any`/`all`) para os rulesets de `BASE`/`SUBTOTAL`/`TOTAL` que vêm a seguir.

**Custos:** quando a fonte resolvida = `FACTORY` e o material declara `factory_cost`, o engine soma o custo ao preço corrente nos rulesets de `BASE`. Quando = `CUSTOMER`, `factory_cost` é ignorado.

**Output adicional do orçamento:** para cada material com fonte = `CUSTOMER`, o resultado inclui uma entrada em `supplied_quantities[]` com `material_id`, `material`, `quantity`, `unit` e `requirements` (quando presente).
```

- [ ] **Step 2: Commit**

```bash
cd /home/rafito/repos/hoop/pacp
git add docs/pricing-engine.md
git commit -m "docs(engine): document supplied_materials resolution step

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 19: Bump versão e CHANGELOG

**Files:**
- Modify: `packages/pacp/package.json:3` (version)
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Bump versão no package.json**

Em `packages/pacp/package.json` linha 3, mudar:
```json
  "version": "3.3.0",
```
para:
```json
  "version": "3.4.0",
```

- [ ] **Step 2: Adicionar entrada no CHANGELOG.md**

No topo do `CHANGELOG.md` (após a linha `Todas as mudanças...`), adicionar:

```markdown
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
```

- [ ] **Step 3: Validar exemplos finais e build do pacote**

Run: `cd /home/rafito/repos/hoop/pacp/tools/validator && npm run validate:examples`
Expected: exit 0.

Run: `cd /home/rafito/repos/hoop/pacp/packages/pacp && npm run build`
Expected: build limpo.

- [ ] **Step 4: Commit final do bump**

```bash
cd /home/rafito/repos/hoop/pacp
git add packages/pacp/package.json CHANGELOG.md
git commit -m "chore: @pacp/spec 3.4.0 (supplied_materials)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 20: Verificação final integrada

**Files:** (somente leitura/execução)

- [ ] **Step 1: Rebuild completo do validator e do pacote**

```bash
cd /home/rafito/repos/hoop/pacp/tools/validator && npm run build
cd /home/rafito/repos/hoop/pacp/packages/pacp && npm run build
```
Expected: ambos terminam sem erro.

- [ ] **Step 2: Validar todos os exemplos oficiais**

```bash
cd /home/rafito/repos/hoop/pacp/tools/validator && npm run validate:examples
```
Expected: exit 0, mensagem `OK` para cada exemplo, incluindo `examples/supplied_materials.json` e `examples/products/prod_sofa_modular.json`.

- [ ] **Step 3: Rodar cada fixture negativa esperando exit 2 com código correto**

```bash
cd /home/rafito/repos/hoop/pacp/tools/validator
for f in test/fixtures/supplied_invalid_*.json; do
  echo "=== $f ==="
  node dist/cli.js "$f"
  echo "exit=$?"
done
```
Expected: cada arquivo sai com exit=2 e exibe pelo menos o código de erro esperado conforme tabela em `tools/validator/test/README.md`.

- [ ] **Step 4: Conferir log de commits**

```bash
cd /home/rafito/repos/hoop/pacp && git log --oneline -25
```
Expected: ver série de commits seguindo a ordem das tasks deste plano, terminando em `chore: @pacp/spec 3.4.0 (supplied_materials)`.

- [ ] **Step 5: Diff sumário comparando com main**

```bash
cd /home/rafito/repos/hoop/pacp && git diff --stat main HEAD
```
Expected: ver mudanças em ~13 arquivos (schema, profile, spec.md, cli.ts, types.ts, index.ts, package.json, CHANGELOG, 3 docs, 2 exemplos novos, 4 fixtures negativas + README).

Sem commit nesta task — é só verificação. Se algo falhar, voltar e corrigir a task culpada antes de declarar pronto.
