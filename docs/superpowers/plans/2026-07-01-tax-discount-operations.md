# TAX + DISCOUNT Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refinar o PR #9 renomeando a base de incidência do `TAX` e adicionar a operação `DISCOUNT`, ambas de 1ª classe na spec PACP, versão `3.7.0`.

**Architecture:** Spec-only. Operações são definidas no JSON Schema (`pacp.schema.json`), tipadas em `types.ts`, validadas semanticamente pelo CLI (`cli.ts`), documentadas em `pacp.md`/guias/site, e cobertas por exemplos positivos (auto-descobertos por `validate:examples`) e fixtures negativas (rodadas manualmente, exit code 2). Não há engine de runtime neste repo.

**Tech Stack:** TypeScript, JSON Schema (ajv), Node 22.

## Global Constraints

- `spec_version` e `@pacp/spec` version: `3.7.0` (já bumpado no branch; não regredir).
- Adição **puramente aditiva** — nenhuma operação/campo existente pode mudar de semântica; catálogos sem `TAX`/`DISCOUNT` continuam válidos.
- Base de incidência do `TAX`: valores `"CURRENT"` (default) e `"BASE_PRICE"`. **Nunca** usar `"COST"`/`"BASE"` (nomes antigos do PR, ambíguos).
- Campo percentual do `TAX`: `rate` (não `percent`).
- `DISCOUNT`: exatamente um de `value` (R$ fixo) ou `rate` (% do corrente); subtrai do valor corrente; sem campo `base`.
- Toda task termina com `npm run validate:examples` (em `tools/validator`) verde e o build de `packages/pacp` compilando.
- Commits em português, com trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

**Comandos de verificação (usados em todas as tasks):**
```bash
cd tools/validator && npm run validate:examples          # exemplos positivos (inclui build do validador)
cd packages/pacp && npm run build                        # tipos compilam (tsup)
cd tools/validator && node dist/cli.js test/fixtures/<fixture>.json; echo "exit=$?"   # negativa → exit=2
```
(Se `node_modules` faltar em algum pacote: `npm ci` no diretório correspondente antes.)

---

### Task 1: Renomear base de incidência do `TAX` (`COST`→`CURRENT`, `BASE`→`BASE_PRICE`) + row no site

**Files:**
- Modify: `spec/latest/pacp.schema.json` (campo `base`)
- Modify: `packages/pacp/src/types.ts` (`TaxBase`, doc do campo `base`)
- Modify: `spec/latest/pacp.md` (§6, bullet `TAX`)
- Modify: `docs/pricing-engine.md` (bullet `TAX`)
- Modify: `docs/integration-guide.md` (linha da tabela `TAX`)
- Modify: `spec/latest/examples/tax_operation.json` (valores de `base`)
- Modify: `spec/latest/examples/README.md` (linha `tax_operation.json`)
- Modify: `site/index.html` (adicionar row `TAX` à tabela de operações — o PR esqueceu)
- Modify: `CHANGELOG.md` (nomes de base na entrada 3.7.0)

**Interfaces:**
- Produces: `TaxBase = "CURRENT" | "BASE_PRICE"`; schema enum de `base` = `["CURRENT","BASE_PRICE"]` com `default "CURRENT"`. Task 2 depende desses nomes ao documentar as operações juntas.

- [ ] **Step 1: Schema — renomear enum e adicionar default**

Em `spec/latest/pacp.schema.json`, trocar:
```json
        "rate": { "type": "number" },
        "base": { "type": "string", "enum": ["BASE", "COST"] }
```
por:
```json
        "rate": { "type": "number" },
        "base": { "type": "string", "enum": ["CURRENT", "BASE_PRICE"], "default": "CURRENT" }
```

- [ ] **Step 2: Types — renomear `TaxBase` e atualizar doc do campo**

Em `packages/pacp/src/types.ts`, trocar:
```ts
/** Base de incidência da operação `TAX`. Default `"COST"`. */
export type TaxBase = "BASE" | "COST";
```
por:
```ts
/** Base de incidência da operação `TAX`. Default `"CURRENT"`. */
export type TaxBase = "CURRENT" | "BASE_PRICE";
```
E o comentário do campo `base?: TaxBase`, trocar o bloco:
```ts
  /**
   * Para `TAX`. `"BASE"` incide sobre `product.base_price` (independe do
   * valor corrente acumulado); `"COST"` (default) incide sobre o alvo
   * corrente na cadeia de aplicação.
   */
  base?: TaxBase;
```
por:
```ts
  /**
   * Para `TAX`. `"BASE_PRICE"` incide sobre `product.base_price` (independe
   * do valor corrente acumulado); `"CURRENT"` (default) incide sobre o valor
   * corrente na cadeia de aplicação.
   */
  base?: TaxBase;
```

- [ ] **Step 3: Doc normativa `pacp.md`**

Em `spec/latest/pacp.md`, na §6, trocar o bullet do `TAX`:
```
- `TAX`: soma percentual (`rate`) sobre uma base de incidência (`base`). `base="COST"` (default) incide sobre o alvo corrente na cadeia (mesmo comportamento acumulativo de `PERCENT_OF`); `base="BASE"` incide sobre `product.base_price`, independente do valor já acumulado por regras anteriores.
```
por:
```
- `TAX`: soma percentual (`rate`) sobre uma base de incidência (`base`). `base="CURRENT"` (default) incide sobre o valor corrente na cadeia (mesmo comportamento acumulativo de `PERCENT_OF`); `base="BASE_PRICE"` incide sobre `product.base_price`, independente do valor já acumulado por regras anteriores.
```

- [ ] **Step 4: `docs/pricing-engine.md`**

Trocar o bullet:
```
- `TAX`: soma percentual (`rate`) sobre `base` (`"COST"` = alvo corrente, default; `"BASE"` = `product.base_price`).
```
por:
```
- `TAX`: soma percentual (`rate`) sobre `base` (`"CURRENT"` = valor corrente, default; `"BASE_PRICE"` = `product.base_price`).
```

- [ ] **Step 5: `docs/integration-guide.md`**

Trocar a linha da tabela:
```
| `TAX` | Soma percentual (`rate`) sobre `base` (`"COST"` default = alvo corrente; `"BASE"` = `product.base_price`) | `rate` |
```
por:
```
| `TAX` | Soma percentual (`rate`) sobre `base` (`"CURRENT"` default = valor corrente; `"BASE_PRICE"` = `product.base_price`) | `rate` |
```

- [ ] **Step 6: Exemplo `tax_operation.json`**

Em `spec/latest/examples/tax_operation.json`, trocar `"base": "COST"` por `"base": "CURRENT"` e `"base": "BASE"` por `"base": "BASE_PRICE"`.

- [ ] **Step 7: `examples/README.md`**

Trocar a linha da tabela:
```
| `tax_operation.json` | Operação `TAX`: `base="COST"` (default, incide sobre o alvo corrente no SUBTOTAL) e `base="BASE"` (incide sobre `product.base_price` original no TOTAL, ignorando o ADD acumulado em BASE) |
```
por:
```
| `tax_operation.json` | Operação `TAX`: `base="CURRENT"` (default, incide sobre o valor corrente no SUBTOTAL) e `base="BASE_PRICE"` (incide sobre `product.base_price` original no TOTAL, ignorando o ADD acumulado em BASE) |
```

- [ ] **Step 8: Site — adicionar row `TAX`**

Em `site/index.html`, na `<tbody>` da tabela de operações, após a linha `FLOOR`, adicionar:
```html
              <tr><td class="op-name">TAX</td><td class="op-desc">Imposto: % (rate) sobre o valor corrente ou o base_price</td><td class="op-param">rate: 18, base: "CURRENT"</td></tr>
```

- [ ] **Step 9: CHANGELOG — nomes de base**

Em `CHANGELOG.md`, na entrada `[3.7.0]`, no bullet da operação `TAX`, trocar `base="COST"` → `base="CURRENT"` e `base="BASE"` → `base="BASE_PRICE"` (manter o resto do texto). Ajustar a linha dos campos para citar `base` (`"CURRENT"` | `"BASE_PRICE"`, default `"CURRENT"`).

- [ ] **Step 10: Verificar build + exemplos**

```bash
cd packages/pacp && npm run build
cd ../../tools/validator && npm run validate:examples
```
Expected: build compila; todos os exemplos validam (0 erros). Confirmar que nenhum `"COST"`/`"BASE"` remanesce como valor de base:
```bash
cd ../.. && rg -n '"base": *"(COST|BASE)"' spec/latest/examples || echo "OK sem nomes antigos"
```

- [ ] **Step 11: Commit**

```bash
git add spec/latest/pacp.schema.json packages/pacp/src/types.ts spec/latest/pacp.md docs/pricing-engine.md docs/integration-guide.md spec/latest/examples/tax_operation.json spec/latest/examples/README.md site/index.html CHANGELOG.md
git commit -m "refactor(spec): renomear TAX base COST/BASE -> CURRENT/BASE_PRICE + row no site

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Adicionar operação `DISCOUNT`

**Files:**
- Modify: `spec/latest/pacp.schema.json` (enum `operation`)
- Modify: `packages/pacp/src/types.ts` (`RuleOperation`, doc)
- Modify: `tools/validator/src/cli.ts` (`checkRulesSemanticBasics`)
- Modify: `spec/latest/pacp.md` (§6 operações, ordenação acumulativa, erros normativos)
- Modify: `docs/pricing-engine.md` (bullet)
- Modify: `docs/integration-guide.md` (linha da tabela)
- Create: `spec/latest/examples/discount_operation.json`
- Create: `spec/latest/examples/products/prod_camiseta.json`
- Modify: `spec/latest/examples/README.md` (linha + árvore)
- Create: `tools/validator/test/fixtures/rule_invalid_discount_missing_params.json`
- Modify: `tools/validator/test/README.md` (linha da fixture)
- Modify: `site/index.html` (row `DISCOUNT`)
- Modify: `CHANGELOG.md` (bullets DISCOUNT)

**Interfaces:**
- Consumes: nomes de `base` da Task 1 (`CURRENT`/`BASE_PRICE`) ao documentar operações juntas.
- Produces: `DISCOUNT` no enum; validação semântica `INVALID_OPERATION_PARAMS` quando DISCOUNT não tem exatamente um de `value`/`rate`.

- [ ] **Step 1: Schema — adicionar `DISCOUNT` ao enum**

Em `spec/latest/pacp.schema.json`, no enum de `operation`, trocar:
```json
          "enum": ["ADD", "PERCENT_OF", "OVERRIDE", "LOOKUP", "MAX_OF", "MIN_OF", "PICK", "ROUND", "CAP", "FLOOR", "TAX"]
```
por:
```json
          "enum": ["ADD", "PERCENT_OF", "OVERRIDE", "LOOKUP", "MAX_OF", "MIN_OF", "PICK", "ROUND", "CAP", "FLOOR", "TAX", "DISCOUNT"]
```
(Não adicionar condicional `allOf` para DISCOUNT — a regra "exatamente um de value/rate" é validada no CLI, não expressável de forma limpa no schema.)

- [ ] **Step 2: Types — `RuleOperation` + doc**

Em `packages/pacp/src/types.ts`, trocar:
```ts
export type RuleOperation =
  | "ADD" | "PERCENT_OF" | "OVERRIDE" | "LOOKUP"
  | "MAX_OF" | "MIN_OF" | "PICK" | "ROUND" | "CAP" | "FLOOR" | "TAX";
```
por:
```ts
export type RuleOperation =
  | "ADD" | "PERCENT_OF" | "OVERRIDE" | "LOOKUP"
  | "MAX_OF" | "MIN_OF" | "PICK" | "ROUND" | "CAP" | "FLOOR" | "TAX" | "DISCOUNT";
```
E no bloco de doc de `RuleOperation`, trocar:
```ts
 * - `ADD` / `PERCENT_OF` / `TAX`: acumulam.
 * - `OVERRIDE` / `PICK`: substituem.
```
por:
```ts
 * - `ADD` / `PERCENT_OF` / `TAX`: acumulam (somam).
 * - `DISCOUNT`: subtrai (`value` fixo ou `rate` % do valor corrente).
 * - `OVERRIDE` / `PICK`: substituem.
```

- [ ] **Step 3: Validador — regra semântica DISCOUNT (falha esperada primeiro)**

Em `tools/validator/src/cli.ts`, em `checkRulesSemanticBasics`, logo após o bloco `if (op === "TAX" ...)` (por volta da linha 296), adicionar:
```ts
      if (op === "DISCOUNT") {
        const hasValue = typeof rule.value === "number";
        const hasRate = typeof rule.rate === "number";
        if (hasValue === hasRate) {
          issues.push({
            code: "INVALID_OPERATION_PARAMS",
            path: rulePath,
            message: "Operacao DISCOUNT exige exatamente um de \"value\" ou \"rate\""
          });
        }
      }
```

- [ ] **Step 4: Criar fixture negativa**

Criar `tools/validator/test/fixtures/rule_invalid_discount_missing_params.json`:
```json
{
  "document_type": "CATALOG",
  "catalog": { "id": "cat_test" },
  "rulesets": [
    {
      "id": "rs_total",
      "target": "TOTAL",
      "rules": [
        {
          "id": "rule_discount_sem_params",
          "operation": "DISCOUNT"
        }
      ]
    }
  ]
}
```

- [ ] **Step 5: Rodar fixture negativa — deve falhar com exit 2**

```bash
cd tools/validator && npm run build && node dist/cli.js test/fixtures/rule_invalid_discount_missing_params.json; echo "exit=$?"
```
Expected: imprime `INVALID_OPERATION_PARAMS` e `exit=2`.

- [ ] **Step 6: Criar produto do exemplo**

Criar `spec/latest/examples/products/prod_camiseta.json`:
```json
{
  "document_type": "PRODUCT",
  "catalog_id": "cat_discount",
  "product": {
    "id": "prod_camiseta",
    "name": "Camiseta Basica Algodao",
    "sku": "CAM-BAS-001",
    "base_price": 100,
    "options": [],
    "ruleset_ids": ["rs_total"]
  }
}
```

- [ ] **Step 7: Criar exemplo positivo `discount_operation.json`**

Criar `spec/latest/examples/discount_operation.json` (demonstra `value` fixo e `rate` %):
```json
{
  "document_type": "CATALOG",
  "catalog": {
    "id": "cat_discount",
    "name": "Catalogo DISCOUNT - Vestuario"
  },
  "rulesets": [
    {
      "id": "rs_total",
      "target": "TOTAL",
      "rules": [
        {
          "id": "rule_desconto_fixo",
          "operation": "DISCOUNT",
          "value": 10
        },
        {
          "id": "rule_desconto_percentual",
          "operation": "DISCOUNT",
          "rate": 5
        }
      ]
    }
  ],
  "product_refs": [
    {
      "id": "prod_camiseta",
      "path": "products/prod_camiseta.json"
    }
  ]
}
```

- [ ] **Step 8: Doc normativa `pacp.md`**

Em `spec/latest/pacp.md`:

(a) Na §6, após o bullet do `TAX`, adicionar:
```
- `DISCOUNT`: subtrai um desconto do valor corrente. `value` (R$ fixo) OU `rate` (percentual do valor corrente) — exatamente um. `result = current - value` ou `result = current - (current * rate / 100)`.
```

(b) Na linha de ordenação de operações acumulativas, trocar:
```
- Operações acumulativas (`ADD`, `PERCENT_OF`, `TAX`) DEVE compor resultado na ordem definida.
```
por:
```
- Operações acumulativas (`ADD`, `PERCENT_OF`, `TAX`, `DISCOUNT`) DEVE compor resultado na ordem definida.
```

(c) Nos erros normativos, após `- \`TAX\` sem \`rate\` DEVE falhar em validação.`, adicionar:
```
- `DISCOUNT` sem `value` nem `rate`, ou com ambos, DEVE falhar em validação.
```

- [ ] **Step 9: `docs/pricing-engine.md`**

Após o bullet do `TAX`, adicionar:
```
- `DISCOUNT`: subtrai desconto do valor corrente (`value` R$ fixo ou `rate` % do corrente; exatamente um).
```

- [ ] **Step 10: `docs/integration-guide.md`**

Após a linha da tabela do `TAX`, adicionar:
```
| `DISCOUNT` | Subtrai desconto do valor corrente (`value` R$ fixo ou `rate` % — exatamente um) | `value` \| `rate` |
```

- [ ] **Step 11: `examples/README.md` — linha + árvore**

Na tabela, após a linha `tax_operation.json`, adicionar:
```
| `discount_operation.json` | Operação `DISCOUNT`: `value` (R$ fixo) e `rate` (% do valor corrente) abatendo o preço de venda no TOTAL |
```
Na árvore `examples/`, adicionar `discount_operation.json` na lista de arquivos e `prod_camiseta.json` na lista de `products/` (respeitando os conectores `├──`/`└──`).

- [ ] **Step 12: `tools/validator/test/README.md` — fixture**

Na tabela de fixtures `INVALID_OPERATION_PARAMS`, após a linha do `rule_invalid_tax_missing_rate.json`, adicionar:
```
| `rule_invalid_discount_missing_params.json` | `INVALID_OPERATION_PARAMS` | CATALOG com regra `operation="DISCOUNT"` sem `value` nem `rate` |
```

- [ ] **Step 13: Site — row `DISCOUNT`**

Em `site/index.html`, após a row `TAX` adicionada na Task 1, adicionar:
```html
              <tr><td class="op-name">DISCOUNT</td><td class="op-desc">Desconto: subtrai valor fixo ou percentual do preço</td><td class="op-param">value: 10 | rate: 5</td></tr>
```

- [ ] **Step 14: CHANGELOG — bullets DISCOUNT**

Em `CHANGELOG.md`, na entrada `[3.7.0]`, seção `### Added`, adicionar bullets descrevendo a operação `DISCOUNT` (subtrai `value` fixo ou `rate` % do corrente; exatamente um), a validação semântica `INVALID_OPERATION_PARAMS`, o exemplo `discount_operation.json` e a fixture negativa. Atualizar o título/summary da entrada para mencionar TAX **e** DISCOUNT.

- [ ] **Step 15: Verificação final**

```bash
cd packages/pacp && npm run build
cd ../../tools/validator && npm run validate:examples
node dist/cli.js test/fixtures/rule_invalid_tax_missing_rate.json; echo "exit=$?"       # exit=2
node dist/cli.js test/fixtures/rule_invalid_discount_missing_params.json; echo "exit=$?" # exit=2
```
Expected: build compila; todos os exemplos (incl. `discount_operation.json`) validam; ambas fixtures saem com `exit=2`.

- [ ] **Step 16: Commit**

```bash
git add spec/latest/pacp.schema.json packages/pacp/src/types.ts tools/validator/src/cli.ts spec/latest/pacp.md docs/pricing-engine.md docs/integration-guide.md spec/latest/examples/discount_operation.json spec/latest/examples/products/prod_camiseta.json spec/latest/examples/README.md tools/validator/test/fixtures/rule_invalid_discount_missing_params.json tools/validator/test/README.md site/index.html CHANGELOG.md
git commit -m "feat(spec): adicionar operacao DISCOUNT (value/rate) ao preco de venda

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Pós-implementação (fora do escopo subagent — feito na sessão principal após verificação)

1. Atualizar corpo do PR #9 refletindo TAX (nomes finais) + DISCOUNT.
2. Merge do PR #9 em `main`.
3. Criar GitHub Release com tag `v3.7.0` → dispara `publish-npm.yml` (OIDC) → publica `@pacp/spec@3.7.0`.
4. Verificar publicação no npm.
