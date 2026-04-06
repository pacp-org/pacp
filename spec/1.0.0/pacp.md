# PACP v1.0.0 - Padrão Aberto de Catálogo e Precificação

## 1. Introdução

### 1.1 O que é PACP

PACP (Padrão Aberto de Catálogo e Precificação) define um contrato de dados e regras para modelar catálogos de produtos e calcular preços de forma determinística.

### 1.2 Objetivos

- Padronizar estruturas para produtos, atributos, opções, tabelas e regras.
- Permitir importação de dados oriundos de planilhas sem perda de semântica.
- Garantir que a mesma entrada gere o mesmo resultado de cálculo.
- Separar validação de combinatória (constraints/dependencies) da fase de cálculo.

### 1.3 O que não é PACP

- PACP NÃO DEVE definir arquitetura interna de sistemas (DB, filas, microsserviços).
- PACP NÃO DEVE exigir expansão massiva de SKUs.
- PACP NÃO DEVE impor interface de usuário específica.

## 2. Modelo de dados (visão geral)

PACP v1.0.0 define dois tipos de documento JSON válidos contra `spec/1.0.0/pacp.schema.json`:

- `document_type=CATALOG`: manifesto do catálogo.
- `document_type=PRODUCT`: definição isolada de um produto.

Um manifesto `CATALOG` DEVE conter, no mínimo:

- `spec`: versão da spec (`1.0.0`).
- `catalog`: metadados do catálogo e listas de preço.
- `product_refs`: referências para arquivos de produto.
- `rulesets`: regras de precificação.

Um documento `PRODUCT` DEVE conter, no mínimo:

- `spec`: versão da spec (`1.0.0`).
- `catalog_id`: ID do catálogo ao qual pertence.
- `product`: produto único e suas opções.

Documentos `CATALOG` PODEM conter `tables`, `dependencies`, `constraints`, `context`, `pricing`, `dictionaries`, `profiles` e extensões `x-*`. Documentos `PRODUCT` PODEM conter `rulesets`, `tables`, `constraints`, `dependencies`, `profiles` e extensões `x-*`.

## 3. Dicionários e IDs

- IDs DEVE ser estáveis, únicos por coleção e case-sensitive.
- IDs NÃO DEVE conter significado transitório (ex.: timestamp de import).
- Referências por ID DEVE apontar para elementos existentes.
- Campos `label` e descrições PODEM ser alterados sem quebrar compatibilidade, desde que IDs permaneçam estáveis.

## 4. Produtos

- Cada produto DEVE existir em um arquivo próprio com `document_type=PRODUCT`.
- Manifestos `CATALOG` DEVEM referenciar produtos por `product_refs[]`, incluindo `id` e `path`.
- `product_refs[].path` DEVE ser resolvido de forma determinística a partir do diretório do manifesto.
- Produtos PODEM declarar `attributes[]` (atributos disponíveis) e `options[]` (valores selecionáveis).
- Cada `option` DEVE referenciar o atributo via `attributeId`.
- PACP descreve motor + dados; produtores de dados NÃO DEVE gerar combinações completas de variantes para obedecer ao padrão.

### 4.1 Lote por produto (`lot_policy`)

- Produto PODE declarar `lot_policy` para indicar política de controle de lote.
- Quando `lot_policy.required=true`, o lote DEVE ser informado no orçamento antes do cálculo.
- `lot_policy.source` DEVE definir origem do lote:
  - `CONTEXT`: lote vem de `context[lot_policy.contextKey]`.
  - `ATTRIBUTE`: lote vem de seleção de atributo (`lot_policy.attributeId`).
- Para `lot_policy.source=CONTEXT`, ausência do lote obrigatório DEVE bloquear a execução na fase de constraints.

### 4.2 Unidade solicitada e unidade vendável (`sales_unit`)

- Produto PODE declarar `sales_unit` para converter quantidade solicitada em unidade vendável.
- `sales_unit.requested_unit` DEVE definir a unidade de orçamento (ex.: `m2`, `L`, `kg`).
- `sales_unit.sell_unit` DEVE definir a unidade comercial vendável (ex.: `box`, `galao`, `saco`).
- `sales_unit.quantity_per_sell_unit` DEVE ser maior que zero e representa quanto da unidade solicitada cabe em 1 unidade vendável.
- `sales_unit.rounding` em v1.0.0 DEVE ser `CEIL`.
- `sales_unit.min_sell_units`, quando informado, DEVE ser respeitado como piso mínimo de venda.
- Quando o produto declarar `unit` e `sales_unit`, `sales_unit.requested_unit` DEVE ser igual a `product.unit` (ver seção 4.5).

### 4.3 Campos descritivos de produto

Em `PACP v1.0.0`, `product` PODE incluir os campos descritivos abaixo. Todos são opcionais e NÃO DEVEM alterar semântica de cálculo de preço por si só.

**Identificação e classificação:**

- `sku` (`string`): código SKU do produto para integração com ERPs e sistemas de comércio.
- `gtin` (`string`, 8-14 dígitos): código de barras no padrão GS1 (EAN-8, EAN-13 ou GTIN-14).
- `category` (`string`): categoria textual principal do produto.
- `tags` (`array of string`): tags livres para busca e classificação.

**Informações comerciais:**

- `manufacturer` (`string`): fabricante do produto.
- `brand` (`string`): marca comercial (pode diferir do fabricante).
- `description` (`string`): descrição legível do produto.

**Imagens:**

- `images` (`array of imageRef`): referências a imagens do produto.
  - Cada `imageRef` DEVE conter `url` (URI válida).
  - `imageRef` PODE conter `label` (rótulo legível) e `type` (enum: `MAIN`, `DETAIL`, `AMBIANCE`, `TECHNICAL`, `OTHER`).

**Dados físicos:**

- `weight` (`measure`): peso do produto. Objeto com `value` (número > 0) e `unit` (string, ex: `kg`).
- `dimensions` (`dimensionsObj`): dimensões do produto. Objeto com `unit` (obrigatório) e opcionais `width`, `height`, `depth` (números > 0).

Regras normativas:

- `id` continua sendo o identificador canônico para referências internas PACP.
- Quando `sku` existir, implementações PODEM usar para rastreabilidade e integração externa.
- Quando `category` existir, implementações PODEM usar para filtros, organização e regras condicionais via fatos de contexto/produto.
- Campos descritivos existem para que o catálogo PACP seja autocontido, sem exigir sistema PIM externo para dados universais de produto.

### 4.5 Unidade base do produto (`unit`)

- Produto PODE declarar `unit` (`string`) para indicar a unidade base na qual `base_price` é cotado.
- Exemplos de valores: `"un"`, `"m"`, `"m2"`, `"m3"`, `"L"`, `"kg"`, `"saca"`, `"arroba"`.
- Quando `unit` estiver ausente, motores e consumidores DEVEM assumir `"un"` (unidade genérica).
- `unit` é informacional e NÃO altera por si só a mecânica de cálculo do engine.
- Para exibição de preço, consumidores PODEM formatar como `"R$ {base_price} / {unit}"`.
- Para integração com ERPs e sistemas de comércio, `unit` PODE ser usado como unidade de medida padrão do cadastro de produto.
- Quando o produto declarar `unit` e `sales_unit` simultaneamente, `sales_unit.requested_unit` DEVE ser igual a `product.unit`. Validadores DEVEM reportar inconsistência caso divirjam.

### 4.4 Valores de atributos por produto (`attribute_values`)

Em `PACP v1.0.0`, `product.attribute_values` PODE ser usado para declarar valores fixos de atributos no nível do produto.

- `attribute_values` é uma lista de pares atributo/valor.
- Cada item DEVE conter `attributeId` e `value`.
- `value` aceita tipos escalares (`string`, `number`, `boolean`).
- `attribute_values` NÃO substitui `options`; é complementar.
- `options` continua sendo o mecanismo para escolhas configuráveis no orçamento.

## 5. Precificação

### 5.1 Targets

As regras DEVE atuar em um alvo (`target`) definido no ruleset:

- `BASE`: atua no preço base.
- `SUBTOTAL`: atua após cálculo de base e antes de totalização final.
- `TOTAL`: atua no valor total.

### 5.2 Ordem normativa de execução

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

Se qualquer constraint bloquear a entrada, o motor DEVE interromper o cálculo e retornar bloqueio determinístico.

### 5.5 Cálculo normativo de quantidade mínima vendável

Quando `sales_unit` estiver configurado para um produto, o motor DEVE:

1. Ler `context.requested_quantity` e `context.requested_unit`.
2. Validar que `context.requested_unit` é igual a `sales_unit.requested_unit`.
3. Calcular:

`required_sell_units = CEIL(context.requested_quantity / sales_unit.quantity_per_sell_unit)`

4. Quando `sales_unit.min_sell_units` existir, aplicar:

`required_sell_units = MAX(required_sell_units, sales_unit.min_sell_units)`

5. Usar `required_sell_units` como quantidade mínima vendável determinística para o orçamento.

Em v1.0.0, motores NÃO DEVE usar `FLOOR` ou arredondamento comercial para este cálculo.

### 5.3 Stacking e conflitos

- Regras habilitadas em um mesmo `target` DEVE ser ordenadas por:
  1. `priority` (maior primeiro).
  2. `id` em ordem lexicográfica crescente (desempate determinístico).
- Operações acumulativas (`ADD`, `PERCENT_OF`) DEVE compor resultado na ordem definida.
- Operações de substituição (`OVERRIDE`, `PICK`) DEVE substituir o valor corrente quando a condição for verdadeira.
- Em conflito de múltiplos `OVERRIDE` verdadeiros no mesmo passo, prevalece a regra vencedora pela ordenação acima.

### 5.4 Defaults normativos

- `priority` ausente DEVE ser tratado como `0`.
- `enabled` ausente DEVE ser tratado como `true`.
- `when` ausente DEVE ser tratado como sempre verdadeiro.
- `context.price_list_id` ausente DEVE usar `catalog.default_price_list_id`, se definido.

## 6. Operações do engine

As operações abaixo são normativas:

- `ADD`: soma `value` ao alvo corrente.
- `PERCENT_OF`: soma percentual (`percent`) sobre o alvo corrente.
- `OVERRIDE`: substitui alvo corrente por `value`.
- `LOOKUP`: busca valor em `tableId` com base em dimensões de atributo/contexto.
- `MAX_OF`: seleciona o maior valor entre componentes.
- `MIN_OF`: seleciona o menor valor entre componentes.
- `PICK`: seleciona o primeiro componente elegível pela ordem declarada.
- `ROUND`: arredonda para precisão configurada.
- `CAP`: aplica teto máximo.
- `FLOOR`: aplica piso mínimo.

Erros normativos:

- `LOOKUP` com chave ausente DEVE falhar com erro explícito, salvo fallback configurado.
- Operação sem parâmetros obrigatórios DEVE falhar em validação.
- Referência a `tableId` inexistente DEVE falhar em validação.

## 7. Tabelas de preço (`tables`)

- Uma tabela DEVE ter `id`, `type`, `dimensions` e `rows`.
- Em `LOOKUP`, cada dimensão DEVE declarar origem (`ATTRIBUTE`, `CONTEXT` ou `LITERAL`).
- O motor DEVE construir chave de busca determinística a partir das dimensões na ordem declarada.
- Quando não houver célula correspondente, a execução DEVE seguir política definida (`fallback`) ou falhar.

## 8. Dependências e constraints

### 8.1 Dependencies

Dependencies modelam relações entre opções, por exemplo:

- `REQUIRES`: opção A exige opção B.
- `IMPLIES`: seleção de A implica ativação/aceitação de B.
- `AVAILABLE_OPTIONS_WHEN`: lista opções habilitadas sob condição.

### 8.2 Constraints

Constraints representam bloqueio duro de combinação:

- `DENY`: se condição for verdadeira, o cálculo NÃO DEVE continuar.

Dependencies e constraints DEVE ser avaliadas antes do cálculo de preço.
Validações de lote obrigatório e unidade solicitada incompatível com `sales_unit` DEVE ocorrer nesta mesma fase de bloqueio.

## 9. Price Lists e Context

- `catalog.price_lists[]` DEVE permitir múltiplas listas (ex.: varejo, atacado, B2B).
- `context` PODE incluir `price_list_id`, `region`, `channel`, `customer`, `lot_id`, `requested_quantity`, `requested_unit`.
- Quando `context.price_list_id` existir, o motor DEVE usar essa lista.
- Quando não existir, o motor DEVE aplicar fallback determinístico (`default_price_list_id` ou lista padrão definida pelo catálogo).
- Quando o produto tiver `lot_policy.required=true` e `source=CONTEXT`, o motor DEVE exigir `context[lot_policy.contextKey]`.
- Quando o produto tiver `sales_unit`, o motor DEVE exigir `context.requested_quantity` e `context.requested_unit`.

## 10. Extensibilidade (`x-*`)

- Qualquer objeto PACP PODE incluir propriedades `x-*`.
- Consumidores PACP DEVE ignorar `x-*` desconhecidas sem falhar.
- Extensões NÃO DEVE alterar semântica obrigatória dos campos normativos.

## 10.1 Extension Profiles

Extension profiles permitem padronizar campos `x-*` por vertical de mercado, oferecendo um contrato formal e validável para extensões.

### Declaração

Documentos `CATALOG` e `PRODUCT` PODEM declarar `profiles`, um array de strings com IDs de profiles ativos:

```json
{
  "profiles": ["moveis", "fiscal-br"]
}
```

### Profiles oficiais v1.0.0

| Profile ID | Arquivo | Vertical |
|------------|---------|----------|
| `moveis` | `profiles/moveis.schema.json` | Móveis e Alta Decoração |
| `iluminacao` | `profiles/iluminacao.schema.json` | Iluminação |
| `pisos-revestimentos` | `profiles/pisos-revestimentos.schema.json` | Pisos e Revestimentos |
| `fiscal-br` | `profiles/fiscal-br.schema.json` | Dados Fiscais Brasil |

### Semântica

- Profiles são **aditivos**: adicionam campos `x-*` recomendados ao produto, sem restringir campos existentes.
- Profiles são **opcionais**: a ausência de `profiles` NÃO invalida o documento.
- Um documento PODE declarar múltiplos profiles (ex: `["pisos-revestimentos", "fiscal-br"]`).
- Cada profile é um JSON Schema independente que define propriedades `x-*` com tipos, patterns e descrições.
- Validadores PODEM carregar os schemas de profile declarados para validação adicional.

### Criação de profiles customizados

Organizações PODEM criar profiles próprios seguindo as regras:

- O profile DEVE ser um JSON Schema válido (draft 2020-12).
- Todas as propriedades definidas DEVEM usar prefixo `x-`.
- O profile NÃO DEVE redefinir ou restringir campos core do PACP.
- O profile DEVE usar `"additionalProperties": true` para não bloquear outros campos.

## 11. Versionamento e compatibilidade

- PACP usa SemVer para a spec.
- Conteúdo em `spec/1.0.0/` DEVE ser imutável após release oficial.
- Mudanças incompatíveis DEVE ocorrer apenas em major futura (`2.0.0`).

## 12. Segurança e integridade

- Assinatura digital e checksum PODEM ser adotados por implementações, mas estão fora do escopo normativo obrigatório desta versão.
- Validação contra schema e checks semânticos mínimos DEVE ser parte do pipeline de ingestão.

## 13. Exemplos oficiais

Os exemplos oficiais desta versão são:

- `spec/1.0.0/examples/geral/minimal.json`
- `spec/1.0.0/examples/iluminacao/matrix_lookup.json`
- `spec/1.0.0/examples/moveis/max_of.json`
- `spec/1.0.0/examples/tapetes/dependencies.json`
- `spec/1.0.0/examples/geral/multi_price_list.json`
- `spec/1.0.0/examples/geral/extensions.json`
- `spec/1.0.0/examples/pisos-e-revestimentos/cost_plus.json`
- `spec/1.0.0/examples/geral/unit_conversion_volume.json`

Cada manifesto acima referencia seus produtos em subpastas `products/`, com um arquivo JSON por produto.

## 14. Glossário

- `ruleset`: conjunto de regras aplicadas sobre um `target`.
- `target`: estágio/valor da precificação (`BASE`, `SUBTOTAL`, `TOTAL`).
- `manifesto CATALOG`: documento principal com regras globais e referências de produto.
- `documento PRODUCT`: documento unitário com um único produto referenciável.
- `context`: dados externos de execução (região, canal, cliente, lista de preço).
- `lot_policy`: política de lote no nível de produto.
- `sales_unit`: política de conversão de unidade solicitada para unidade vendável.
- `requested_quantity`: quantidade informada no orçamento na unidade solicitada.
- `required_sell_units`: quantidade mínima vendável calculada com `CEIL`.
- `constraint`: bloqueio de combinação.
- `dependency`: relacionamento lógico entre opções.
- `unit`: unidade base do produto na qual `base_price` é cotado (default implícito: `"un"`).
- `sku`: código identificador do produto no sistema comercial/ERP.
- `gtin`: código de barras global (EAN/GTIN) no padrão GS1.
- `imageRef`: referência a imagem com URL, tipo e rótulo opcional.
- `measure`: objeto com valor numérico e unidade de medida.
- `dimensionsObj`: objeto com largura, altura, profundidade e unidade.
- `profile`: schema de extensão por vertical que padroniza campos `x-*`.

## 15. Conformidade PACP v1.0.0

Um arquivo é PACP compliant quando:

- [ ] Declara `spec` compatível com `1.0.0`.
- [ ] Possui `catalog.id` e IDs únicos por coleção.
- [ ] Usa `document_type` válido (`CATALOG` ou `PRODUCT`).
- [ ] Em `CATALOG`, define `product_refs` e paths resolvíveis.
- [ ] Em `PRODUCT`, define exatamente um `product` com `id` e `options` sem ambiguidade.
- [ ] Declara `rulesets` com `target` válido.
- [ ] Separa constraints/dependencies da fase de cálculo.
- [ ] Define política de lote obrigatório quando aplicável (`lot_policy`).
- [ ] Define conversão para unidade vendável quando aplicável (`sales_unit` + `CEIL`).
- [ ] Define ordem de aplicação e desempate determinístico.
- [ ] Suporta `price_lists` e `context` quando usados.
- [ ] Quando `unit` e `sales_unit` coexistem, `sales_unit.requested_unit` é igual a `product.unit`.
- [ ] Permite e preserva extensões `x-*`.
- [ ] Quando declara `profiles`, usa IDs válidos de profiles oficiais ou customizados.
- [ ] Valida contra `spec/1.0.0/pacp.schema.json`.
