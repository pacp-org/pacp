# AGENTS.md — Guia para agentes que geram ou consomem PACP

Este arquivo é o ponto de partida para agentes (Claude Code, Codex, etc.) que precisam gerar, validar ou consumir documentos PACP. Otimizado para você pegar contexto em uma leitura.

## O que é PACP

PACP (Padrão Aberto de Catálogo e Precificação) é um contrato JSON para modelar catálogos de produtos configuráveis e calcular preços determinísticos. Casos-tipo: móveis estofados, pisos e revestimentos, iluminação — qualquer produto com configuração + regra de preço.

**Quatro decisões arquiteturais que vão te poupar de erro:**
- Produtos têm `attributes` (declaração) + `options` (valores selecionáveis). NÃO explode SKU por variante.
- Preço é calculado por **rulesets** com pipeline determinístico. Mesma entrada → mesma saída.
- IDs são **estáveis e únicos por coleção**. Não use IDs gerados (timestamp, hash). Use `snake_case` legível.
- Toda extensão passa por `x-*` (campos custom) ou por **extension profiles** (móveis, iluminação, etc.).

## Quick start: documento mínimo válido

Menor PRODUCT possível:

```json
{
  "document_type": "PRODUCT",
  "catalog_id": "cat_demo",
  "product": {
    "id": "prod_minimal",
    "name": "Produto Mínimo",
    "base_price": 100,
    "options": []
  }
}
```

Menor CATALOG possível (referencia o PRODUCT acima):

```json
{
  "document_type": "CATALOG",
  "catalog": {
    "id": "cat_demo",
    "default_price_list_id": "pl_varejo",
    "price_lists": [{ "id": "pl_varejo", "currency": "BRL" }]
  },
  "rulesets": [{ "id": "rs_base", "target": "BASE", "rules": [] }],
  "product_refs": [{ "id": "prod_minimal", "path": "products/prod_minimal.json" }]
}
```

## Anatomia: CATALOG vs PRODUCT

**CATALOG** (manifesto) contém:
- Metadados (`catalog.id`, listas de preço)
- `product_refs[]` apontando para arquivos `PRODUCT`
- `tables[]` (lookups compartilhados)
- `rulesets[]` (regras de precificação)
- `dependencies[]` / `constraints[]` (validação de combinações)
- `profiles[]` (`["moveis"]`, etc.)

**PRODUCT** (1 arquivo por produto) contém:
- `catalog_id` (deve casar com `catalog.id`)
- `product` com `attributes`, `options`, `supplied_materials`, `ruleset_ids`, descritivos

Convenção: 1 arquivo CATALOG + N arquivos `products/PROD-XYZ.json` no mesmo diretório.

## Convenções não-óbvias

Coisas que LLMs erram com frequência. Memorize.

1. **IDs em `snake_case` ou `kebab-case`, valores em `SNAKE_UPPER`.**
   - `id: "prod_sofa_modular"`, `id: "opt_veludo"`
   - `value: "VELUDO"`, `value: "FABRICA"`
   - `material: "TECIDO"` (sempre uppercase com underscore)

2. **Não inventar campos novos sem prefixo `x-`.** Qualquer campo não normativo precisa ser `x-*` (ex: `x-warranty_months`). Profiles padronizam alguns.

3. **`Option.attribute_id` deve apontar para um attribute declarado.** Ordem: declare `attributes[{id: "cor"}]` ANTES de criar `options[{attribute_id: "cor", ...}]`.

4. **Tabelas LOOKUP: ordem das dimensões importa.** A chave de busca é construída na ordem declarada em `dimensions[]`. Linhas em `rows[].key` precisam ter EXATAMENTE as chaves declaradas.

5. **`base_price` sem `supplied_materials`** inclui tudo. **`base_price` COM `supplied_materials`** representa o produto SEM os materiais — custo vai pra `factory_cost` de cada material. Veja §4.8 da spec.

6. **`sales_unit.rounding` em PACP DEVE ser `CEIL`.** Outros valores (FLOOR/ROUND/HALF_UP) são tolerados pelo schema mas a spec normaliza CEIL.

7. **`unit` no produto e `sales_unit.requested_unit` DEVEM ser iguais** quando coexistem.

## Receitas comuns

### Sofá com tecido fornecido pelo cliente

Use quando: produto aceita material do cliente como opção (tecido, couro, mármore).

```json
{
  "id": "mat_tecido",
  "material": "TECIDO",
  "quantity": { "table_id": "tbl_tecido_qty", "unit": "m2" },
  "default_source": "FACTORY",
  "sourcing_attribute_id": "modo_tecido",
  "source_when": {
    "factory":  ["FABRICA"],
    "customer": ["EU_FORNECO"]
  },
  "factory_cost": { "table_id": "tbl_tecido_preco" },
  "requirements": {
    "x-fabric_requirements": {
      "min_weight_gsm": 380,
      "min_width_cm": 140
    }
  }
}
```

Exemplo completo: [`spec/latest/examples/supplied_materials.json`](spec/latest/examples/supplied_materials.json).

### Piso vendido em caixas

Use quando: produto é vendido por unidade comercial fechada (caixa, galão, saco) mas o cliente pede em outra unidade (m², L).

```json
{
  "unit": "m2",
  "sales_unit": {
    "requested_unit": "m2",
    "sell_unit": "caixa",
    "quantity_per_sell_unit": 2.5,
    "rounding": "CEIL",
    "min_sell_units": 1
  }
}
```

Cliente pede 18 m² → engine retorna 8 caixas (CEIL(18/2.5)). Exemplo: `examples/cost_plus.json`.

### Lookup de preço por combinação de atributos

Use quando: preço depende de 2+ atributos (ex: lúmens × voltagem).

```json
{
  "id": "tbl_preco",
  "type": "LOOKUP",
  "dimensions": [
    { "key": "lumens",  "source": "ATTRIBUTE", "attribute_id": "lumens" },
    { "key": "voltage", "source": "ATTRIBUTE", "attribute_id": "voltage" }
  ],
  "rows": [
    { "key": { "lumens": "800",  "voltage": "127V" }, "value": 89.90 },
    { "key": { "lumens": "1200", "voltage": "127V" }, "value": 129.90 }
  ]
}
```

Use em rule `LOOKUP`: `{ "operation": "LOOKUP", "table_id": "tbl_preco" }`. Exemplo: `examples/matrix_lookup.json`.

### Desconto de queima de coleção

Use quando: regra dispara baseada em pertencimento do produto a uma coleção.

```json
{
  "id": "rule_queima_inverno",
  "operation": "PERCENT_OF",
  "percent": -30,
  "when": {
    "all": [
      { "fact": "product.collections", "operator": "IN", "values": ["inverno_2025"] }
    ]
  }
}
```

Exemplo: `examples/collections.json`.

### Constraint bloqueando combinação inválida

```json
{
  "id": "deny_outdoor_vidro_comum",
  "type": "DENY",
  "when": {
    "all": [
      { "fact": "option.opt_uso_outdoor",     "operator": "EQ", "value": true },
      { "fact": "option.opt_vidro_comum",     "operator": "EQ", "value": true }
    ]
  },
  "message": "Vidro comum não é permitido em uso externo. Use vidro temperado."
}
```

Exemplo: `examples/dependencies.json`.

## Como validar o que você gerou

**CLI (Node):**

```bash
cd tools/validator
npm run build
node dist/cli.js caminho/do/arquivo.json
```

Exit 0 = válido. Exit 2 = inválido (saída lista erros com código, path e mensagem).

**Em código TypeScript:**

```typescript
import { validate } from '@pacp/spec';
const result = validate(doc);
if (!result.valid) {
  for (const issue of result.issues) {
    console.error(`[${issue.code}] ${issue.path}: ${issue.message}`);
  }
}
```

(Requer `npm install @pacp/spec ajv ajv-formats`.)

## Erros do validador → fix

| Código | Causa típica | Fix |
|---|---|---|
| `SCHEMA` | Campo errado, tipo errado, obrigatório faltando | Olhe `path` no erro; consulte `pacp.schema.json` |
| `DUPLICATE_ID` | Dois `id` iguais em `products`, `tables`, `rulesets` ou `options` | IDs DEVEM ser únicos por coleção |
| `BROKEN_REFERENCE` | `product_id`, `table_id`, `option_id`, `ruleset_id` aponta para algo que não existe | Verifique que o item referenciado foi declarado |
| `MISSING_SOURCING_ATTRIBUTE` | `supplied_material.sourcing_attribute_id` aponta para attribute inexistente | Adicione o attribute em `product.attributes` |
| `INVALID_SOURCE_WHEN` | `sourcing_attribute_id` presente sem `source_when` | Adicione `source_when: { factory: [...], customer: [...] }` |
| `UNCOVERED_OPTION_VALUE` | `source_when` não cobre todos os `option.value` do attribute | Adicione o valor faltante em `source_when.factory` ou `.customer` |
| `DUPLICATE_SUPPLIED_MATERIAL_ID` | Dois materials com mesmo `id` no produto | Renomeie |
| `UNIT_SALES_UNIT_MISMATCH` | `product.unit` ≠ `sales_unit.requested_unit` | Sincronize |
| `MISSING_REQUIRED_LOT` | `lot_policy.required=true` mas `context.lot_id` ausente | Forneça lote no `context` |
| `MISSING_REQUESTED_QUANTITY` | `sales_unit` presente sem `context.requested_quantity` | Adicione no context |

## Don'ts

- **Não use IDs gerados** (timestamp, UUID v4, hash) — quebra estabilidade.
- **Não duplique** `attributes` que já existem como `options` (use `attribute_values` se for valor fixo).
- **Não invente operadores** em `Predicate.operator` além dos listados.
- **Não esqueça** `source_when` quando colocou `sourcing_attribute_id`.
- **Não misture** `quantity.value` E `quantity.table_id` no mesmo material — exatamente um.
- **Não use** `OVERRIDE` quando quer somar — use `ADD` ou `PERCENT_OF`.
- **Não modifique** valores existentes de option (`value`) — quebra retrocompatibilidade. Pode mudar `label`.

## Onde olhar quando travar

- **Spec normativa**: [`spec/latest/pacp.md`](spec/latest/pacp.md) — autoridade final.
- **JSON Schema**: [`spec/latest/pacp.schema.json`](spec/latest/pacp.schema.json) — forma estrutural.
- **Exemplos oficiais**: [`spec/latest/examples/`](spec/latest/examples/) — 9 manifestos + N produtos cobrindo casos representativos. Bom para few-shot.
- **Profiles**: [`spec/latest/profiles/`](spec/latest/profiles/) — campos `x-*` padronizados por vertical (`moveis`, `iluminacao`, `pisos-revestimentos`, `fiscal-br`).
- **Tipos TypeScript**: [`packages/pacp/src/types.ts`](packages/pacp/src/types.ts) — JSDoc em cada interface.
- **Guias humanos**: [`docs/integration-guide.md`](docs/integration-guide.md), [`docs/import-guidelines.md`](docs/import-guidelines.md), [`docs/pricing-engine.md`](docs/pricing-engine.md).

## Ordem de execução do engine (resumida)

Quando consumir um catálogo para precificar:

1. Validação estrutural (schema + checks).
2. Constraints e dependencies (bloqueio de combinação).
3. Validação de lote + quantidade solicitada.
4. Normalização de `sales_unit` (CEIL).
5. Resolução de `supplied_materials` (fonte + quantidade).
6. Inicialização de `base_price`.
7. Rulesets de `BASE` → subtotal.
8. Rulesets de `SUBTOTAL` → total.
9. Rulesets de `TOTAL`.
10. Pós-processamento (`ROUND`/`CAP`/`FLOOR`).

Output do engine inclui: `total`, `subtotal`, e `supplied_quantities[]` (uma entrada por material com fonte = CUSTOMER).

Detalhes: spec §5.2.
