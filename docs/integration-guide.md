# Guia de Integração PACP

## O que é o PACP

PACP (Padrão Aberto de Catálogo e Precificação) é um contrato JSON para modelar catálogos de produtos e calcular preços de forma **determinística** — a mesma entrada sempre gera o mesmo resultado.

O padrão foi projetado para os mercados de **Móveis e Alta Decoração**, **Pisos e Revestimentos**, **Iluminação** e setores correlatos, mas sua arquitetura é genérica o suficiente para qualquer catálogo com precificação configurável.

### O que o PACP resolve

- Define um formato único para trocar catálogos entre sistemas (ERP, e-commerce, configuradores, orçamentistas).
- Elimina planilhas ad-hoc e integrações proprietárias.
- Modela produtos por **atributos + regras**, sem exigir expansão massiva de SKUs.
- Separa validação de combinações (constraints) da fase de cálculo (rulesets).

### O que o PACP **não** faz

- Não define como seu banco de dados deve ser estruturado.
- Não impõe interface de usuário.
- Não gera variantes explícitas — você modela o motor, não a explosão combinatória.

---

## Arquitetura de documentos

O PACP trabalha com dois tipos de documento JSON:

```
catalogo/
├── catalogo.json          ← document_type: CATALOG (manifesto)
└── products/
    ├── prod_painel.json   ← document_type: PRODUCT
    ├── prod_luminaria.json
    └── prod_piso.json
```

### Documento CATALOG (manifesto)

O manifesto é o ponto de entrada. Contém as regras de precificação, tabelas, constraints e referências aos produtos.

```json
{
  "document_type": "CATALOG",
  "catalog": {
    "id": "cat_moveis_2026",
    "name": "Catálogo Móveis 2026"
  },
  "profiles": ["moveis"],
  "product_refs": [
    { "id": "prod_painel", "path": "products/prod_painel.json" }
  ],
  "rulesets": [ ... ],
  "tables": [ ... ],
  "constraints": [ ... ],
  "dependencies": [ ... ]
}
```

**Campos obrigatórios:** `spec`, `document_type`, `catalog` (com `id`), `rulesets` (pelo menos 1).

### Documento PRODUCT

Cada produto vive em seu próprio arquivo JSON. O manifesto referencia via `product_refs`.

```json
{
  "document_type": "PRODUCT",
  "catalog_id": "cat_moveis_2026",
  "product": {
    "id": "prod_painel",
    "name": "Painel Ripado Elegance",
    "sku": "PNL-ELG-001",
    "manufacturer": "Moveis Artisan",
    "brand": "Artisan Home",
    "description": "Painel ripado em MDF com acabamento nogueira.",
    "category": "Paineis",
    "gtin": "7891234567890",
    "base_price": 100,
    "images": [
      { "url": "https://cdn.example.com/pnl-001.jpg", "type": "MAIN" }
    ],
    "weight": { "value": 12.5, "unit": "kg" },
    "dimensions": { "width": 180, "height": 90, "depth": 3, "unit": "cm" },
    "tags": ["painel", "MDF", "sala"],
    "attributes": [
      { "id": "material" }
    ],
    "options": [
      { "id": "opt_material_pvc", "attribute_id": "material", "value": "PVC" }
    ],
    "ruleset_ids": ["rs_calculo_moveis"]
  }
}
```

**Campos obrigatórios do produto:** `id`, `options`.
**Campos universais opcionais:** `name`, `sku`, `manufacturer`, `brand`, `description`, `category`, `gtin`, `images`, `tags`, `weight`, `dimensions`, `base_price`.

---

## Campos universais do produto

Esses campos existem no core do PACP para que o catálogo seja autocontido, sem depender de um PIM externo.

| Campo | Tipo | Para que serve |
|-------|------|----------------|
| `id` | string | Identificador interno (referências PACP). **Obrigatório.** |
| `name` | string | Nome legível para exibição |
| `sku` | string | Código SKU para integração com ERP/e-commerce |
| `manufacturer` | string | Fabricante do produto |
| `brand` | string | Marca comercial (pode diferir do fabricante) |
| `description` | string | Descrição para catálogos e lojas |
| `category` | string | Categoria principal |
| `gtin` | string (8-14 dígitos) | Código de barras EAN/GTIN |
| `base_price` | number | Preço base unitário |
| `images` | array | Referências a imagens (cada uma com `url`, `type`, `label`) |
| `tags` | array de strings | Tags livres para busca e classificação |
| `weight` | object | Peso: `{ "value": 12.5, "unit": "kg" }` |
| `dimensions` | object | Dimensões: `{ "width": 180, "height": 90, "depth": 3, "unit": "cm" }` |

Tipos de imagem: `MAIN`, `DETAIL`, `AMBIANCE`, `TECHNICAL`, `OTHER`.

---

## Atributos, opções e o modelo configurável

O PACP não explode variantes. Em vez disso, modela **atributos** (eixos de variação) e **opções** (valores selecionáveis).

**Exemplo:** um sofá tem atributo `tecido` com opções `LINHO`, `VELUDO`, `COURO`. Em vez de criar 3 SKUs, você cria 1 produto com 3 opções.

```json
{
  "attributes": [
    { "id": "tecido", "label": "Tecido" },
    { "id": "tamanho", "label": "Tamanho" }
  ],
  "options": [
    { "id": "opt_linho", "attribute_id": "tecido", "value": "LINHO", "label": "Linho Natural" },
    { "id": "opt_veludo", "attribute_id": "tecido", "value": "VELUDO", "label": "Veludo Premium" },
    { "id": "opt_2lug", "attribute_id": "tamanho", "value": "2L", "label": "2 Lugares" },
    { "id": "opt_3lug", "attribute_id": "tamanho", "value": "3L", "label": "3 Lugares" }
  ]
}
```

As regras de preço atuam **sobre as opções selecionadas**, sem precisar pré-calcular todas as combinações.

---

## Como funciona a precificação

### Targets: 3 estágios

Cada conjunto de regras (`ruleset`) atua em um estágio:

1. **BASE** — ajustes no preço base do produto.
2. **SUBTOTAL** — ajustes após o cálculo de base (ex: agregadores, componentes).
3. **TOTAL** — ajustes finais (margens, impostos, arredondamento).

### Operações disponíveis

| Operação | O que faz | Parâmetro principal |
|----------|-----------|---------------------|
| `ADD` | Soma valor fixo | `value` |
| `PERCENT_OF` | Soma percentual sobre o alvo | `percent` |
| `OVERRIDE` | Substitui o valor corrente | `value` |
| `LOOKUP` | Busca valor em tabela | `table_id` |
| `MAX_OF` | Maior valor entre componentes | `components` |
| `MIN_OF` | Menor valor entre componentes | `components` |
| `PICK` | Primeiro componente elegível | `components` |
| `ROUND` | Arredondamento | `precision` |
| `CAP` | Teto máximo | `max` |
| `FLOOR` | Piso mínimo | `min` |

### Ordem de execução (determinística)

1. Validar schema.
2. Avaliar constraints e dependencies (bloquear combinações inválidas).
3. Validar lote e unidade solicitada (quando aplicável).
4. Inicializar `base_price`.
5. Aplicar rulesets de `BASE` (ordenados por `priority` desc, depois `id` asc).
6. Formar subtotal.
7. Aplicar rulesets de `SUBTOTAL`.
8. Formar total.
9. Aplicar rulesets de `TOTAL`.
10. Pós-processamento (`ROUND`, `CAP`, `FLOOR`).

### Regras condicionais (`when`)

Regras podem ter condições. Só são aplicadas quando a condição é verdadeira.

```json
{
  "id": "rule_add_color",
  "operation": "ADD",
  "value": 8,
  "when": {
    "all": [
      { "fact": "print", "operator": "EQ", "value": "COLOR" }
    ]
  }
}
```

Operadores: `EQ`, `NEQ`, `IN`, `NOT_IN`, `GT`, `GTE`, `LT`, `LTE`, `EXISTS`.

---

## Tabelas de preço matriciais (LOOKUP)

Quando o preço depende de uma combinação de atributos (ex: largura x acabamento), use tabelas.

```json
{
  "id": "tbl_preco_luminaria",
  "type": "LOOKUP",
  "dimensions": [
    { "key": "largura", "source": "ATTRIBUTE", "attribute_id": "width" },
    { "key": "acabamento", "source": "ATTRIBUTE", "attribute_id": "finish" }
  ],
  "rows": [
    { "key": { "largura": "1m", "acabamento": "MATTE" }, "value": 18 },
    { "key": { "largura": "1m", "acabamento": "BRILHO" }, "value": 22 },
    { "key": { "largura": "2m", "acabamento": "MATTE" }, "value": 35 }
  ]
}
```

A regra referencia a tabela:

```json
{
  "id": "rule_lookup",
  "operation": "LOOKUP",
  "table_id": "tbl_preco_luminaria"
}
```

O motor cruza os atributos selecionados com as dimensões da tabela para encontrar o valor.

---

## Constraints e dependencies

### Constraints (bloqueios)

Impedem combinações inválidas **antes** do cálculo de preço.

```json
{
  "id": "ct_deny_outdoor_linho",
  "type": "DENY",
  "when": {
    "all": [
      { "fact": "tecido", "operator": "EQ", "value": "LINHO" },
      { "fact": "uso", "operator": "EQ", "value": "OUTDOOR" }
    ]
  },
  "message": "Linho não é indicado para uso externo."
}
```

### Dependencies (relações entre opções)

- **REQUIRES:** opção A exige opção B.
- **IMPLIES:** seleção de A implica B.
- **AVAILABLE_OPTIONS_WHEN:** filtra opções disponíveis com base em condição.

---

## Unidade de venda e lote

### Conversão de unidade (`sales_unit`)

Cenário comum em pisos: o cliente pede `23 m²`, mas o produto é vendido em **caixas** de `2.2 m²`.

```json
{
  "sales_unit": {
    "requested_unit": "m2",
    "sell_unit": "box",
    "quantity_per_sell_unit": 2.2,
    "rounding": "CEIL",
    "min_sell_units": 1
  }
}
```

Cálculo: `CEIL(23 / 2.2) = 11 caixas`.

O `context` do catálogo informa a quantidade solicitada:

```json
{
  "context": {
    "requested_quantity": 23,
    "requested_unit": "m2"
  }
}
```

### Controle de lote (`lot_policy`)

Para produtos vendidos por lote (pisos, revestimentos), o PACP exige que o lote seja informado antes do cálculo.

```json
{
  "lot_policy": {
    "required": true,
    "source": "CONTEXT",
    "context_key": "lot_id"
  }
}
```

Se `lot_policy.required = true` e o lote não estiver no `context`, o motor bloqueia o cálculo.

---

## Múltiplas listas de preço

Um catálogo pode ter várias listas (varejo, B2B, atacado) e o `context` seleciona qual usar.

```json
{
  "catalog": {
    "id": "cat_multi",
    "price_lists": [
      { "id": "pl_retail", "currency": "BRL", "label": "Varejo" },
      { "id": "pl_b2b", "currency": "BRL", "label": "B2B", "context_match": { "channel": "B2B" } }
    ],
    "default_price_list_id": "pl_retail"
  },
  "context": {
    "price_list_id": "pl_b2b",
    "channel": "B2B"
  }
}
```

---

## Extension Profiles — como funciona por vertical

O PACP usa um modelo **core universal + profiles por vertical**. Os campos universais (`sku`, `manufacturer`, `brand`, etc.) estão no core. Campos específicos de cada setor são padronizados via **extension profiles**.

### Como declarar

No manifesto do catálogo:

```json
{
  "profiles": ["moveis", "fiscal-br"]
}
```

Isso declara que os produtos desse catálogo usam os campos `x-*` definidos nos profiles `moveis` e `fiscal-br`. O validador PACP verifica automaticamente os tipos dos campos `x-*` contra os schemas dos profiles.

### Profile: Móveis e Alta Decoração (`moveis`)

Para fabricantes de móveis, lojas de decoração, marcenarias e showrooms.

**Campos disponíveis no produto:**

| Campo | Tipo | Exemplo |
|-------|------|---------|
| `x-assembly_required` | boolean | `true` |
| `x-load_capacity` | measure | `{ "value": 50, "unit": "kg" }` |
| `x-material_composition` | string | `"MDF com laminado melamínico"` |
| `x-finish` | string | `"Nogueira natural"` |
| `x-warranty_months` | integer | `12` |
| `x-style` | string | `"Contemporâneo"` |
| `x-indoor_outdoor` | enum | `"INDOOR"`, `"OUTDOOR"`, `"BOTH"` |

**Exemplo real — Painel Ripado:**

```json
{
  "product": {
    "id": "prod_painel",
    "name": "Painel Ripado Elegance",
    "sku": "PNL-ELG-001",
    "manufacturer": "Moveis Artisan",
    "brand": "Artisan Home",
    "base_price": 100,
    "weight": { "value": 12.5, "unit": "kg" },
    "dimensions": { "width": 180, "height": 90, "depth": 3, "unit": "cm" },
    "x-assembly_required": false,
    "x-material_composition": "MDF com laminado melaminico",
    "x-finish": "Nogueira natural",
    "x-warranty_months": 12,
    "x-style": "Contemporaneo",
    "x-indoor_outdoor": "INDOOR"
  }
}
```

**Cenário típico de precificação:** o preço do móvel varia por material. Uma regra `MAX_OF` seleciona o maior valor entre um piso fixo e uma tabela de lookup por material.

### Profile: Iluminação (`iluminacao`)

Para fabricantes de luminárias, lojas especializadas e projetos de lighting design.

**Campos disponíveis no produto:**

| Campo | Tipo | Exemplo |
|-------|------|---------|
| `x-lumens` | number | `2400` |
| `x-color_temp_k` | number | `3000` (branco quente) |
| `x-ip_rating` | string (padrão IPxx) | `"IP65"` |
| `x-voltage` | enum | `"BIVOLT"`, `"110V"`, `"220V"`, `"12V"`, `"24V"` |
| `x-dimmable` | boolean | `true` |
| `x-lamp_type` | string | `"LED"` |
| `x-beam_angle_deg` | number | `120` |
| `x-cri` | number (0-100) | `90` |

**Exemplo real — Luminária Pendente:**

```json
{
  "product": {
    "id": "prod_luminaria",
    "name": "Luminaria Pendente Arc",
    "sku": "LUM-ARC-001",
    "manufacturer": "LightStudio",
    "base_price": 50,
    "weight": { "value": 2.3, "unit": "kg" },
    "dimensions": { "width": 60, "height": 25, "depth": 60, "unit": "cm" },
    "x-lumens": 2400,
    "x-color_temp_k": 3000,
    "x-ip_rating": "IP20",
    "x-voltage": "BIVOLT",
    "x-dimmable": true,
    "x-lamp_type": "LED",
    "x-cri": 90
  }
}
```

**Cenário típico de precificação:** o preço da luminária varia por combinação de largura e acabamento, modelada como tabela matricial (`LOOKUP`).

### Profile: Pisos e Revestimentos (`pisos-revestimentos`)

Para cerâmicas, porcelanatos, fabricantes de revestimento e lojas de materiais.

**Campos disponíveis no produto:**

| Campo | Tipo | Exemplo |
|-------|------|---------|
| `x-pei` | integer (0-5) | `4` |
| `x-water_absorption_pct` | number | `0.1` |
| `x-slip_resistance` | string | `"R10"` |
| `x-rectified` | boolean | `true` |
| `x-surface_finish` | string | `"Acetinado"` |
| `x-nominal_size_cm` | string | `"60x60"` |
| `x-thickness_mm` | number | `10` |
| `x-usage` | enum | `"FLOOR"`, `"WALL"`, `"FLOOR_WALL"`, `"OUTDOOR"`, `"POOL"` |

**Exemplo real — Porcelanato:**

```json
{
  "product": {
    "id": "prod_porcelanato",
    "name": "Porcelanato Acetinado Marmo Bianco",
    "sku": "PRC-MRB-6060",
    "manufacturer": "Ceramica Atlas",
    "base_price": 80,
    "lot_policy": { "required": true, "source": "CONTEXT", "context_key": "lot_id" },
    "sales_unit": {
      "requested_unit": "m2",
      "sell_unit": "box",
      "quantity_per_sell_unit": 2.2,
      "rounding": "CEIL"
    },
    "x-pei": 4,
    "x-water_absorption_pct": 0.1,
    "x-slip_resistance": "R10",
    "x-rectified": true,
    "x-surface_finish": "Acetinado",
    "x-nominal_size_cm": "60x60",
    "x-thickness_mm": 10,
    "x-usage": "FLOOR_WALL"
  }
}
```

**Cenário típico de precificação:**
- Venda por caixa a partir de m² solicitado (`sales_unit` com `CEIL`).
- Controle de lote obrigatório (`lot_policy`).
- Margem de markup sobre custo (`PERCENT_OF` no target `TOTAL`).

### Profile: Fiscal Brasil (`fiscal-br`)

Pode ser combinado com qualquer profile de vertical. Padroniza dados fiscais brasileiros.

**Campos disponíveis no produto:**

| Campo | Tipo | Exemplo |
|-------|------|---------|
| `x-ncm` | string (8 dígitos) | `"69072300"` |
| `x-origem` | enum | `"0"` (Nacional) |
| `x-cest` | string (7 dígitos) | `"1000100"` |
| `x-cfop` | string (4 dígitos) | `"5102"` |
| `x-unidade_tributaria` | string | `"M2"` |

**Uso combinado com pisos:**

```json
{
  "profiles": ["pisos-revestimentos", "fiscal-br"]
}
```

O produto então carrega campos de ambos os profiles.

---

## Extensões livres (`x-*`)

Além dos profiles, qualquer objeto PACP aceita campos `x-*` livres. Eles não precisam de profile declarado e não quebram a validação base.

```json
{
  "product": {
    "id": "prod_custom",
    "x-erp-code": "ABC-123",
    "x-internal-notes": "Revisar preço Q2"
  }
}
```

A diferença para um profile: campos livres `x-*` não são validados quanto a tipo. Profiles dão contrato formal.

---

## Validação

### CLI do validador

```bash
cd tools/validator
npm ci && npm run build

# Validar um arquivo
npm run validate -- ../../spec/latest/examples/moveis/max_of.json

# Validar todos os exemplos oficiais
npm run validate:examples
```

### O que o validador verifica

1. **Schema JSON** — estrutura conforme `pacp.schema.json`.
2. **IDs duplicados** — produtos, tabelas, rulesets, opções.
3. **Referências quebradas** — `table_id`, `option_id`, `ruleset_id` apontando para IDs inexistentes.
4. **Semântica de operações** — `ADD` sem `value`, `LOOKUP` sem `table_id`, etc.
5. **Lote e unidade** — lote obrigatório sem `context.lot_id`, unidade incompatível.
6. **Extension profiles** — quando `profiles` está declarado, valida campos `x-*` contra o schema do profile.

---

## Passo a passo para integrar

### 1. Comece pelo mínimo

Crie um catálogo com 1 produto e 1 regra simples (`ADD`):

```json
{
  "document_type": "CATALOG",
  "catalog": { "id": "meu_catalogo" },
  "product_refs": [
    { "id": "prod_mesa", "path": "products/prod_mesa.json" }
  ],
  "rulesets": [
    {
      "id": "rs_base",
      "target": "BASE",
      "rules": [
        { "id": "rule_setup", "operation": "ADD", "value": 10 }
      ]
    }
  ]
}
```

Valide com `npm run validate -- caminho/para/seu_catalogo.json`.

### 2. Adicione campos descritivos

Enriqueça os produtos com `sku`, `manufacturer`, `brand`, `images`, `weight`, `dimensions`.

### 3. Declare profiles

Adicione `"profiles": ["moveis"]` ao catálogo e use os campos `x-*` do profile nos produtos.

### 4. Adicione tabelas e condicionais

Use `LOOKUP` para preços matriciais e `when` para regras condicionais.

### 5. Adicione constraints e dependencies

Modele bloqueios de combinação e relações entre opções.

### 6. Ative múltiplas listas de preço

Use `price_lists` e `context` para varejo, B2B, etc.

### 7. Valide tudo

```bash
npm run validate:examples
```

---

## Resumo da arquitetura

```
┌─────────────────────────────────────────────────┐
│                DOCUMENTO CATALOG                 │
│                                                  │
│  catalog ─── id, name, price_lists               │
│  profiles ── ["moveis", "fiscal-br"]             │
│  context ─── region, channel, customer           │
│  product_refs ── referências a arquivos PRODUCT  │
│                                                  │
│  rulesets ────── regras de precificação          │
│    └─ rules ──── ADD, LOOKUP, MAX_OF, ...        │
│  tables ──────── tabelas matriciais              │
│  constraints ─── bloqueios de combinação         │
│  dependencies ── relações entre opções           │
│                                                  │
├─────────────────────────────────────────────────┤
│              DOCUMENTOS PRODUCT                  │
│                                                  │
│  product ─── id, sku, manufacturer, brand,       │
│              description, gtin, base_price,      │
│              images, weight, dimensions, tags     │
│    attributes ── eixos de variação               │
│    options ───── valores selecionáveis           │
│    sales_unit ── conversão de unidade            │
│    lot_policy ── controle de lote                │
│    x-* ───────── extensões de profile/livres     │
│                                                  │
├─────────────────────────────────────────────────┤
│             EXTENSION PROFILES                   │
│                                                  │
│  moveis ──────── x-finish, x-warranty_months     │
│  iluminacao ──── x-lumens, x-voltage, x-cri      │
│  pisos ───────── x-pei, x-slip_resistance        │
│  fiscal-br ───── x-ncm, x-origem, x-cest        │
└─────────────────────────────────────────────────┘
```

## Referências

- Spec normativa: `spec/latest/pacp.md`
- JSON Schema: `spec/latest/pacp.schema.json`
- Profiles: `spec/latest/profiles/`
- Exemplos oficiais: `spec/latest/examples/`
- Engine guide: `docs/pricing-engine.md`
- Import guide: `docs/import-guidelines.md`
- Design principles: `docs/design-principles.md`
