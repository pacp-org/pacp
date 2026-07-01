# PACP - Padrão Aberto de Catálogo e Precificação

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

PACP PACP define dois tipos de documento JSON válidos contra `spec/latest/pacp.schema.json`:

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
- Cada `option` DEVE referenciar o atributo via `attribute_id`.
- Cada `option` PODE declarar `images` (`array of image`) com as mesmas regras de `product.images`.
- Quando uma option possui `images`, consumidores DEVEM priorizar essas imagens sobre as de `product.images` para exibição contextual daquela variante.
- PACP descreve motor + dados; produtores de dados NÃO DEVE gerar combinações completas de variantes para obedecer ao padrão.

### 4.1 Lote por produto (`lot_policy`)

- Produto PODE declarar `lot_policy` para indicar política de controle de lote.
- Quando `lot_policy.required=true`, o lote DEVE ser informado no orçamento antes do cálculo.
- `lot_policy.source` DEVE definir origem do lote:
  - `CONTEXT`: lote vem de `context[lot_policy.context_key]`.
  - `ATTRIBUTE`: lote vem de seleção de atributo (`lot_policy.attribute_id`).
- Para `lot_policy.source=CONTEXT`, ausência do lote obrigatório DEVE bloquear a execução na fase de constraints.

### 4.2 Unidade solicitada e unidade vendável (`sales_unit`)

- Produto PODE declarar `sales_unit` para converter quantidade solicitada em unidade vendável.
- `sales_unit.requested_unit` DEVE definir a unidade de orçamento (ex.: `m2`, `L`, `kg`).
- `sales_unit.sell_unit` DEVE definir a unidade comercial vendável (ex.: `box`, `galao`, `saco`).
- `sales_unit.quantity_per_sell_unit` DEVE ser maior que zero e representa quanto da unidade solicitada cabe em 1 unidade vendável.
- `sales_unit.rounding` em PACP DEVE ser `CEIL`.
- `sales_unit.min_sell_units`, quando informado, DEVE ser respeitado como piso mínimo de venda.
- Quando o produto declarar `unit` e `sales_unit`, `sales_unit.requested_unit` DEVE ser igual a `product.unit` (ver seção 4.5).

### 4.3 Campos descritivos de produto

Em `PACP PACP`, `product` PODE incluir os campos descritivos abaixo. Todos são opcionais e NÃO DEVEM alterar semântica de cálculo de preço por si só.

**Identificação e classificação:**

- `sku` (`string`): código SKU do produto para integração com ERPs e sistemas de comércio.
- `gtin` (`string`, 8-14 dígitos): código de barras no padrão GS1 (EAN-8, EAN-13 ou GTIN-14).
- `category` (`array of path`): categorias hierárquicas do produto. Cada elemento é um **path** (array de strings) representando o caminho da raiz até a folha na árvore de categorias. Permite classificação múltipla e hierárquica. Exemplo: `[["Móveis Internos", "Sofá"], ["Promoções"]]`.
- `tags` (`array of string`): tags livres para busca e classificação.
- `collections` (`array of string`): identificadores de coleções às quais o produto pertence (ex.: `["verao_2026", "linha_premium"]`). Diferente de `tags`, coleção é um agrupamento **curatorial/sazonal** com identidade estável dentro do catálogo. Ver seção 4.7.

**Informações comerciais:**

- `manufacturer` (`string`): fabricante do produto.
- `brand` (`string`): marca comercial (pode diferir do fabricante).
- `description` (`string`): descrição legível do produto.

**Imagens:**

- `images` (`array of image`): referências a imagens do produto.
  - Cada `image` DEVE conter `url` (URI válida).
  - `image` PODE conter `label` (rótulo legível / legenda), `alt` (texto alternativo descritivo para acessibilidade), `position` (inteiro ≥ 0 para ordenação explícita) e `type` (enum: `MAIN`, `DETAIL`, `AMBIANCE`, `TECHNICAL`, `OTHER`).
  - Quando `position` estiver presente em imagens do mesmo conjunto (`product.images` ou `option.images`), consumidores DEVEM ordenar por `position` crescente; quando ausente em todas as imagens relevantes, a ordem do array prevalece.

**Dados físicos:**

- `weight` (`measure`): peso do produto. Objeto com `value` (número > 0) e `unit` (string, ex: `kg`).
- `dimensions` (`physical_dimensions`): dimensões do produto. Objeto com `unit` (obrigatório) e opcionais `width`, `height`, `depth` (números > 0).

Regras normativas:

- `id` continua sendo o identificador canônico para referências internas PACP.
- Quando `sku` existir, implementações PODEM usar para rastreabilidade e integração externa.
- Quando `category` existir, implementações PODEM usar para filtros, organização e regras condicionais via fatos de contexto/produto.
- Cada path em `category` é um array de segmentos da raiz à folha (ex.: `["Móveis Externos", "Sofá"]` = "Móveis Externos > Sofá"). Um path com um único segmento (ex.: `["Promoções"]`) representa uma categoria sem hierarquia.
- O primeiro path do array PODE ser tratado como categoria principal quando a implementação exigir distinção.
- Dois paths podem compartilhar o mesmo segmento folha sob ancestrais diferentes; a identidade da categoria é definida pelo path completo.
- Campos descritivos existem para que o catálogo PACP seja autocontido, sem exigir sistema PIM externo para dados universais de produto.

### 4.5 Visibilidade do produto (`visibility`)

- Produto PODE declarar `visibility` (`string`) para indicar se deve aparecer em catálogos públicos.
- Valores válidos:
  - `PUBLIC`: produto é exibível em vitrines, e-commerce e catálogos voltados ao cliente final. Este é o default quando `visibility` estiver ausente.
  - `INTERNAL`: produto existe no catálogo para uso em orçamentos, configuração e precificação, mas NÃO DEVE ser exibido em catálogos públicos.
- Quando `visibility` estiver ausente, consumidores DEVEM tratar o produto como `PUBLIC`.
- Consumidores que geram vitrines ou catálogos públicos DEVEM filtrar produtos com `visibility: "INTERNAL"`.
- Produtos `INTERNAL` continuam plenamente válidos para referência em rules, constraints, dependencies e cálculos de preço — a visibilidade afeta apenas exibição, não semântica de precificação.
- Caso de uso típico: componentes, insumos ou peças avulsas (parafusos, espumas, ferragens) que o orçamentista manipula mas que não fazem sentido como item de vitrine.

### 4.6 Unidade base do produto (`unit`)

- Produto PODE declarar `unit` (`string`) para indicar a unidade base na qual `base_price` é cotado.
- Exemplos de valores: `"un"`, `"m"`, `"m2"`, `"m3"`, `"L"`, `"kg"`, `"saca"`, `"arroba"`.
- Quando `unit` estiver ausente, motores e consumidores DEVEM assumir `"un"` (unidade genérica).
- `unit` é informacional e NÃO altera por si só a mecânica de cálculo do engine.
- Para exibição de preço, consumidores PODEM formatar como `"R$ {base_price} / {unit}"`.
- Para integração com ERPs e sistemas de comércio, `unit` PODE ser usado como unidade de medida padrão do cadastro de produto.
- Quando o produto declarar `unit` e `sales_unit` simultaneamente, `sales_unit.requested_unit` DEVE ser igual a `product.unit`. Validadores DEVEM reportar inconsistência caso divirjam.

### 4.7 Coleções (`collections`)

- Produto PODE declarar `collections` (`array of string`) para indicar coleções às quais pertence.
- Cada item DEVE ser um ID não-vazio (`minLength: 1`); itens DEVEM ser únicos no array (`uniqueItems`).
- IDs de coleção DEVEM seguir as regras gerais de IDs (seção 3): estáveis, case-sensitive e únicos por catálogo.
- Convenção recomendada: `snake_case` legível por humanos (ex.: `verao_2026`, `linha_premium`, `capsule_artisan`, `black_friday_2026`).
- Um produto PODE pertencer a múltiplas coleções simultaneamente (ex.: `["verao_2026", "linha_premium"]`); essa pluralidade é semântica esperada.
- `collections` é descritivo: NÃO altera por si só a mecânica de cálculo de preço. Implementações PODEM usar coleções para:
  - Filtros e organização em vitrines/catálogos.
  - Condições em `rules`, expostas como fato `product.collections` (operadores `IN` / `NOT_IN` aplicados ao array). Por exemplo, descontos de queima de coleção que disparam quando `product.collections` contém `colecao_inverno_2025`.
- Diferença em relação a `tags`:
  - `tags` são marcadores livres, sem garantia de estabilidade ou curadoria.
  - `collections` são agrupamentos curatoriais/sazonais com identidade estável; espera-se que o conjunto de coleções de um catálogo seja gerido como vocabulário controlado.
- Diferença em relação a `category`:
  - `category` representa a árvore taxonômica do catálogo (estrutura).
  - `collections` representa agrupamentos transversais (campanha, sazão, linha curatorial), ortogonais à categoria.
- Quando uma implementação mantiver metadados de coleção (rótulo legível, descrição, datas de vigência), esses dados PODEM viver em dicionários do catálogo (`dictionaries`) ou em sistemas externos, indexados pelo mesmo ID. PACP não normatiza estrutura desses metadados nesta versão.

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

### 4.4 Valores de atributos por produto (`attribute_values`)

Em `PACP PACP`, `product.attribute_values` PODE ser usado para declarar valores fixos de atributos no nível do produto.

- `attribute_values` é uma lista de pares atributo/valor.
- Cada item DEVE conter `attribute_id` e `value`.
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
5. Resolução de `supplied_materials` (fonte + quantidade); rulesets de `BASE` em diante PODEM ler fatos `supplied_materials.<id>.source`, `.quantity` e agregados `any`/`all`.
6. Inicialização do preço base.
7. Aplicação de rulesets de `BASE`.
8. Formação de subtotal.
9. Aplicação de rulesets de `SUBTOTAL`.
10. Formação de total.
11. Aplicação de rulesets de `TOTAL`.
12. Pós-processamento de arredondamento/limites (`ROUND`, `CAP`, `FLOOR`), quando configurado.

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

Em PACP, motores NÃO DEVE usar `FLOOR` ou arredondamento comercial para este cálculo.

### 5.3 Stacking e conflitos

- Regras habilitadas em um mesmo `target` DEVE ser ordenadas por:
  1. `priority` (maior primeiro).
  2. `id` em ordem lexicográfica crescente (desempate determinístico).
- Operações acumulativas (`ADD`, `PERCENT_OF`, `TAX`) DEVE compor resultado na ordem definida.
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
- `LOOKUP`: busca valor em `table_id` com base em dimensões de atributo/contexto.
- `MAX_OF`: seleciona o maior valor entre componentes.
- `MIN_OF`: seleciona o menor valor entre componentes.
- `PICK`: seleciona o primeiro componente elegível pela ordem declarada.
- `ROUND`: arredonda para precisão configurada.
- `CAP`: aplica teto máximo.
- `FLOOR`: aplica piso mínimo.
- `TAX`: soma percentual (`rate`) sobre uma base de incidência (`base`). `base="CURRENT"` (default) incide sobre o valor corrente na cadeia (mesmo comportamento acumulativo de `PERCENT_OF`); `base="BASE_PRICE"` incide sobre `product.base_price`, independente do valor já acumulado por regras anteriores.

Erros normativos:

- `LOOKUP` com chave ausente DEVE falhar com erro explícito, salvo fallback configurado.
- Operação sem parâmetros obrigatórios DEVE falhar em validação.
- Referência a `table_id` inexistente DEVE falhar em validação.
- `TAX` sem `rate` DEVE falhar em validação.

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
- Quando o produto tiver `lot_policy.required=true` e `source=CONTEXT`, o motor DEVE exigir `context[lot_policy.context_key]`.
- Quando o produto tiver `sales_unit`, o motor DEVE exigir `context.requested_quantity` e `context.requested_unit`.

### 9.1 Observações de catálogo (`notes` / `internal_notes`)

- `catalog` PODE declarar `notes` (`string`) e `internal_notes` (`string`). Ambos são opcionais e aceitam texto livre, multilinha.
- `notes` carrega observações **públicas** sobre o catálogo (ex.: vigência, escopo, instruções de uso para consumidores). Consumidores PODEM exibir em vitrines, documentação ou interfaces voltadas ao cliente final.
- `internal_notes` carrega anotações **não-públicas** (ex.: contexto operacional, decisões internas, ressalvas para a equipe comercial). Consumidores que geram vitrines, e-commerce ou catálogos voltados ao cliente final DEVEM omitir `internal_notes` da saída.
- Ambos os campos são informacionais e NÃO alteram a mecânica de cálculo do engine.
- Para anotações por produto, use `product.description` (público) ou extensões `x-*` (custom). PACP não padroniza notas internas por produto neste nível.

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

### Profiles oficiais PACP

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
- Conteúdo em `spec/latest/` DEVE ser imutável após release oficial.
- Mudanças incompatíveis DEVE ocorrer apenas em major futura (`2.0.0`).

### 11.1 URL canônica do schema

O JSON Schema oficial está disponível publicamente via CDN:

- **Latest:** `https://cdn.jsdelivr.net/npm/@pacp/spec@latest/dist/pacp.schema.json`
- **Versão fixa:** `https://cdn.jsdelivr.net/npm/@pacp/spec@{versao}/dist/pacp.schema.json`

Profiles oficiais seguem o padrão: `https://cdn.jsdelivr.net/npm/@pacp/spec@latest/dist/profiles/{id}.schema.json`

Implementações PODEM referenciar o schema via `$id` ou URL CDN para validação remota.

## 12. Segurança e integridade

- Assinatura digital e checksum PODEM ser adotados por implementações, mas estão fora do escopo normativo obrigatório desta versão.
- Validação contra schema e checks semânticos mínimos DEVE ser parte do pipeline de ingestão.

## 13. Exemplos oficiais

Os exemplos oficiais desta versão são:

- `spec/latest/examples/geral/minimal.json`
- `spec/latest/examples/iluminacao/matrix_lookup.json`
- `spec/latest/examples/moveis/max_of.json`
- `spec/latest/examples/tapetes/dependencies.json`
- `spec/latest/examples/geral/multi_price_list.json`
- `spec/latest/examples/geral/extensions.json`
- `spec/latest/examples/pisos-e-revestimentos/cost_plus.json`
- `spec/latest/examples/geral/unit_conversion_volume.json`
- `spec/latest/examples/geral/collections.json`

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
- `image`: referência a imagem com `url` obrigatória; `label`, `alt`, `position`, `type` opcionais.
- `measure`: objeto com valor numérico e unidade de medida.
- `physical_dimensions`: objeto com largura, altura, profundidade e unidade.
- `visibility`: nível de exposição do produto (`PUBLIC` ou `INTERNAL`); controla se o produto aparece em catálogos públicos.
- `collections`: lista de IDs de coleções (agrupamento curatorial/sazonal) às quais o produto pertence; campo descritivo, não altera cálculo por si só.
- `profile`: schema de extensão por vertical que padroniza campos `x-*`.
- `supplied_material`: insumo declarado em `product.supplied_materials[]` (ex.: tecido, couro), com quantidade necessária e regra de quem fornece.
- `source` (em supplied_material): valor `FACTORY` (fábrica fornece) ou `CUSTOMER` (cliente fornece) resolvido pelo engine no orçamento.
- `supplied_quantities`: lista no output do orçamento com os materiais que a fonte resolveu como `CUSTOMER`, indicando quantidade que o cliente precisa fornecer.
- `x-fabric_requirements`: subgrupo de `requirements` padronizado pelo profile `moveis` para descrever requisitos de tecido (gramatura, largura, composição, abrasão, inflamabilidade).

## 15. Conformidade PACP PACP

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
- [ ] Quando `visibility` é `INTERNAL`, consumidores de catálogo público filtram o produto.
- [ ] Quando `catalog.internal_notes` está presente, consumidores que geram catálogos públicos omitem o campo na saída.
- [ ] Quando `supplied_materials` é declarado, cada item segue regras da seção 4.8: `quantity` válido, `sourcing_attribute_id` (se presente) aponta para attribute existente e implica `source_when` com cobertura de todos os `option.value` do attribute.
- [ ] Quando `supplied_materials` é declarado, `base_price` representa o produto sem os materiais listados (custo via `factory_cost` por material).
- [ ] Permite e preserva extensões `x-*`.
- [ ] Quando declara `profiles`, usa IDs válidos de profiles oficiais ou customizados.
- [ ] Valida contra `spec/latest/pacp.schema.json`.
