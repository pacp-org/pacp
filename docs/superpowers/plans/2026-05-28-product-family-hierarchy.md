# Product Family/Module Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a hierarchical `role` field (`STANDALONE`/`FAMILY`/`MODULE`) plus three companion fields to `$defs.product` so PACP can represent product families (e.g., sofá ADANA) and the modules that compose them, while keeping every existing catalog valid (additive minor bump 3.5.0 → 3.6.0).

**Architecture:** Hierarchy lives entirely inside the `product` definition. Schema enforces single-document rules via `if/then/allOf`; cross-document consistency (referenced FAMILY exists, member ↔ family agreement, depth=1) is enforced by a new `checkFamilyHierarchy` function in `tools/validator/src/cli.ts` that runs on products loaded from `product_refs`. TypeScript types are widened with optional fields; no breaking change. New JSON Schema rules are pure additions — `additionalProperties: false` on `$defs.product` already controls field set, so we just append four properties and one `allOf` block.

**Tech Stack:** JSON Schema draft 2020-12 (Ajv 8), TypeScript 5.9 with `tsup` build, Node.js 22 CLI validator, plain JSON fixtures (no jest/vitest in this repo — positive cases ride `npm run validate:examples`, negative cases ride per-fixture CLI runs that must exit with code 2 and the expected error code).

---

## File Structure

**Modify:**
- `spec/latest/pacp.schema.json` — append 4 properties + 1 `allOf` block to `$defs.product`
- `spec/latest/pacp.md` — add normative §4.9 "Hierarquia família/módulo (`role`)"
- `spec/latest/examples/README.md` — list new `family_hierarchy.json` example
- `spec/latest.json` — bump `spec_version` to 3.6.0, `published_at` to 2026-05-28
- `packages/pacp/src/types.ts` — add `ProductRole`, extend `Product` with 4 optional fields
- `packages/pacp/src/index.ts` — re-export `ProductRole`
- `packages/pacp/package.json` — bump `version` to 3.6.0
- `tools/validator/src/cli.ts` — add `checkFamilyHierarchy(loadedProducts, issues)` invoked from CATALOG path
- `tools/validator/test/README.md` — add rows for 6 new negative fixtures
- `CHANGELOG.md` — prepend a `[3.6.0] - 2026-05-28` entry
- `AGENTS.md` — add a short bullet about `role`/`family_product_id` in "Convenções não-óbvias"
- `docs/cookbook.md` — add receita "Família modular com módulos vendáveis"

**Create (positive example):**
- `spec/latest/examples/family_hierarchy.json` — CATALOG document referencing 1 FAMILY + 3 MODULEs
- `spec/latest/examples/products/prod_family_sofa_adana.json` — `role=FAMILY`
- `spec/latest/examples/products/prod_module_sofa_adana_1b_140.json` — `role=MODULE`
- `spec/latest/examples/products/prod_module_sofa_adana_2b_180.json` — `role=MODULE`
- `spec/latest/examples/products/prod_module_sofa_adana_3b_220.json` — `role=MODULE`

**Create (negative fixtures + their product aux files):**
- `tools/validator/test/fixtures/family_module_missing_family_id.json` (test 4 — SCHEMA)
- `tools/validator/test/fixtures/family_family_with_base_price.json` (test 5 — SCHEMA)
- `tools/validator/test/fixtures/family_standalone_with_family_id.json` (test 6 — SCHEMA)
- `tools/validator/test/fixtures/family_module_unknown_family.json` (test 7 — cross-doc CATALOG)
- `tools/validator/test/fixtures/family_member_ids_desynced.json` (test 8 — cross-doc CATALOG)
- `tools/validator/test/fixtures/family_module_pointing_to_standalone.json` (test 9 — cross-doc CATALOG)
- `tools/validator/test/fixtures/products/prod_family_fam.json` — FAMILY aux for tests 7-9
- `tools/validator/test/fixtures/products/prod_family_module_orphan.json` — MODULE pointing to missing family (test 7)
- `tools/validator/test/fixtures/products/prod_family_module_desynced.json` — MODULE whose `family_product_id` ≠ family's `member_product_ids` (test 8)
- `tools/validator/test/fixtures/products/prod_family_standalone_target.json` — STANDALONE that MODULE wrongly points to as family (test 9)
- `tools/validator/test/fixtures/products/prod_family_module_to_standalone.json` — MODULE pointing to STANDALONE (test 9)

---

## Task 1 — JSON Schema: add 4 properties + conditional `allOf` to `$defs.product`

**Files:**
- Modify: `spec/latest/pacp.schema.json` (`$defs.product.properties` and `$defs.product.allOf`)

- [ ] **Step 1.1 — Open the schema and find the existing `$defs.product` block**

  Open `spec/latest/pacp.schema.json`. The block begins at the line `"product": {` (currently around line 168) and ends at the matching closing brace (around line 255). The `properties` map ends with `"ruleset_ids"` followed by `}` and then `"allOf": [ ... ]`.

- [ ] **Step 1.2 — Append the 4 new properties**

  Inside `$defs.product.properties`, after the existing `"ruleset_ids"` property and before the closing `}` of `properties`, add a comma after the `ruleset_ids` property and append:

  ```json
  "role": {
    "type": "string",
    "enum": ["STANDALONE", "FAMILY", "MODULE"],
    "default": "STANDALONE",
    "description": "Papel do produto na hierarquia. STANDALONE (default, retrocompatível) é vendido independentemente. FAMILY é agrupador conceitual sem SKU/preço próprios (ex.: linha de sofá modular). MODULE é componente vendável vinculado a uma FAMILY. Ver spec §4.9."
  },
  "family_product_id": {
    "type": "string",
    "minLength": 1,
    "description": "Referência ao product.id de um produto com role=FAMILY no mesmo catalog document. Obrigatório quando role=MODULE; proibido para role=FAMILY ou STANDALONE."
  },
  "member_product_ids": {
    "type": "array",
    "items": { "type": "string", "minLength": 1 },
    "uniqueItems": true,
    "description": "Lista dos product.id dos módulos pertencentes a esta família. Emitido pelo materializer/exporter por conveniência do consumidor (evita scan); permitido apenas quando role=FAMILY."
  },
  "standalone_sellable": {
    "type": "boolean",
    "default": true,
    "description": "Indica se um MODULE pode ser vendido isoladamente (true) ou apenas como parte de composição da família (false). Permitido apenas quando role=MODULE."
  }
  ```

  Make sure trailing/leading commas are right: `"ruleset_ids": { ... },` then `"role": { ... }, ... "standalone_sellable": { ... }` (no trailing comma after `standalone_sellable`).

- [ ] **Step 1.3 — Extend the existing `$defs.product.allOf` array with 3 conditional blocks**

  The `$defs.product` block already has an `allOf` array (currently with a single element about `lot_policy.source`). Append three more elements after the existing one. The final `allOf` should look like:

  ```json
  "allOf": [
    {
      "if": {
        "properties": {
          "lot_policy": {
            "properties": { "source": { "const": "ATTRIBUTE" } },
            "required": ["source"]
          }
        },
        "required": ["lot_policy"]
      },
      "then": {
        "properties": {
          "lot_policy": { "required": ["attribute_id"] }
        }
      }
    },
    {
      "if": { "properties": { "role": { "const": "MODULE" } }, "required": ["role"] },
      "then": { "required": ["family_product_id"] }
    },
    {
      "if": { "properties": { "role": { "const": "FAMILY" } }, "required": ["role"] },
      "then": {
        "not": {
          "anyOf": [
            { "required": ["family_product_id"] },
            { "required": ["base_price"] }
          ]
        }
      }
    },
    {
      "if": {
        "anyOf": [
          { "properties": { "role": { "const": "STANDALONE" } }, "required": ["role"] },
          { "not": { "required": ["role"] } }
        ]
      },
      "then": {
        "not": {
          "anyOf": [
            { "required": ["family_product_id"] },
            { "required": ["member_product_ids"] },
            { "required": ["standalone_sellable"] }
          ]
        }
      }
    }
  ]
  ```

- [ ] **Step 1.4 — Verify the JSON parses**

  Run:

  ```bash
  cd /home/rafito/repos/hoop/pacp
  jq empty spec/latest/pacp.schema.json && echo OK
  ```

  Expected: `OK`. If `jq` reports a syntax error, fix the comma/brace mismatch — this is almost always a trailing comma after `standalone_sellable`.

- [ ] **Step 1.5 — Verify existing examples still validate after schema change**

  ```bash
  cd /home/rafito/repos/hoop/pacp/tools/validator
  npm run build
  npm run validate:examples
  ```

  Expected: every line ends `esta valido.` and process exits 0. (This proves backwards compat — old examples lack `role` so they are treated as `STANDALONE` implicitly and the new conditional rules do not fire.)

- [ ] **Step 1.6 — Commit**

  ```bash
  cd /home/rafito/repos/hoop/pacp
  git add spec/latest/pacp.schema.json
  git commit -m "feat(spec): add product hierarchy fields (role, family_product_id, member_product_ids, standalone_sellable)"
  ```

---

## Task 2 — TypeScript types: extend `Product` interface and re-export `ProductRole`

**Files:**
- Modify: `packages/pacp/src/types.ts` (insert new type before `Product` and 4 fields inside `Product`)
- Modify: `packages/pacp/src/index.ts` (add `ProductRole` to type re-exports)

- [ ] **Step 2.1 — Add `ProductRole` type alias**

  In `packages/pacp/src/types.ts`, directly above the `export interface Product {` declaration (currently around line 269), insert:

  ```typescript
  /**
   * Papel do produto na hierarquia família/módulo. Ver spec §4.9.
   *
   * - `STANDALONE` (default quando ausente): produto vendido independentemente — comportamento PACP histórico.
   * - `FAMILY`: agrupador conceitual sem SKU/preço próprios (ex.: linha de sofá modular ADANA).
   *   Não pode ter `base_price` nem `family_product_id`. Pode listar seus módulos em `member_product_ids`.
   * - `MODULE`: componente vendável vinculado a uma FAMILY via `family_product_id` (obrigatório).
   *   Tem `base_price` próprio. Pode marcar `standalone_sellable=false` se só for vendido como parte da composição.
   *
   * Profundidade da hierarquia é 1 (FAMILY não pode ter `family_product_id`).
   */
  export type ProductRole = "STANDALONE" | "FAMILY" | "MODULE";
  ```

- [ ] **Step 2.2 — Add 4 optional fields to `Product` interface**

  Still in `packages/pacp/src/types.ts`, inside `export interface Product { ... }`, add the four new properties immediately after the existing `ruleset_ids?: string[];` line and before the index signature `[key: \`x-${string}\`]: unknown;`:

  ```typescript
    /** Papel do produto na hierarquia. Default implícito quando ausente: `STANDALONE`. Ver spec §4.9. */
    role?: ProductRole;
    /** ID da família (produto com `role="FAMILY"`) à qual este módulo pertence. Obrigatório quando `role="MODULE"`; proibido em outros casos. */
    family_product_id?: string;
    /** IDs dos módulos pertencentes a esta família. Permitido apenas quando `role="FAMILY"`. */
    member_product_ids?: string[];
    /** `false` quando o módulo só pode ser vendido como parte da composição da família. Default `true`. Permitido apenas quando `role="MODULE"`. */
    standalone_sellable?: boolean;
  ```

- [ ] **Step 2.3 — Re-export `ProductRole` from `index.ts`**

  In `packages/pacp/src/index.ts`, add `ProductRole` to the `export type { ... }` block. The relevant chunk currently lists `Product, Predicate, Condition, ...`. Insert `ProductRole,` directly after `Product,`:

  ```typescript
    Product,
    ProductRole,
    Predicate,
  ```

- [ ] **Step 2.4 — Build the @pacp/spec package and verify .d.ts is generated**

  ```bash
  cd /home/rafito/repos/hoop/pacp/packages/pacp
  npm run build
  ```

  Expected: build succeeds, `dist/index.d.ts` contains `ProductRole` and the new optional Product fields. Verify with:

  ```bash
  grep -n 'ProductRole\|family_product_id\|member_product_ids\|standalone_sellable' /home/rafito/repos/hoop/pacp/packages/pacp/dist/index.d.ts | head -20
  ```

  Expected: matches showing both the alias and the 4 properties.

- [ ] **Step 2.5 — Commit**

  ```bash
  cd /home/rafito/repos/hoop/pacp
  git add packages/pacp/src/types.ts packages/pacp/src/index.ts
  git commit -m "feat(spec): add ProductRole and hierarchy fields to Product type"
  ```

---

## Task 3 — Validator CLI: cross-document `checkFamilyHierarchy`

**Files:**
- Modify: `tools/validator/src/cli.ts` (add function + wire it into the CATALOG branch)

- [ ] **Step 3.1 — Add the `checkFamilyHierarchy` function**

  In `tools/validator/src/cli.ts`, add this function immediately before the `function loadProductsFromRefs(` declaration (currently around line 659). It takes the array of products that have already been merged from `product_refs` and pushes issues for every cross-document violation:

  ```typescript
  function checkFamilyHierarchy(
    products: Record<string, unknown>[],
    issues: Issue[]
  ): void {
    type RoleInfo = { role: "STANDALONE" | "FAMILY" | "MODULE"; index: number };
    const byId = new Map<string, RoleInfo>();

    for (let i = 0; i < products.length; i += 1) {
      const p = products[i];
      const id = typeof p.id === "string" ? p.id : null;
      if (!id) continue;
      const rawRole = typeof p.role === "string" ? p.role : "STANDALONE";
      const role: RoleInfo["role"] =
        rawRole === "FAMILY" || rawRole === "MODULE" ? rawRole : "STANDALONE";
      byId.set(id, { role, index: i });
    }

    for (let i = 0; i < products.length; i += 1) {
      const p = products[i];
      const productId = typeof p.id === "string" ? p.id : `index_${i}`;
      const productPath = `/products[${i}]`;
      const rawRole = typeof p.role === "string" ? p.role : "STANDALONE";

      if (rawRole === "MODULE") {
        const familyId = p.family_product_id;
        if (typeof familyId !== "string" || familyId.trim().length === 0) {
          // Schema already catches this; no extra issue here.
          continue;
        }
        const target = byId.get(familyId);
        if (!target) {
          issues.push({
            code: "MISSING_FAMILY_PRODUCT",
            path: `${productPath}/family_product_id`,
            message: `Produto MODULE "${productId}" referencia family_product_id="${familyId}" que nao existe no catalogo. Fix: declare um produto com id="${familyId}" e role="FAMILY", ou ajuste family_product_id.`
          });
          continue;
        }
        if (target.role !== "FAMILY") {
          issues.push({
            code: "INVALID_FAMILY_TARGET",
            path: `${productPath}/family_product_id`,
            message: `Produto MODULE "${productId}" referencia family_product_id="${familyId}" que existe mas tem role="${target.role}". Fix: family_product_id DEVE apontar para um produto com role="FAMILY".`
          });
        }
      }

      if (rawRole === "FAMILY") {
        // Depth 1: a FAMILY cannot itself point to another family.
        if (typeof p.family_product_id === "string") {
          issues.push({
            code: "FAMILY_DEPTH_EXCEEDED",
            path: `${productPath}/family_product_id`,
            message: `Produto FAMILY "${productId}" declara family_product_id; hierarquia tem profundidade maxima 1 (FAMILY nao pode ter FAMILY pai). Fix: remova family_product_id.`
          });
        }

        const memberIds = Array.isArray(p.member_product_ids) ? p.member_product_ids : [];
        for (let j = 0; j < memberIds.length; j += 1) {
          const memberId = memberIds[j];
          if (typeof memberId !== "string" || memberId.trim().length === 0) continue;
          const target = byId.get(memberId);
          if (!target) {
            issues.push({
              code: "MISSING_MEMBER_PRODUCT",
              path: `${productPath}/member_product_ids[${j}]`,
              message: `FAMILY "${productId}" lista member_product_ids[${j}]="${memberId}" que nao existe no catalogo. Fix: declare o modulo ou remova-o de member_product_ids.`
            });
            continue;
          }
          if (target.role !== "MODULE") {
            issues.push({
              code: "INVALID_MEMBER_ROLE",
              path: `${productPath}/member_product_ids[${j}]`,
              message: `FAMILY "${productId}" lista member_product_ids[${j}]="${memberId}" que tem role="${target.role}". Fix: membros DEVEM ter role="MODULE".`
            });
            continue;
          }
          const memberProduct = products[target.index];
          if (memberProduct.family_product_id !== productId) {
            issues.push({
              code: "FAMILY_MEMBER_MISMATCH",
              path: `${productPath}/member_product_ids[${j}]`,
              message: `FAMILY "${productId}" lista "${memberId}" em member_product_ids, mas o MODULE "${memberId}" declara family_product_id="${String(memberProduct.family_product_id ?? "")}". Fix: sincronize os dois lados ou remova um deles.`
            });
          }
        }
      }
    }
  }
  ```

- [ ] **Step 3.2 — Wire `checkFamilyHierarchy` into the CATALOG branch**

  In `tools/validator/src/cli.ts`, inside `validatePacp`, the CATALOG branch (currently around line 820–835) iterates `loadedProducts` to call `checkSuppliedMaterials`. Add a single call to `checkFamilyHierarchy(loadedProducts, issues);` immediately AFTER the `checkSuppliedMaterials` loop ends and BEFORE the `else if (documentType === "PRODUCT")` branch. Concretely:

  ```typescript
        for (let i = 0; i < loadedProducts.length; i += 1) {
          const p = loadedProducts[i];
          const pid = typeof p.id === "string" ? p.id : `index_${i}`;
          checkSuppliedMaterials(p, `/products[${i}]`, pid, issues);
        }
        checkFamilyHierarchy(loadedProducts, issues);
      } else if (documentType === "PRODUCT") {
  ```

- [ ] **Step 3.3 — Build the validator**

  ```bash
  cd /home/rafito/repos/hoop/pacp/tools/validator
  npm run build
  ```

  Expected: exit 0, `dist/cli.js` updated.

- [ ] **Step 3.4 — Smoke-test against existing examples (no regression)**

  ```bash
  cd /home/rafito/repos/hoop/pacp/tools/validator
  npm run validate:examples
  ```

  Expected: every line `OK: ... esta valido.` and process exit 0. None of the existing examples use `role`, so `checkFamilyHierarchy` should add zero issues.

- [ ] **Step 3.5 — Commit**

  ```bash
  cd /home/rafito/repos/hoop/pacp
  git add tools/validator/src/cli.ts
  git commit -m "feat(validator): add checkFamilyHierarchy for family/module cross-doc validation"
  ```

---

## Task 4 — Positive example: ADANA sofá family with 3 modules

**Files:**
- Create: `spec/latest/examples/family_hierarchy.json`
- Create: `spec/latest/examples/products/prod_family_sofa_adana.json`
- Create: `spec/latest/examples/products/prod_module_sofa_adana_1b_140.json`
- Create: `spec/latest/examples/products/prod_module_sofa_adana_2b_180.json`
- Create: `spec/latest/examples/products/prod_module_sofa_adana_3b_220.json`
- Modify: `spec/latest/examples/README.md` (add row)

- [ ] **Step 4.1 — Write the CATALOG document**

  Create `spec/latest/examples/family_hierarchy.json` with:

  ```json
  {
    "document_type": "CATALOG",
    "catalog": {
      "id": "cat_family_hierarchy",
      "name": "Exemplo — Hierarquia Família/Módulo (Sofá ADANA)",
      "default_price_list_id": "pl_varejo",
      "price_lists": [{ "id": "pl_varejo", "currency": "BRL", "label": "Varejo" }]
    },
    "rulesets": [
      { "id": "rs_base", "target": "BASE", "rules": [] }
    ],
    "product_refs": [
      { "id": "prod_family_sofa_adana", "path": "products/prod_family_sofa_adana.json" },
      { "id": "prod_module_sofa_adana_1b_140", "path": "products/prod_module_sofa_adana_1b_140.json" },
      { "id": "prod_module_sofa_adana_2b_180", "path": "products/prod_module_sofa_adana_2b_180.json" },
      { "id": "prod_module_sofa_adana_3b_220", "path": "products/prod_module_sofa_adana_3b_220.json" }
    ]
  }
  ```

- [ ] **Step 4.2 — Write the FAMILY product document**

  Create `spec/latest/examples/products/prod_family_sofa_adana.json`:

  ```json
  {
    "document_type": "PRODUCT",
    "catalog_id": "cat_family_hierarchy",
    "product": {
      "id": "prod_family_sofa_adana",
      "name": "Sofá ADANA (Família)",
      "manufacturer": "Century",
      "brand": "Century Estofados",
      "description": "Linha modular ADANA. Selecione um módulo (configuração + dimensão + acabamento de base) para orçar.",
      "category": [["Móveis", "Estofados", "Sofá"]],
      "role": "FAMILY",
      "options": [],
      "member_product_ids": [
        "prod_module_sofa_adana_1b_140",
        "prod_module_sofa_adana_2b_180",
        "prod_module_sofa_adana_3b_220"
      ]
    }
  }
  ```

- [ ] **Step 4.3 — Write the three MODULE product documents**

  Create `spec/latest/examples/products/prod_module_sofa_adana_1b_140.json`:

  ```json
  {
    "document_type": "PRODUCT",
    "catalog_id": "cat_family_hierarchy",
    "product": {
      "id": "prod_module_sofa_adana_1b_140",
      "name": "Sofá ADANA 1B 1,40m Pintado",
      "sku": "ADANA-1B-140-PINT",
      "manufacturer": "Century",
      "brand": "Century Estofados",
      "category": [["Móveis", "Estofados", "Sofá"]],
      "role": "MODULE",
      "family_product_id": "prod_family_sofa_adana",
      "standalone_sellable": true,
      "base_price": 4200,
      "dimensions": { "width": 140, "height": 85, "depth": 95, "unit": "cm" },
      "options": []
    }
  }
  ```

  Create `spec/latest/examples/products/prod_module_sofa_adana_2b_180.json`:

  ```json
  {
    "document_type": "PRODUCT",
    "catalog_id": "cat_family_hierarchy",
    "product": {
      "id": "prod_module_sofa_adana_2b_180",
      "name": "Sofá ADANA 2B 1,80m Pintado",
      "sku": "ADANA-2B-180-PINT",
      "manufacturer": "Century",
      "brand": "Century Estofados",
      "category": [["Móveis", "Estofados", "Sofá"]],
      "role": "MODULE",
      "family_product_id": "prod_family_sofa_adana",
      "standalone_sellable": true,
      "base_price": 5400,
      "dimensions": { "width": 180, "height": 85, "depth": 95, "unit": "cm" },
      "options": []
    }
  }
  ```

  Create `spec/latest/examples/products/prod_module_sofa_adana_3b_220.json`:

  ```json
  {
    "document_type": "PRODUCT",
    "catalog_id": "cat_family_hierarchy",
    "product": {
      "id": "prod_module_sofa_adana_3b_220",
      "name": "Sofá ADANA 3B 2,20m Pintado",
      "sku": "ADANA-3B-220-PINT",
      "manufacturer": "Century",
      "brand": "Century Estofados",
      "category": [["Móveis", "Estofados", "Sofá"]],
      "role": "MODULE",
      "family_product_id": "prod_family_sofa_adana",
      "standalone_sellable": false,
      "base_price": 6800,
      "dimensions": { "width": 220, "height": 85, "depth": 95, "unit": "cm" },
      "options": []
    }
  }
  ```

  The `standalone_sellable: false` on the 3b module demonstrates that field (it can only be sold composed, e.g. with sectional pieces).

- [ ] **Step 4.4 — Add the example to `spec/latest/examples/README.md`**

  In `spec/latest/examples/README.md`, append a new row to the "Exemplos" table immediately after the `catalog_notes.json` row:

  ```markdown
  | `family_hierarchy.json` | Hierarquia família/módulo: 1 FAMILY (Sofá ADANA) + 3 MODULEs com `standalone_sellable` true/false |
  ```

  Also add `family_hierarchy.json` to the directory tree block alongside `catalog_notes.json`, and append the four new files to the `products/` list.

- [ ] **Step 4.5 — Run the positive example through the validator**

  ```bash
  cd /home/rafito/repos/hoop/pacp/tools/validator
  npm run validate:examples
  ```

  Expected: every example, including the new `family_hierarchy.json`, prints `OK: ... esta valido.` and process exits 0. This covers tests 1 (backwards compat — old examples unchanged), 2 (FAMILY válida), and 3 (MODULE válido).

- [ ] **Step 4.6 — Commit**

  ```bash
  cd /home/rafito/repos/hoop/pacp
  git add spec/latest/examples/family_hierarchy.json spec/latest/examples/products/prod_family_sofa_adana.json spec/latest/examples/products/prod_module_sofa_adana_1b_140.json spec/latest/examples/products/prod_module_sofa_adana_2b_180.json spec/latest/examples/products/prod_module_sofa_adana_3b_220.json spec/latest/examples/README.md
  git commit -m "docs(examples): add family_hierarchy.json with ADANA sofá family + 3 modules"
  ```

---

## Task 5 — Negative fixtures: schema-level rejections (tests 4, 5, 6)

**Files:**
- Create: `tools/validator/test/fixtures/family_module_missing_family_id.json` (test 4)
- Create: `tools/validator/test/fixtures/family_family_with_base_price.json` (test 5)
- Create: `tools/validator/test/fixtures/family_standalone_with_family_id.json` (test 6)

- [ ] **Step 5.1 — Test 4: MODULE without `family_product_id` (schema rejects)**

  Create `tools/validator/test/fixtures/family_module_missing_family_id.json`:

  ```json
  {
    "document_type": "PRODUCT",
    "catalog_id": "cat_test",
    "product": {
      "id": "prod_bad_module",
      "role": "MODULE",
      "base_price": 100,
      "options": []
    }
  }
  ```

- [ ] **Step 5.2 — Test 5: FAMILY with `base_price` (schema rejects)**

  Create `tools/validator/test/fixtures/family_family_with_base_price.json`:

  ```json
  {
    "document_type": "PRODUCT",
    "catalog_id": "cat_test",
    "product": {
      "id": "prod_bad_family",
      "role": "FAMILY",
      "base_price": 999,
      "options": []
    }
  }
  ```

- [ ] **Step 5.3 — Test 6: STANDALONE with `family_product_id` (schema rejects)**

  Create `tools/validator/test/fixtures/family_standalone_with_family_id.json`:

  ```json
  {
    "document_type": "PRODUCT",
    "catalog_id": "cat_test",
    "product": {
      "id": "prod_bad_standalone",
      "role": "STANDALONE",
      "family_product_id": "prod_some_family",
      "base_price": 100,
      "options": []
    }
  }
  ```

- [ ] **Step 5.4 — Run each fixture and confirm it fails with `[SCHEMA]`**

  ```bash
  cd /home/rafito/repos/hoop/pacp/tools/validator
  for f in test/fixtures/family_module_missing_family_id.json test/fixtures/family_family_with_base_price.json test/fixtures/family_standalone_with_family_id.json; do
    node dist/cli.js "$f"; echo "---> exit=$?"
  done
  ```

  Expected for each: stderr contains `[SCHEMA]` line(s) and `exit=2`. (Exact path/message wording depends on Ajv; what matters is `SCHEMA` code and non-zero exit.)

- [ ] **Step 5.5 — Commit**

  ```bash
  cd /home/rafito/repos/hoop/pacp
  git add tools/validator/test/fixtures/family_module_missing_family_id.json tools/validator/test/fixtures/family_family_with_base_price.json tools/validator/test/fixtures/family_standalone_with_family_id.json
  git commit -m "test(validator): add 3 schema-level negative fixtures for product hierarchy"
  ```

---

## Task 6 — Negative fixtures: cross-document rejections (tests 7, 8, 9)

**Files:**
- Create: `tools/validator/test/fixtures/family_module_unknown_family.json` (test 7 CATALOG)
- Create: `tools/validator/test/fixtures/products/prod_family_module_orphan.json` (aux for test 7)
- Create: `tools/validator/test/fixtures/family_member_ids_desynced.json` (test 8 CATALOG)
- Create: `tools/validator/test/fixtures/products/prod_family_fam.json` (aux for tests 8 & 9)
- Create: `tools/validator/test/fixtures/products/prod_family_module_desynced.json` (aux for test 8)
- Create: `tools/validator/test/fixtures/family_module_pointing_to_standalone.json` (test 9 CATALOG)
- Create: `tools/validator/test/fixtures/products/prod_family_standalone_target.json` (aux for test 9)
- Create: `tools/validator/test/fixtures/products/prod_family_module_to_standalone.json` (aux for test 9)

- [ ] **Step 6.1 — Test 7 CATALOG: MODULE pointing to a non-existent FAMILY**

  Create `tools/validator/test/fixtures/family_module_unknown_family.json`:

  ```json
  {
    "document_type": "CATALOG",
    "catalog": { "id": "cat_family_test" },
    "rulesets": [{ "id": "rs_base", "target": "BASE", "rules": [] }],
    "product_refs": [
      { "id": "prod_family_module_orphan", "path": "products/prod_family_module_orphan.json" }
    ]
  }
  ```

  Create `tools/validator/test/fixtures/products/prod_family_module_orphan.json`:

  ```json
  {
    "document_type": "PRODUCT",
    "catalog_id": "cat_family_test",
    "product": {
      "id": "prod_family_module_orphan",
      "role": "MODULE",
      "family_product_id": "prod_family_that_does_not_exist",
      "base_price": 100,
      "options": []
    }
  }
  ```

- [ ] **Step 6.2 — Test 8 CATALOG: FAMILY's `member_product_ids` desynced from MODULE's `family_product_id`**

  Create `tools/validator/test/fixtures/family_member_ids_desynced.json`:

  ```json
  {
    "document_type": "CATALOG",
    "catalog": { "id": "cat_family_test" },
    "rulesets": [{ "id": "rs_base", "target": "BASE", "rules": [] }],
    "product_refs": [
      { "id": "prod_family_fam", "path": "products/prod_family_fam.json" },
      { "id": "prod_family_module_desynced", "path": "products/prod_family_module_desynced.json" }
    ]
  }
  ```

  Create `tools/validator/test/fixtures/products/prod_family_fam.json`:

  ```json
  {
    "document_type": "PRODUCT",
    "catalog_id": "cat_family_test",
    "product": {
      "id": "prod_family_fam",
      "role": "FAMILY",
      "options": [],
      "member_product_ids": ["prod_family_module_desynced"]
    }
  }
  ```

  Create `tools/validator/test/fixtures/products/prod_family_module_desynced.json`:

  ```json
  {
    "document_type": "PRODUCT",
    "catalog_id": "cat_family_test",
    "product": {
      "id": "prod_family_module_desynced",
      "role": "MODULE",
      "family_product_id": "prod_some_other_family",
      "base_price": 100,
      "options": []
    }
  }
  ```

  (Note: `prod_family_module_desynced` declares `family_product_id="prod_some_other_family"` which does not exist. This actually triggers TWO issues — `MISSING_FAMILY_PRODUCT` from the orphan reference AND `FAMILY_MEMBER_MISMATCH` because the family lists it as member but the module points elsewhere. That's expected and proves the validator catches both sides of the desync.)

- [ ] **Step 6.3 — Test 9 CATALOG: MODULE points to a STANDALONE (wrong role on target)**

  Create `tools/validator/test/fixtures/family_module_pointing_to_standalone.json`:

  ```json
  {
    "document_type": "CATALOG",
    "catalog": { "id": "cat_family_test" },
    "rulesets": [{ "id": "rs_base", "target": "BASE", "rules": [] }],
    "product_refs": [
      { "id": "prod_family_standalone_target", "path": "products/prod_family_standalone_target.json" },
      { "id": "prod_family_module_to_standalone", "path": "products/prod_family_module_to_standalone.json" }
    ]
  }
  ```

  Create `tools/validator/test/fixtures/products/prod_family_standalone_target.json`:

  ```json
  {
    "document_type": "PRODUCT",
    "catalog_id": "cat_family_test",
    "product": {
      "id": "prod_family_standalone_target",
      "base_price": 100,
      "options": []
    }
  }
  ```

  Create `tools/validator/test/fixtures/products/prod_family_module_to_standalone.json`:

  ```json
  {
    "document_type": "PRODUCT",
    "catalog_id": "cat_family_test",
    "product": {
      "id": "prod_family_module_to_standalone",
      "role": "MODULE",
      "family_product_id": "prod_family_standalone_target",
      "base_price": 200,
      "options": []
    }
  }
  ```

- [ ] **Step 6.4 — Run each cross-doc fixture and verify expected codes**

  ```bash
  cd /home/rafito/repos/hoop/pacp/tools/validator
  node dist/cli.js test/fixtures/family_module_unknown_family.json; echo exit=$?
  node dist/cli.js test/fixtures/family_member_ids_desynced.json; echo exit=$?
  node dist/cli.js test/fixtures/family_module_pointing_to_standalone.json; echo exit=$?
  ```

  Expected:
  - `family_module_unknown_family.json` → `[MISSING_FAMILY_PRODUCT]` line, `exit=2`.
  - `family_member_ids_desynced.json` → at least one of `[MISSING_FAMILY_PRODUCT]` and `[FAMILY_MEMBER_MISMATCH]` lines, `exit=2`.
  - `family_module_pointing_to_standalone.json` → `[INVALID_FAMILY_TARGET]` line, `exit=2`.

- [ ] **Step 6.5 — Commit**

  ```bash
  cd /home/rafito/repos/hoop/pacp
  git add tools/validator/test/fixtures/family_module_unknown_family.json tools/validator/test/fixtures/family_member_ids_desynced.json tools/validator/test/fixtures/family_module_pointing_to_standalone.json tools/validator/test/fixtures/products/prod_family_module_orphan.json tools/validator/test/fixtures/products/prod_family_fam.json tools/validator/test/fixtures/products/prod_family_module_desynced.json tools/validator/test/fixtures/products/prod_family_standalone_target.json tools/validator/test/fixtures/products/prod_family_module_to_standalone.json
  git commit -m "test(validator): add 3 cross-doc negative fixtures for product hierarchy"
  ```

---

## Task 7 — Update validator test README

**Files:**
- Modify: `tools/validator/test/README.md`

- [ ] **Step 7.1 — Append a new section "Fixtures: hierarquia família/módulo"**

  In `tools/validator/test/README.md`, after the existing "Fixtures: rules" section and before "Verificação rápida", insert:

  ```markdown
  ## Fixtures: hierarquia família/módulo

  | Arquivo | Código esperado | Notas |
  |---|---|---|
  | `family_module_missing_family_id.json` | `[SCHEMA]` | PRODUCT `role=MODULE` sem `family_product_id`; rejeitado pelo schema (allOf if/then). |
  | `family_family_with_base_price.json` | `[SCHEMA]` | PRODUCT `role=FAMILY` com `base_price`; rejeitado pelo schema. |
  | `family_standalone_with_family_id.json` | `[SCHEMA]` | PRODUCT `role=STANDALONE` com `family_product_id`; rejeitado pelo schema. |
  | `family_module_unknown_family.json` | `MISSING_FAMILY_PRODUCT` | CATALOG: MODULE aponta para `family_product_id` que não existe no catálogo. |
  | `family_member_ids_desynced.json` | `MISSING_FAMILY_PRODUCT` + `FAMILY_MEMBER_MISMATCH` | CATALOG: FAMILY lista MODULE em `member_product_ids`, mas MODULE.`family_product_id` aponta para outra família (inexistente). |
  | `family_module_pointing_to_standalone.json` | `INVALID_FAMILY_TARGET` | CATALOG: MODULE.`family_product_id` aponta para um produto que existe mas tem `role=STANDALONE`. |
  ```

- [ ] **Step 7.2 — Add the new aux products to the "Produto auxiliares em `products/`" table**

  Append rows to the existing table at the bottom of the same file:

  ```markdown
  | `prod_family_module_orphan.json` | `family_module_unknown_family.json` |
  | `prod_family_fam.json` | `family_member_ids_desynced.json` |
  | `prod_family_module_desynced.json` | `family_member_ids_desynced.json` |
  | `prod_family_standalone_target.json` | `family_module_pointing_to_standalone.json` |
  | `prod_family_module_to_standalone.json` | `family_module_pointing_to_standalone.json` |
  ```

- [ ] **Step 7.3 — Sanity check the "Verificação rápida" loop still works**

  ```bash
  cd /home/rafito/repos/hoop/pacp/tools/validator
  for f in test/fixtures/*.json; do
    node dist/cli.js "$f" >/dev/null 2>&1
    echo "$(basename $f) exit=$?"
  done
  ```

  Expected: every line ends `exit=2` (no fixture should validate as OK). Specifically all 6 new family fixtures must appear with `exit=2`.

- [ ] **Step 7.4 — Commit**

  ```bash
  cd /home/rafito/repos/hoop/pacp
  git add tools/validator/test/README.md
  git commit -m "docs(validator): document family/module negative fixtures"
  ```

---

## Task 8 — Normative spec section §4.9

**Files:**
- Modify: `spec/latest/pacp.md`

- [ ] **Step 8.1 — Read the existing §4 block to find the right insertion point**

  Open `spec/latest/pacp.md`. Section `### 4.8 Materiais fornecidos (\`supplied_materials\`)` ends near line 187. Section `### 4.4 Valores de atributos por produto (\`attribute_values\`)` is intentionally out of order at line 188 (pre-existing oddity — leave it alone). Insert the new §4.9 immediately AFTER §4.8 and BEFORE §4.4 (matching the existing flow), or — if cleaner — append at the end of §4 just before `## 5. Precificação`. Pick whichever placement matches the surrounding visual layout best; the canonical anchor name will be `### 4.9 Hierarquia família/módulo (\`role\`)`.

- [ ] **Step 8.2 — Insert the §4.9 content**

  Add:

  ```markdown
  ### 4.9 Hierarquia família/módulo (`role`)

  Produtos PACP suportam uma hierarquia de profundidade 1 entre um produto agrupador (família) e seus produtos vendáveis (módulos). É opcional e aditiva: catálogos pré-3.6 continuam válidos sem qualquer mudança.

  Campo controlador: `product.role` ∈ `{"STANDALONE", "FAMILY", "MODULE"}`. Ausência ≡ `"STANDALONE"`.

  - **`STANDALONE`** (default implícito): produto vendido independentemente. Comportamento PACP histórico — sem nenhum dos campos novos de hierarquia.
  - **`FAMILY`**: agrupador conceitual. NÃO tem `base_price` nem `family_product_id`. PODE listar seus módulos em `member_product_ids` (recomendado em emissão por materializer/exporter para evitar scan do consumidor).
  - **`MODULE`**: componente vendável vinculado a uma FAMILY via `family_product_id` (**obrigatório**). Tem `base_price` próprio. Pode marcar `standalone_sellable: false` para indicar que só faz sentido vendido como parte da composição da família. Default `standalone_sellable: true`.

  **Regras estruturais (schema):**

  | role | `family_product_id` | `member_product_ids` | `standalone_sellable` | `base_price` |
  |---|---|---|---|---|
  | `STANDALONE` (ou ausente) | proibido | proibido | proibido | livre |
  | `FAMILY` | proibido | permitido | proibido | proibido |
  | `MODULE` | **obrigatório** | proibido | permitido | livre |

  **Regras cross-document (validador):**

  1. `MODULE.family_product_id` DEVE existir como produto com `role="FAMILY"` no mesmo `CatalogDocument`.
  2. Cada ID em `FAMILY.member_product_ids` DEVE existir como produto com `role="MODULE"` cujo `family_product_id` aponte de volta para a mesma família. Códigos do validador: `MISSING_FAMILY_PRODUCT`, `INVALID_FAMILY_TARGET`, `MISSING_MEMBER_PRODUCT`, `INVALID_MEMBER_ROLE`, `FAMILY_MEMBER_MISMATCH`.
  3. Hierarquia tem profundidade máxima 1: FAMILY NÃO PODE ter `family_product_id`. Código: `FAMILY_DEPTH_EXCEEDED`.

  **Convenção de uso (não-normativa):**

  Use a hierarquia quando o cliente compõe a unidade vendida a partir de módulos (caso típico: linhas modulares de sofá, kits de cozinha, racks). Não use para variantes de configuração — para isso, continue usando `attributes` + `options` no mesmo produto.

  Exemplo: `spec/latest/examples/family_hierarchy.json` demonstra uma FAMILY ADANA com 3 MODULEs (1B/1,40m, 2B/1,80m, 3B/2,20m — o último com `standalone_sellable: false`).
  ```

- [ ] **Step 8.3 — Sanity-check the file still renders**

  ```bash
  head -5 /home/rafito/repos/hoop/pacp/spec/latest/pacp.md
  grep -n '^### 4\.' /home/rafito/repos/hoop/pacp/spec/latest/pacp.md
  ```

  Expected: file is still readable; grep shows `4.9 Hierarquia família/módulo` among the §4.x list.

- [ ] **Step 8.4 — Commit**

  ```bash
  cd /home/rafito/repos/hoop/pacp
  git add spec/latest/pacp.md
  git commit -m "docs(spec): add normative §4.9 product family/module hierarchy"
  ```

---

## Task 9 — Cookbook recipe + AGENTS.md hint

**Files:**
- Modify: `docs/cookbook.md`
- Modify: `AGENTS.md`

- [ ] **Step 9.1 — Add cookbook recipe**

  In `docs/cookbook.md`, append a new recipe at the end of the recipes list (or in a logical position — read the file first to choose the spot). The recipe content:

  ```markdown
  ## Família modular com módulos vendáveis

  Use quando: o cliente compõe a unidade vendida a partir de módulos pré-definidos (linhas modulares de sofá, cozinhas montáveis, racks). Não use para variantes de configuração — `attributes`+`options` já resolvem isso.

  **Família (sem SKU, sem preço):**

  ```json
  {
    "id": "prod_family_sofa_adana",
    "name": "Sofá ADANA (Família)",
    "role": "FAMILY",
    "options": [],
    "member_product_ids": [
      "prod_module_sofa_adana_1b_140",
      "prod_module_sofa_adana_2b_180"
    ]
  }
  ```

  **Módulo (vendável, vinculado à família):**

  ```json
  {
    "id": "prod_module_sofa_adana_1b_140",
    "name": "Sofá ADANA 1B 1,40m Pintado",
    "sku": "ADANA-1B-140-PINT",
    "role": "MODULE",
    "family_product_id": "prod_family_sofa_adana",
    "standalone_sellable": true,
    "base_price": 4200,
    "options": []
  }
  ```

  Profundidade máxima é 1 (FAMILY não pode ter `family_product_id`). Use `standalone_sellable: false` em módulos que só fazem sentido vendidos compostos (ex.: meia-peça de uma seccional). Exemplo completo: `spec/latest/examples/family_hierarchy.json`. Spec normativa: §4.9.
  ```

- [ ] **Step 9.2 — Add an AGENTS.md hint**

  In `AGENTS.md`, inside the "Convenções não-óbvias" section, add as the new last bullet (after the existing bullet 7 about `unit` vs `sales_unit`):

  ```markdown
  8. **Hierarquia família/módulo é opt-in via `product.role`.** Sem `role` (ou `role="STANDALONE"`) o comportamento é o histórico. Quando usar: `FAMILY` é agrupador sem `base_price` e sem `family_product_id`; `MODULE` exige `family_product_id` apontando para a FAMILY no mesmo catálogo; profundidade é 1 (não dá pra aninhar famílias). Ver spec §4.9 e exemplo `family_hierarchy.json`.
  ```

  Also add a row in the "Erros do validador → fix" table (between the existing rows for `DUPLICATE_SUPPLIED_MATERIAL_ID` and `UNIT_SALES_UNIT_MISMATCH`):

  ```markdown
  | `MISSING_FAMILY_PRODUCT` | MODULE com `family_product_id` apontando para ID inexistente | Declare o produto FAMILY ou corrija a referência |
  | `INVALID_FAMILY_TARGET` | MODULE.`family_product_id` aponta para produto que existe mas com role ≠ FAMILY | O alvo precisa ter `role="FAMILY"` |
  | `FAMILY_MEMBER_MISMATCH` | FAMILY.`member_product_ids` lista um módulo que aponta para outra família | Sincronize os dois lados |
  ```

- [ ] **Step 9.3 — Commit**

  ```bash
  cd /home/rafito/repos/hoop/pacp
  git add docs/cookbook.md AGENTS.md
  git commit -m "docs: add family/module cookbook recipe and AGENTS.md hint"
  ```

---

## Task 10 — Version bump + CHANGELOG

**Files:**
- Modify: `packages/pacp/package.json` (version)
- Modify: `spec/latest.json` (spec_version + published_at)
- Modify: `CHANGELOG.md` (prepend entry)

- [ ] **Step 10.1 — Bump npm package version to 3.6.0**

  Edit `packages/pacp/package.json` and change the `"version"` field from `"3.5.0"` to `"3.6.0"`.

- [ ] **Step 10.2 — Bump spec/latest.json**

  Edit `spec/latest.json`:

  ```json
  {
    "channel": "latest",
    "spec_version": "3.6.0",
    "published_at": "2026-05-28",
    "cdn": "https://cdn.jsdelivr.net/npm/@pacp/spec@latest/dist/",
    "paths": {
      "spec": "spec/latest/pacp.md",
      "schema": "spec/latest/pacp.schema.json",
      "profiles": "spec/latest/profiles/",
      "examples": "spec/latest/examples/"
    }
  }
  ```

  (CI's publish workflow patches these from the git tag at release time, but bump them locally for repo consistency.)

- [ ] **Step 10.3 — Prepend CHANGELOG entry**

  In `CHANGELOG.md`, prepend (immediately after the top `# Changelog` block / Markdown blurb and BEFORE the existing `## [3.5.0]` entry) the following:

  ```markdown
  ## [3.6.0] - 2026-05-28

  **npm:** `@pacp/spec@3.6.0`
  **spec_version:** `3.6.0`

  ### Added

  - **`product.role`** (`enum`, opcional, default implícito `"STANDALONE"`) — papel do produto na hierarquia família/módulo. Valores: `STANDALONE` (default, retrocompatível), `FAMILY` (agrupador conceitual), `MODULE` (componente vendável vinculado a uma família).
  - **`product.family_product_id`** (`string`, opcional) — referência ao `product.id` de um produto `role="FAMILY"` no mesmo catálogo. **Obrigatório** quando `role="MODULE"`; **proibido** quando `role="FAMILY"` ou `role="STANDALONE"`.
  - **`product.member_product_ids`** (`string[]`, opcional, `uniqueItems`) — lista dos `product.id` dos módulos da família. Permitido apenas quando `role="FAMILY"`. Recomendado em emissão para evitar scan no consumidor.
  - **`product.standalone_sellable`** (`boolean`, opcional, default `true`) — `false` indica que o módulo só pode ser vendido como parte da composição da família. Permitido apenas quando `role="MODULE"`.
  - **Regras condicionais no JSON Schema** (`$defs.product.allOf`) — exigem `family_product_id` em MODULE; proíbem `base_price`/`family_product_id` em FAMILY; proíbem todos os 3 campos novos relacionados (`family_product_id`, `member_product_ids`, `standalone_sellable`) em STANDALONE.
  - **Validações cross-document no validador CLI** — `MISSING_FAMILY_PRODUCT`, `INVALID_FAMILY_TARGET`, `MISSING_MEMBER_PRODUCT`, `INVALID_MEMBER_ROLE`, `FAMILY_MEMBER_MISMATCH`, `FAMILY_DEPTH_EXCEEDED`. Garantem que `family_product_id` aponta para FAMILY existente, que `member_product_ids` aponta para MODULEs cujo `family_product_id` casa de volta, e que a hierarquia tem profundidade máxima 1.
  - **Spec normativa (§4.9)** — nova seção "Hierarquia família/módulo (`role`)" com tabela de regras estruturais e cross-document.
  - **Tipos TypeScript** — `ProductRole` exportado; `Product.role?`, `Product.family_product_id?`, `Product.member_product_ids?`, `Product.standalone_sellable?` adicionados.
  - **Exemplo oficial** — `spec/latest/examples/family_hierarchy.json` + 4 `products/prod_*` demonstrando Sofá ADANA (Century) com 3 módulos (último com `standalone_sellable: false`).
  - **Cookbook** — receita "Família modular com módulos vendáveis" em `docs/cookbook.md`.
  - **6 fixtures negativas** em `tools/validator/test/fixtures/` cobrindo as 6 regras estruturais + cross-document.

  ### Changed

  - Versão da spec: `3.5.0` → `3.6.0` (adição aditiva, sem quebra).

  ### Backwards Compatibility

  Catálogos PACP existentes (sem `role` em nenhum produto) continuam **100% válidos** sem alteração. O default implícito `STANDALONE` preserva o comportamento histórico 1:1.
  ```

- [ ] **Step 10.4 — Commit**

  ```bash
  cd /home/rafito/repos/hoop/pacp
  git add packages/pacp/package.json spec/latest.json CHANGELOG.md
  git commit -m "chore(release): bump @pacp/spec to 3.6.0"
  ```

---

## Task 11 — End-to-end verification

**Files:** (read-only verification — no edits expected)

- [ ] **Step 11.1 — Build both packages from scratch**

  ```bash
  cd /home/rafito/repos/hoop/pacp/packages/pacp && npm run build
  cd /home/rafito/repos/hoop/pacp/tools/validator && npm run build
  ```

  Expected: both exit 0; `packages/pacp/dist/` contains `index.{js,cjs,d.ts,d.cts}`, `schema.{js,cjs,d.ts,d.cts}`, `pacp.schema.json` (copied), `profiles/*.schema.json` (copied). The dist schema contains the 4 new properties (verify with `grep -n 'role\|family_product_id\|member_product_ids\|standalone_sellable' packages/pacp/dist/pacp.schema.json | head -20`).

- [ ] **Step 11.2 — Run the positive example suite**

  ```bash
  cd /home/rafito/repos/hoop/pacp/tools/validator
  npm run validate:examples
  ```

  Expected: every JSON in `spec/latest/examples/` (including the new `family_hierarchy.json` and the 4 new modules/family products) prints `OK: ... esta valido.`; final exit 0.

- [ ] **Step 11.3 — Run the full negative fixture loop**

  ```bash
  cd /home/rafito/repos/hoop/pacp/tools/validator
  for f in test/fixtures/*.json; do
    node dist/cli.js "$f" >/dev/null 2>&1
    echo "$(basename $f) exit=$?"
  done
  ```

  Expected: every fixture (existing + 6 new ones) prints `exit=2`. None should print `exit=0`.

- [ ] **Step 11.4 — Verify each new fixture emits the expected error code**

  ```bash
  cd /home/rafito/repos/hoop/pacp/tools/validator
  node dist/cli.js test/fixtures/family_module_missing_family_id.json 2>&1 | grep -E '\[SCHEMA\]'
  node dist/cli.js test/fixtures/family_family_with_base_price.json 2>&1 | grep -E '\[SCHEMA\]'
  node dist/cli.js test/fixtures/family_standalone_with_family_id.json 2>&1 | grep -E '\[SCHEMA\]'
  node dist/cli.js test/fixtures/family_module_unknown_family.json 2>&1 | grep -E '\[MISSING_FAMILY_PRODUCT\]'
  node dist/cli.js test/fixtures/family_member_ids_desynced.json 2>&1 | grep -E '\[(MISSING_FAMILY_PRODUCT|FAMILY_MEMBER_MISMATCH)\]'
  node dist/cli.js test/fixtures/family_module_pointing_to_standalone.json 2>&1 | grep -E '\[INVALID_FAMILY_TARGET\]'
  ```

  Each `grep` must match at least one line. If any returns empty, the validator did not emit the expected code — investigate that specific fixture before moving on.

- [ ] **Step 11.5 — Programmatic `validate()` smoke test**

  Create a throwaway script to verify the in-process `validate()` picks up the new schema rules. Run from the repo root:

  ```bash
  cd /home/rafito/repos/hoop/pacp/packages/pacp
  node -e "
  const { validate } = require('./dist/index.cjs');
  // Negative: MODULE without family_product_id
  const r1 = validate({ document_type: 'PRODUCT', catalog_id: 'c', product: { id: 'p', role: 'MODULE', base_price: 100, options: [] } });
  if (r1.valid) { console.error('FAIL: expected invalid for MODULE missing family_product_id'); process.exit(1); }
  // Positive: STANDALONE backwards compat (no role field)
  const r2 = validate({ document_type: 'PRODUCT', catalog_id: 'c', product: { id: 'p', base_price: 100, options: [] } });
  if (!r2.valid) { console.error('FAIL: expected valid for STANDALONE doc', r2.issues); process.exit(1); }
  console.log('OK: programmatic validate() picks up new schema rules');
  "
  ```

  Expected: prints `OK: programmatic validate() picks up new schema rules` and exits 0.

- [ ] **Step 11.6 — Final acceptance checklist (manual)**

  Confirm each acceptance criterion from the original spec is met:

  - [x] Schema JSON atualizado com os 4 campos + bloco allOf condicional → Task 1.
  - [x] Validador cross-document checa as 4 regras de consistência → Task 3.
  - [x] Tipos TS atualizados → Task 2.
  - [x] 9 testes passando: 1-3 (positive) via `validate:examples` (Task 4 step 4.5), 4-6 (schema-level) via Task 5 step 5.4, 7-9 (cross-doc) via Task 6 step 6.4.
  - [x] Todos os testes pré-existentes continuam passando → confirmed in Step 1.5, Step 3.4, Step 11.2, Step 11.3.
  - [x] CHANGELOG e README atualizados → Task 10 + Task 4.4 (examples/README) + Task 7 (validator test README) + Task 8 (spec).
  - [x] Build do pacote gera dist/ corretamente, incluindo os tipos → Step 11.1.

- [ ] **Step 11.7 — No commit needed for verification-only task; close out.**

  All commits from prior tasks should leave the working tree clean. Confirm with:

  ```bash
  cd /home/rafito/repos/hoop/pacp
  git status
  ```

  Expected: `nothing to commit, working tree clean` (or only intentional staged changes if executor batched commits differently).
