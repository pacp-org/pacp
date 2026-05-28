# PACP Cookbook — Receitas Prontas

Coleção de receitas curtas e copiáveis para casos comuns. Voltado para agentes (LLMs) e humanos que precisam gerar PACP rápido.

Para o ponto de partida, leia [`AGENTS.md`](../AGENTS.md). Para a spec normativa, [`spec/latest/pacp.md`](../spec/latest/pacp.md).

---

## Índice

1. [Produto mínimo válido](#1-produto-mínimo-válido)
2. [Sofá com tecido fornecido pelo cliente](#2-sofá-com-tecido-fornecido-pelo-cliente)
3. [Piso vendido em caixas (`sales_unit`)](#3-piso-vendido-em-caixas-sales_unit)
4. [Lookup de preço por matriz 2D](#4-lookup-de-preço-por-matriz-2d)
5. [Desconto de queima de coleção](#5-desconto-de-queima-de-coleção)
6. [Constraint bloqueando combinação inválida](#6-constraint-bloqueando-combinação-inválida)
7. [Lote obrigatório (`lot_policy`)](#7-lote-obrigatório-lot_policy)
8. [Produto interno (componente não-vitrine)](#8-produto-interno-componente-não-vitrine)
9. [`MAX_OF` entre componentes](#9-max_of-entre-componentes)
10. [`PERCENT_OF` acumulado no SUBTOTAL](#10-percent_of-acumulado-no-subtotal)
11. [Múltiplas listas de preço (varejo + atacado)](#11-múltiplas-listas-de-preço-varejo--atacado)
12. [Dependency `REQUIRES` entre opções](#12-dependency-requires-entre-opções)
13. [Produto com profile móveis + `x-fabric_requirements`](#13-produto-com-profile-móveis--x-fabric_requirements)
14. [Família modular com módulos vendáveis](#14-família-modular-com-módulos-vendáveis)

---

## 1. Produto mínimo válido

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

`options: []` é obrigatório mesmo vazio. `base_price` opcional mas recomendado.

## 2. Sofá com tecido fornecido pelo cliente

Vendedor escolhe no PDV se o tecido vem da fábrica ou do cliente. Quantidade necessária varia por nº de lugares.

```json
{
  "product": {
    "id": "prod_sofa_modular",
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
        "factory_cost": { "table_id": "tbl_tecido_preco_por_tipo" }
      }
    ],
    "ruleset_ids": ["rs_base"]
  }
}
```

**Convenção:** `base_price` representa o sofá SEM tecido. Custo do tecido fábrica vive em `factory_cost`.

Exemplo completo: [`spec/latest/examples/supplied_materials.json`](../spec/latest/examples/supplied_materials.json).

## 3. Piso vendido em caixas (`sales_unit`)

Cliente pede em m², fábrica vende em caixas fechadas.

```json
{
  "product": {
    "id": "prod_piso_porcelanato",
    "unit": "m2",
    "base_price": 89.90,
    "sales_unit": {
      "requested_unit": "m2",
      "sell_unit": "caixa",
      "quantity_per_sell_unit": 2.5,
      "rounding": "CEIL",
      "min_sell_units": 1
    },
    "options": []
  }
}
```

Cliente pede 18 m² → engine devolve 8 caixas (`CEIL(18 / 2.5) = 8`).

## 4. Lookup de preço por matriz 2D

Preço depende de 2 atributos (lúmens × voltagem):

```json
{
  "tables": [
    {
      "id": "tbl_preco_luminaria",
      "type": "LOOKUP",
      "dimensions": [
        { "key": "lumens",  "source": "ATTRIBUTE", "attribute_id": "lumens" },
        { "key": "voltage", "source": "ATTRIBUTE", "attribute_id": "voltage" }
      ],
      "rows": [
        { "key": { "lumens": "800",  "voltage": "127V" }, "value": 89.90 },
        { "key": { "lumens": "800",  "voltage": "220V" }, "value": 94.90 },
        { "key": { "lumens": "1200", "voltage": "127V" }, "value": 129.90 },
        { "key": { "lumens": "1200", "voltage": "220V" }, "value": 134.90 }
      ]
    }
  ],
  "rulesets": [
    {
      "id": "rs_base",
      "target": "BASE",
      "rules": [
        { "id": "lookup_preco", "operation": "LOOKUP", "table_id": "tbl_preco_luminaria" }
      ]
    }
  ]
}
```

A ordem das `dimensions` define a ordem da chave de busca. Use `fallback` na rule LOOKUP se quiser tolerar chave ausente.

## 5. Desconto de queima de coleção

Coleção `inverno_2025` ganha -30%:

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

Proteção: combinar com `NOT_IN` em `linha_premium` para excluir produtos premium:

```json
"when": {
  "all": [
    { "fact": "product.collections", "operator": "IN",     "values": ["inverno_2025"] },
    { "fact": "product.collections", "operator": "NOT_IN", "values": ["linha_premium"] }
  ]
}
```

## 6. Constraint bloqueando combinação inválida

Vidro comum não pode com uso externo:

```json
{
  "id": "deny_outdoor_vidro_comum",
  "type": "DENY",
  "when": {
    "all": [
      { "fact": "option.opt_uso_outdoor", "operator": "EQ", "value": true },
      { "fact": "option.opt_vidro_comum", "operator": "EQ", "value": true }
    ]
  },
  "message": "Vidro comum não é permitido em uso externo. Use vidro temperado."
}
```

`message` é exibida ao orçamentista quando o bloqueio dispara.

## 7. Lote obrigatório (`lot_policy`)

Produto exige número de lote no orçamento (rastreabilidade):

```json
{
  "product": {
    "id": "prod_porcelanato_lote",
    "lot_policy": {
      "required": true,
      "source": "CONTEXT",
      "context_key": "lot_id"
    },
    "options": []
  }
}
```

Orçamento DEVE incluir `context.lot_id` ou validador falha com `MISSING_REQUIRED_LOT`.

## 8. Produto interno (componente não-vitrine)

Componente que existe no catálogo mas não aparece em vitrine pública:

```json
{
  "product": {
    "id": "prod_ferragem_dobradica",
    "name": "Dobradiça 35mm Slow-Close",
    "visibility": "INTERNAL",
    "base_price": 12.50,
    "options": []
  }
}
```

Consumidores de vitrine pública DEVEM filtrar `visibility: "INTERNAL"`. Continua plenamente válido para orçamento e referência em rules.

## 9. `MAX_OF` entre componentes

Preço é o maior entre uma constante e um lookup:

```json
{
  "id": "rule_max_base",
  "operation": "MAX_OF",
  "components": [
    { "label": "Piso mínimo", "value": 500 },
    { "label": "Preço por m²", "table_id": "tbl_preco_m2" }
  ]
}
```

`MAX_OF` e `MIN_OF` exigem ao menos 2 components.

## 10. `PERCENT_OF` acumulado no SUBTOTAL

Imposto de 18% aplicado depois das regras de base:

```json
{
  "id": "rs_subtotal",
  "target": "SUBTOTAL",
  "rules": [
    {
      "id": "rule_icms",
      "operation": "PERCENT_OF",
      "percent": 18
    }
  ]
}
```

`PERCENT_OF` em SUBTOTAL incide sobre o subtotal corrente (preço base após rulesets de BASE).

## 11. Múltiplas listas de preço (varejo + atacado)

```json
{
  "catalog": {
    "id": "cat_revenda",
    "default_price_list_id": "pl_varejo",
    "price_lists": [
      { "id": "pl_varejo",  "currency": "BRL", "label": "Varejo" },
      { "id": "pl_atacado", "currency": "BRL", "label": "Atacado (B2B)",
        "context_match": { "channel": "b2b" } }
    ]
  }
}
```

Orçamento com `context.channel = "b2b"` casa com `pl_atacado` automaticamente. Sem contexto, usa `default_price_list_id`.

## 12. Dependency `REQUIRES` entre opções

Pé de inox exige acabamento de aço escovado:

```json
{
  "id": "dep_pe_inox",
  "type": "REQUIRES",
  "option_id": "opt_pe_inox",
  "requires_option_ids": ["opt_acabamento_aco_escovado"]
}
```

Avaliado antes do cálculo de preço (fase de validação). Se `opt_pe_inox` está selecionada e `opt_acabamento_aco_escovado` não, validação bloqueia.

## 13. Produto com profile móveis + `x-fabric_requirements`

Catálogo declara profile, produto usa campos padronizados:

```json
{
  "document_type": "CATALOG",
  "profiles": ["moveis"],
  "catalog": { ... }
}
```

E no produto:

```json
{
  "product": {
    "id": "prod_poltrona_premium",
    "x-warranty_months": 24,
    "x-finish": "Alumínio escovado",
    "x-load_capacity": { "value": 150, "unit": "kg" },
    "supplied_materials": [
      {
        "id": "mat_tecido",
        "material": "TECIDO",
        "quantity": { "value": 4.5, "unit": "m2" },
        "default_source": "FACTORY",
        "factory_cost": { "value": 320 },
        "requirements": {
          "x-fabric_requirements": {
            "min_weight_gsm": 380,
            "min_width_cm": 140,
            "allowed_compositions": ["LINHO", "ALGODAO", "VELUDO"],
            "abrasion_min_cycles_martindale": 30000,
            "flammability_standard": "NBR_15805"
          }
        }
      }
    ]
  }
}
```

Profile `moveis` valida `x-assembly_required`, `x-load_capacity`, `x-warranty_months`, `x-finish`, `x-style`, `x-indoor_outdoor` no nível do produto. `x-fabric_requirements` é validado quando aninhado em `requirements` por consumidores que carregam o schema do profile.

## 14. Família modular com módulos vendáveis

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

---

## Outros padrões úteis

**Categorias hierárquicas múltiplas:**

```json
"category": [
  ["Móveis", "Estofados", "Sofá"],
  ["Sala de Estar"],
  ["Promoções"]
]
```

**Imagens com posição explícita:**

```json
"images": [
  { "url": "https://...", "type": "MAIN",    "position": 0, "alt": "Vista frontal" },
  { "url": "https://...", "type": "DETAIL",  "position": 1, "alt": "Detalhe do tecido" }
]
```

**Imagens por variante (option):**

```json
"options": [
  {
    "id": "opt_nogueira",
    "attribute_id": "cor",
    "value": "NOGUEIRA",
    "images": [
      { "url": "https://...cor-nogueira.jpg", "type": "MAIN" }
    ]
  }
]
```

Consumidores DEVEM priorizar `option.images` sobre `product.images` quando exibindo a variante selecionada.

---

## Como rodar / validar

```bash
# Instalar
npm install @pacp/spec ajv ajv-formats

# Validar via TypeScript
import { validate } from '@pacp/spec';
const result = validate(doc);
console.log(result.valid, result.issues);

# Validar via CLI (do repo PACP)
cd tools/validator && npm run build
node dist/cli.js caminho/arquivo.json
```

Para o setup completo do validador, ver [`tools/validator/README.md`](../tools/validator/) e [`AGENTS.md`](../AGENTS.md) (tabela de erros).
