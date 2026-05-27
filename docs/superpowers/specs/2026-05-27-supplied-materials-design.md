# Design — `supplied_materials`: insumos fornecidos pelo cliente

**Data:** 2026-05-27
**Autor:** Rafael D'Arrigo
**Status:** Design em brainstorm — não normativo ainda. Sem versão da spec atribuída.

## 1. Motivação

PACP modela produto + atributos + opções + rulesets + tabelas, mas hoje não tem como o produto declarar **insumos consumidos** e nem **quem fornece cada insumo** (a fábrica ou o cliente).

### Caso de uso disparador — móveis estofados

**Fábrica de estofados.** O sofá precisa de N m² de tecido pra ser feito. A fábrica oferece duas modalidades:
- Tecido próprio da fábrica (cliente escolhe tipo/cor de um catálogo de tecidos da fábrica). Preço = mão de obra + estrutura + tecido escolhido.
- Tecido fornecido pelo cliente (lojista manda o tecido). Preço = mão de obra + estrutura, sem custo de tecido. Mas a fábrica precisa informar quanto tecido o lojista tem que mandar.

**Loja AAA.** Compra sofás de várias fábricas, mas seus clientes finais querem tecidos premium importados. A loja mantém catálogo de tecidos próprio. Quando vende um sofá, escolhe um tecido do catálogo dela e manda fazer pela fábrica. Pra isso, precisa saber:
1. Quanto tecido enviar à fábrica (varia por modelo/configuração do sofá).
2. Quais requisitos o tecido tem que cumprir (gramatura mínima, largura mínima do rolo, etc.) — pra filtrar o que do catálogo dela serve.

### Generalização

Mesmo padrão aparece em outros casos:
- Couro fornecido pelo cliente em poltronas e estofados.
- Mármore/granito fornecido pelo cliente em mesas e bancadas.
- Vidro fornecido pelo cliente em estantes e portas.
- Análogos previsíveis em outras verticais (Pisos: rejunte premium fornecido pelo cliente; Iluminação: lâmpada premium fornecida pelo cliente).

**Decisão de escopo:** modelar genericamente "material fornecido pelo cliente", não específico de tecido. (Resposta direta do usuário na fase de brainstorm.)

## 2. Decisões já tomadas

| Decisão | Valor | Origem |
|---|---|---|
| Escopo | Genérico — qualquer insumo COM (customer-supplied material) | Resposta do usuário |
| Quantidade do insumo | Varia por configuração → suporta `value` fixo OU `table_id` (lookup PACP padrão) | Resposta do usuário |
| Escolha de quem fornece | Decisão em tempo de orçamento (PDV) via `attribute`/`option` PACP padrão | Resposta do usuário |
| Granularidade da escolha | Por material, com modo padrão do produto (`default_source`) | Resposta do usuário |
| Convenção de preço | `base_price` representa o produto SEM os materiais declarados em `supplied_materials`. Cada material declara seu `factory_cost`. Importadores precisam desentrelaçar planilhas "tudo incluso". | Proposta aprovada pelo usuário |

## 3. Modelo de dados (Seção 1 do brainstorm — aprovada)

### 3.1 Novo campo opcional em `product`

```json
"supplied_materials": [
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
      "x-min_weight_gsm": 380,
      "x-min_width_cm": 140,
      "x-allowed_compositions": ["LINHO", "ALGODAO", "VELUDO"]
    }
  }
]
```

### 3.2 Campos

| Campo | Obrigatório | Tipo | Significado |
|---|---|---|---|
| `id` | sim | `string` | Único por produto, estável. Segue regras gerais de IDs (seção 3 do PACP). |
| `material` | sim | `string` (SNAKE_UPPER) | Tipo do insumo (`TECIDO`, `COURO`, `VIDRO`, `MARMORE`, etc.). String livre. Catálogo PODE indexar via dicionário (`dictionaries`). |
| `quantity` | sim | objeto | `{ "value": N, "unit": U }` (fixo) OU `{ "table_id": ID, "unit": U }` (lookup PACP padrão — mesmas dimensões que tabelas de preço). |
| `default_source` | não | enum (`FACTORY` \| `CUSTOMER`) | Quem fornece quando não há escolha. Default: `FACTORY`. |
| `sourcing_attribute_id` | não | `string` (attribute_id) | Quando presente, aponta para `attribute` PACP cuja `option` escolhida controla a fonte. Ausente → sempre `default_source`. |
| `source_when` | obrigatório se `sourcing_attribute_id` presente | objeto `{factory: [string], customer: [string]}` | Normaliza valores das `options` para o modo. Permite cada fornecedor usar nomes próprios (`OWN`, `FABRICA`, `COM_TECIDO`...) sem mudar semântica. |
| `factory_cost` | não | objeto | Custo do material quando fonte=`FACTORY`. Aceita `{ "value": N }`, `{ "table_id": ID }` ou `{ "ruleset_id": ID }`. Ausente → engine não soma (custo já está em `base_price` ou em rulesets externos). |
| `requirements` | não | objeto | Bloco livre de requisitos do material (campos `x-*`). Útil pra loja filtrar tecido compatível do catálogo dela. |

### 3.3 Convenção normativa de `base_price`

Quando `supplied_materials` está presente, `base_price` DEVE representar o produto **sem** os materiais declarados. Cada material declara seu `factory_cost`.

Justificativa: a alternativa (engine descontar quando fonte=CUSTOMER) exige saber o "preço do material padrão" embutido em `base_price`, o que reabre toda a confusão de SKU explodido que a spec tenta evitar.

Importadores que recebem planilha com `base_price` "tudo incluso" precisam desentrelaçar antes da emissão.

## 4. Semântica do engine (Seção 2 do brainstorm — aprovada)

### 4.1 Resolução de cada `supplied_material`

**Passo 1 — Fonte (FACTORY ou CUSTOMER):**
- Se `sourcing_attribute_id` ausente → fonte = `default_source`.
- Se presente e há `option` selecionada para o attribute:
  - Procura o `value` da option em `source_when.factory` e `source_when.customer`. Primeiro match define a fonte.
  - Se não houver match → falha determinística com código `UNRESOLVED_MATERIAL_SOURCE`.
- Se presente mas sem `option` selecionada → fonte = `default_source`.

**Passo 2 — Quantidade:**
- `quantity.value` → usa direto.
- `quantity.table_id` → executa lookup PACP padrão (mesmas dimensões e fallback de tabelas de preço). Pode falhar com `LOOKUP_MISS` se a combinação de options não cobrir.

**Passo 3 — Preço:**
- Fonte=`FACTORY` e `factory_cost` presente → soma ao preço corrente. `value`/`table_id`/`ruleset_id` resolvem normalmente.
- Fonte=`FACTORY` e `factory_cost` ausente → engine não soma nada (custo já em `base_price` por convenção da seção 3.3).
- Fonte=`CUSTOMER` → engine não aplica `factory_cost`.

**Passo 4 — Output:**

Resultado do orçamento ganha campo novo `supplied_quantities[]`. Para cada `supplied_material` cuja fonte = `CUSTOMER`:

```json
"supplied_quantities": [
  {
    "material_id": "mat_tecido",
    "material": "TECIDO",
    "quantity": 18.5,
    "unit": "m2",
    "requirements": {
      "x-min_weight_gsm": 380,
      "x-min_width_cm": 140
    }
  }
]
```

Consumido pelo PDV (exibição ao vendedor) e por sistemas downstream (loja gera pedido de fornecimento à fábrica).

### 4.2 Ordem na pipeline de execução

Modificação da seção 5.2 do PACP. Inserir novo passo **entre 4 e 5**:

1. Validação estrutural.
2. Constraints e dependencies.
3. Validação de lote e quantidade solicitada.
4. Normalização de `sales_unit`.
5. **NOVO: Resolução de `supplied_materials` (fonte + quantidade).**
6. Inicialização do `base_price`.
7. Rulesets de `BASE` (podem ler fonte e quantidade resolvidas via fatos `supplied_materials.<id>.source`, `.quantity`, e agregados `any`/`all` — ver seção 5.4).
8. Subtotal → rulesets de `SUBTOTAL` → total → rulesets de `TOTAL` → arredondamento.

Razão: rulesets podem depender da fonte resolvida (ex.: "desconto 5% quando todos os materiais vêm do cliente"), então fonte precisa estar resolvida antes de qualquer ruleset rodar.

### 4.3 Erros normativos novos

- `UNRESOLVED_MATERIAL_SOURCE` — `option` selecionada não mapeada em `source_when`.
- `LOOKUP_MISS` em `quantity.table_id` ou `factory_cost.table_id` — sem fallback configurado.
- `MISSING_SOURCING_ATTRIBUTE` — `sourcing_attribute_id` aponta para attribute inexistente.
- `INVALID_SOURCE_WHEN` — `sourcing_attribute_id` presente mas `source_when` ausente.

## 5. Decisões de detalhe (resolvidas em brainstorm continuado)

### 5.1 ~~Integração com `sales_unit`~~ — DECIDIDO

**Decisão:** fora de escopo no MVP.

`supplied_materials` entrega a quantidade necessária na unidade do insumo (ex: 18,5 m² de tecido). O arredondamento para unidades comercializáveis do material (rolo fechado de tecido, chapa fechada de mármore) é responsabilidade do consumidor (sistema da loja, que conhece o catálogo de rolos/chapas dela).

Razão: o `sales_unit` do PACP modela "produto sendo vendido". Um insumo consumido pelo produto sendo vendido tem dinâmica diferente (catálogo é externo). Misturar reabriria ambiguidade.

Se necessário no futuro: feature aditiva (`pack_hint` opcional na linha do material), sem quebrar nada.

### 5.2 ~~Múltiplas opções de quem fornece~~ — DECIDIDO

**Decisão:** `source` é binário (`FACTORY` | `CUSTOMER`) no MVP.

Significado normativo: `source` responde "quem fornece **fisicamente** o material para a fábrica produzir o item". Casos como "tecido vem do parceiro X da fábrica" são `FACTORY` (a fábrica responde comercialmente pelo fornecimento — interno dela é como ela arranja o material). Modelados via attribute extra (`fornecedor_parceiro` com options A, B, C) que altera `factory_cost` por lookup.

Caso surja necessidade real de terceiro tipo de source, abre-se em MAJOR futura.

### 5.3 ~~Validação de `requirements`~~ — DECIDIDO

**Decisão:** padronizar agora no profile `moveis`, escopo limitado a tecido.

Bloco `requirements` continua sendo `x-*` livre no core. Profile `moveis` adiciona schema opcional para o subgrupo `x-fabric_requirements`:

```json
"requirements": {
  "x-fabric_requirements": {
    "min_weight_gsm": 380,
    "max_weight_gsm": 700,
    "min_width_cm": 140,
    "allowed_compositions": ["LINHO", "ALGODAO", "VELUDO", "POLIESTER"],
    "abrasion_min_cycles_martindale": 30000,
    "flammability_standard": "NBR_15805"
  }
}
```

| Campo | Tipo | Significado |
|---|---|---|
| `min_weight_gsm` | number | Gramatura mínima (g/m²). |
| `max_weight_gsm` | number | Gramatura máxima (g/m²). Acima da máxima compromete estrutura/máquina. |
| `min_width_cm` | number | Largura mínima do rolo (cm). |
| `allowed_compositions` | array string | Composições aceitas (uppercase). |
| `abrasion_min_cycles_martindale` | number | Resistência mínima à abrasão (ciclos Martindale). |
| `flammability_standard` | string | Norma de inflamabilidade exigida. |

Outros materiais (couro, mármore, vidro) ficam com `x-*` livres até demanda concreta surgir. Quando aparecer, vira RFC separada que estende `moveis` ou cria sub-profiles (`moveis-couro`, etc.).

Profile `moveis` continua `additionalProperties: true` — campos não listados não bloqueiam.

### 5.4 ~~Constraints sobre `supplied_materials`~~ — DECIDIDO

**Decisão:** expor `supplied_materials` como fatos em rules e constraints, por ID + agregados `any`/`all`.

Fatos disponíveis em condições `when` de rulesets e constraints:

| Fato | Tipo | Operadores |
|---|---|---|
| `supplied_materials.<id>.source` | enum (`FACTORY`\|`CUSTOMER`) | `==`, `!=`, `IN`, `NOT_IN` |
| `supplied_materials.<id>.quantity` | número | `==`, `!=`, `<`, `<=`, `>`, `>=`, `BETWEEN` |
| `supplied_materials.any.source` | enum agregado | `==` (verdadeiro se PELO MENOS UM material tem essa fonte) |
| `supplied_materials.all.source` | enum agregado | `==` (verdadeiro se TODOS os materiais têm essa fonte) |

Casos de uso destravados:
- **Desconto:** `when: supplied_materials.all.source == "CUSTOMER"` → `PERCENT_OF -5%`.
- **Constraint:** `DENY when supplied_materials.mat_tecido.source == "CUSTOMER" AND option.cor == "NOGUEIRA"`.
- **Frete:** `when: supplied_materials.mat_tecido.source == "CUSTOMER" AND supplied_materials.mat_tecido.quantity > 20` → `ADD 150`.

Validador DEVE garantir referência válida (`<id>` existe em `supplied_materials`).

### 5.5 ~~Mudanças no JSON Schema oficial~~ — DECIDIDO

**Decisão:** seguir padrão do projeto — schema cobre forma/tipo, validador CLI cobre referências cruzadas.

**`pacp.schema.json`:**
- Adicionar `$defs.supplied_material` com forma estrutural (campos, tipos, enums).
- Adicionar `$defs.supplied_material_quantity` (oneOf `{value,unit}` | `{table_id,unit}`).
- Adicionar `$defs.supplied_material_cost` (oneOf `{value}` | `{table_id}` | `{ruleset_id}`).
- Adicionar `$defs.source_when` (`{factory: [string], customer: [string]}` com `minItems: 1` em cada).
- Adicionar propriedade `supplied_materials: array of $defs.supplied_material` em `product`.
- JSON Schema 2020-12 cobre: tipos, enums, `oneOf`/`anyOf`, obrigatoriedade condicional simples (`if/then`).
- JSON Schema NÃO cobre referências cruzadas; ficam no validador CLI.

**Validador CLI (`tools/validator/`):**
- `sourcing_attribute_id` aponta para `attribute` existente no produto.
- `source_when` presente sempre que `sourcing_attribute_id` presente.
- Todo `option.value` de `sourcing_attribute_id` está mapeado em `source_when.factory` OU `source_when.customer` (ou um warning caso sobrar).
- `quantity.table_id` e `factory_cost.table_id` apontam para tabelas existentes (escopo catálogo+produto).
- Fatos `supplied_materials.<id>.*` em `when` de rules/constraints: `<id>` existe no produto referenciado.

**Profile móveis (`profiles/moveis.schema.json`):**
- Adicionar definição de `x-fabric_requirements` (ver 5.3) como `$defs` reusável.

**Tipos TypeScript (`packages/pacp/src/`):**
- Exportar `SuppliedMaterial`, `SuppliedMaterialQuantity`, `SuppliedMaterialCost`, `SourceWhen`, `SupplyOutput` (output do orçamento).

### 5.6 ~~Versão da spec~~ — DECIDIDO

**Decisão:** bump MINOR. Próxima release: `@pacp/spec@3.4.0`.

Razão: mudança puramente aditiva. Catálogos sem `supplied_materials` continuam válidos sem alteração. Consumidores que não consomem `supplied_quantities` no output continuam funcionando. Consistente com 3.1.0 (imagens), 3.2.0 (visibility), 3.3.0 (collections).

CHANGELOG.md ganha entrada `## [3.4.0]` na publicação.

### 5.7 ~~Exemplo oficial~~ — DECIDIDO

**Decisão:** adicionar exemplo dedicado, validado no CI.

Arquivos:
- `spec/latest/examples/supplied_materials.json` — manifesto CATALOG.
- `spec/latest/examples/products/prod_sofa_modular.json` — produto que exercita `supplied_materials` (estrutura do esboço da seção 6).
- Tabelas auxiliares: `tbl_tecido_qty_por_lugares` (por `lugares`) e `tbl_tecido_preco_por_tipo` (por `tecido_tipo`).

CI: `npm run validate:examples` DEVE passar incluindo o novo exemplo.

Exemplos existentes (`prod_sofa.json`) NÃO ganham `supplied_materials` automaticamente — só o exemplo novo. Manter sinais separados pra leitor.

## 6. Esboço de exemplo (não normativo ainda)

```json
{
  "document_type": "PRODUCT",
  "catalog_id": "cat_estofados_2026",
  "product": {
    "id": "prod_sofa_modular",
    "name": "Sofá Modular Retrátil",
    "sku": "SOF-MOD-RET",
    "base_price": 4200,
    "category": [["Móveis", "Estofados", "Sofá"]],

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
          "x-min_weight_gsm": 380,
          "x-min_width_cm": 140
        }
      }
    ],

    "ruleset_ids": ["rs_base"]
  }
}
```

Tabela `tbl_tecido_qty_por_lugares` lookupa por `lugares` → `{ "3_LUGARES": 15.0, "4_LUGARES": 22.0 }`.
Tabela `tbl_tecido_preco_por_tipo` lookupa por `tecido_tipo` (só relevante quando fonte=FACTORY) → `{ "LINHO": 800, "VELUDO": 1200 }`.

### Cenário A — Loja revende sofá 3 lugares, cliente final quer tecido importado da loja

Orçamento: `lugares=3_LUGARES`, `modo_tecido=EU_FORNECO`.

Engine resolve:
- `mat_tecido.source` = `CUSTOMER` (`EU_FORNECO` está em `source_when.customer`).
- `mat_tecido.quantity` = 15 m² (lookup em `tbl_tecido_qty_por_lugares`).
- `factory_cost` ignorado.
- `total` = 4200 (só base, sem `factory_cost`).
- `supplied_quantities` = `[{ material: "TECIDO", quantity: 15, unit: "m2", requirements: {...} }]`.

PDV da loja exibe: "Fornecer 15 m² de tecido, gramatura ≥ 380 g/m², largura ≥ 140 cm." Sistema da loja gera pedido de fornecimento à fábrica.

### Cenário B — Fábrica vende direto, tecido próprio veludo, 4 lugares

Orçamento: `lugares=4_LUGARES`, `modo_tecido=FABRICA`, `tecido_tipo=VELUDO`.

Engine resolve:
- `source` = `FACTORY`.
- `quantity` = 22 m² (resolvido mas não vai pro output `supplied_quantities`).
- `factory_cost` = 1200 (lookup VELUDO).
- `total` = 4200 + 1200 = 5400.
- `supplied_quantities` = `[]`.

## 7. Mudanças necessárias na spec PACP

| Arquivo | Mudança |
|---|---|
| `spec/latest/pacp.md` | Nova seção 4.8 "Materiais fornecidos (`supplied_materials`)". Modificar seção 5.2 (ordem normativa) para incluir passo de resolução. Adicionar entradas no glossário (seção 14). Atualizar conformidade (seção 15). |
| `spec/latest/pacp.schema.json` | Adicionar `$defs.supplied_material`. Adicionar `supplied_materials` em `product`. |
| `tools/validator/` | Validações cruzadas: `sourcing_attribute_id` ↔ `source_when`, `attribute_id` existe, `table_id` existe, `option.value` cobre `source_when`. |
| `packages/pacp/src/` | Atualizar tipos TypeScript exportados. |
| `spec/latest/examples/moveis/` | Adicionar exemplo oficial. |
| `docs/integration-guide.md` | Documentar feature pra integradores. |
| `docs/import-guidelines.md` | Documentar mapeamento de planilha → `supplied_materials`. |
| `docs/pricing-engine.md` | Documentar novo passo de pipeline. |
| `spec/latest/profiles/moveis.schema.json` | (pendente — ver 5.3) Padronizar `x-min_weight_gsm`, `x-min_width_cm`, `x-allowed_compositions` em `requirements`. |

## 8. Próximos passos

1. Validar design com fornecedor real (pegar planilha de 1 fábrica de estofados, ver se mapeia limpo). Opcional mas recomendado antes do plano.
2. Plano de implementação (via `superpowers:writing-plans`) cobrindo: spec.md, schema, validador, tipos npm, profile móveis, exemplo, docs (integração/import/engine), CHANGELOG.
3. Release `@pacp/spec@3.4.0`.
