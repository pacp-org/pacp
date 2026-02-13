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

Um documento PACP v1.0.0 DEVE ser um JSON válido contra `spec/1.0.0/pacp.schema.json` e DEVE conter, no mínimo:

- `spec`: versão da spec (`1.0.0`).
- `catalog`: metadados do catálogo e listas de preço.
- `products`: produtos e suas opções.
- `rulesets`: regras de precificação.

O documento PODE conter `tables`, `dependencies`, `constraints`, `context`, `pricing`, `dictionaries` e extensões `x-*`.

## 3. Dicionários e IDs

- IDs DEVE ser estáveis, únicos por coleção e case-sensitive.
- IDs NÃO DEVE conter significado transitório (ex.: timestamp de import).
- Referências por ID DEVE apontar para elementos existentes.
- Campos `label` e descrições PODEM ser alterados sem quebrar compatibilidade, desde que IDs permaneçam estáveis.

## 4. Produtos

- `products[]` DEVE conter produtos com `id`.
- Produtos PODEM declarar `attributes[]` (atributos disponíveis) e `options[]` (valores selecionáveis).
- Cada `option` DEVE referenciar o atributo via `attributeId`.
- PACP descreve motor + dados; produtores de dados NÃO DEVE gerar combinações completas de variantes para obedecer ao padrão.

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
3. Inicialização do preço base.
4. Aplicação de rulesets de `BASE`.
5. Formação de subtotal.
6. Aplicação de rulesets de `SUBTOTAL`.
7. Formação de total.
8. Aplicação de rulesets de `TOTAL`.
9. Pós-processamento de arredondamento/limites (`ROUND`, `CAP`, `FLOOR`), quando configurado.

Se qualquer constraint bloquear a entrada, o motor DEVE interromper o cálculo e retornar bloqueio determinístico.

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

## 9. Price Lists e Context

- `catalog.price_lists[]` DEVE permitir múltiplas listas (ex.: varejo, atacado, B2B).
- `context` PODE incluir `price_list_id`, `region`, `channel`, `customer`.
- Quando `context.price_list_id` existir, o motor DEVE usar essa lista.
- Quando não existir, o motor DEVE aplicar fallback determinístico (`default_price_list_id` ou lista padrão definida pelo catálogo).

## 10. Extensibilidade (`x-*`)

- Qualquer objeto PACP PODE incluir propriedades `x-*`.
- Consumidores PACP DEVE ignorar `x-*` desconhecidas sem falhar.
- Extensões NÃO DEVE alterar semântica obrigatória dos campos normativos.

## 11. Versionamento e compatibilidade

- PACP usa SemVer para a spec.
- Conteúdo em `spec/1.0.0/` DEVE ser imutável após release oficial.
- Mudanças incompatíveis DEVE ocorrer apenas em major futura (`2.0.0`).

## 12. Segurança e integridade

- Assinatura digital e checksum PODEM ser adotados por implementações, mas estão fora do escopo normativo obrigatório desta versão.
- Validação contra schema e checks semânticos mínimos DEVE ser parte do pipeline de ingestão.

## 13. Exemplos oficiais

Os exemplos oficiais desta versão são:

- `spec/1.0.0/examples/minimal.json`
- `spec/1.0.0/examples/matrix_lookup.json`
- `spec/1.0.0/examples/max_of.json`
- `spec/1.0.0/examples/dependencies.json`
- `spec/1.0.0/examples/multi_price_list.json`
- `spec/1.0.0/examples/extensions.json`

## 14. Glossário

- `ruleset`: conjunto de regras aplicadas sobre um `target`.
- `target`: estágio/valor da precificação (`BASE`, `SUBTOTAL`, `TOTAL`).
- `context`: dados externos de execução (região, canal, cliente, lista de preço).
- `constraint`: bloqueio de combinação.
- `dependency`: relacionamento lógico entre opções.

## 15. Conformidade PACP v1.0.0

Um arquivo é PACP compliant quando:

- [ ] Declara `spec` compatível com `1.0.0`.
- [ ] Possui `catalog.id` e IDs únicos por coleção.
- [ ] Define `products` e `options` sem ambiguidade.
- [ ] Declara `rulesets` com `target` válido.
- [ ] Separa constraints/dependencies da fase de cálculo.
- [ ] Define ordem de aplicação e desempate determinístico.
- [ ] Suporta `price_lists` e `context` quando usados.
- [ ] Permite e preserva extensões `x-*`.
- [ ] Valida contra `spec/1.0.0/pacp.schema.json`.
