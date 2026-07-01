# Design — Operações `TAX` e `DISCOUNT` no PACP (custo → venda)

**Data:** 2026-07-01
**Versão alvo:** `@pacp/spec@3.7.0` (spec_version `3.7.0`)
**Origem:** refina o PR #9 (`feat/tax-operation`) e adiciona desconto.

## Contexto

O PACP é um padrão aberto de catálogo + precificação. Fluxo real: a **Fábrica**
exporta o catálogo, a **Loja** importa. O preço importado é o **custo** na visão
da loja (`product.base_price`). A loja transforma `custo → preço de venda` ao
cliente final aplicando rulesets nos estágios `BASE → SUBTOTAL → TOTAL`.

Duas necessidades desse fluxo não têm operação dedicada hoje:

1. **Imposto** (ICMS/ISS/etc.) — percentual que às vezes incide sobre o valor
   acumulado, às vezes sobre o custo original importado.
2. **Desconto** ao cliente final — valor fixo ou percentual abatido do preço de
   venda.

Ambos são hoje expressáveis via `ADD`/`PERCENT_OF` (inclusive negativos), mas de
forma **anônima**: o motor não distingue imposto/desconto de margem/frete. Elevá-los
a operações de 1ª classe permite **identificá-los** — necessário, p.ex., para a
Lei da Transparência Fiscal (destacar impostos ao consumidor) e para exibir
descontos ("de R$X por R$Y").

## Princípio de design respeitado

As operações do PACP são **mecânicas**; o significado costuma morar no `id` da
regra. Abrimos exceção para `TAX` e `DISCOUNT` porque precisam ser **reconhecíveis
pelo motor** (reporte fiscal, exibição de economia) — não é só açúcar sintático.

## Decisão 1 — Operação `TAX`

Operação acumulativa que soma um percentual (alíquota) sobre uma base de incidência.

```jsonc
{ "operation": "TAX", "rate": 18, "base": "CURRENT" }   // % sobre valor corrente (default)
{ "operation": "TAX", "rate": 10, "base": "BASE_PRICE" } // % sobre custo original importado
```

- `rate` (number, **obrigatório**) — alíquota percentual. Mantido `rate` (≠ `percent`
  do `PERCENT_OF`) por ser fiscalmente idiomático e reforçar que `TAX` é distinta.
- `base` (enum, default `"CURRENT"`):
  - `"CURRENT"` — incide sobre o **valor corrente acumulado** na cadeia (mesma
    mecânica de `PERCENT_OF`).
  - `"BASE_PRICE"` — incide sobre `product.base_price` (o **custo original
    importado**), ignorando ajustes anteriores (frete, taxas).
- Semântica: `result = current + (resolvedBase * rate / 100)`.

**Mudança vs PR #9:** renomear os valores de `base`. O PR usava `"COST"` (valor
corrente) e `"BASE"` (base_price) — ambíguo: `"BASE"` colidia com o `target="BASE"`,
e `"COST"` era contraintuitivo (o custo da loja É o `base_price`). Novos nomes:
`"CURRENT"` / `"BASE_PRICE"`. `rate` e a existência da operação permanecem.

## Decisão 2 — Operação `DISCOUNT`

Operação que **subtrai** um desconto do valor corrente. Duas formas mutuamente
exclusivas:

```jsonc
{ "operation": "DISCOUNT", "value": 50 }   // R$50 fixos de desconto
{ "operation": "DISCOUNT", "rate": 10 }    // 10% de desconto sobre o valor corrente
```

- `value` (number) — abatimento fixo: `result = current - value`.
- `rate` (number) — abatimento percentual sobre o valor corrente:
  `result = current - (current * rate / 100)`.
- **Exatamente um** de `value`/`rate` DEVE estar presente (erro de validação
  caso contrário). Reusa campos existentes — nenhum campo novo.
- **Sem** opção de `base`: desconto ao cliente incide sempre sobre o valor de
  venda corrente (YAGNI; pode ser estendido depois se surgir necessidade).
- `value`/`rate` são magnitudes positivas; a operação subtrai. Não há floor
  automático em 0 — usar `FLOOR` se desejado.

## Compatibilidade retroativa

Adição puramente aditiva. Catálogos existentes (sem `TAX`/`DISCOUNT`) continuam
100% válidos. Nenhuma operação/campo existente é alterado. Bump `3.6.0 → 3.7.0`
(minor).

## Erros normativos novos

- `TAX` sem `rate` numérico → falha de validação (`INVALID_OPERATION_PARAMS`).
- `DISCOUNT` sem `value` nem `rate`, ou com ambos → falha de validação
  (`INVALID_OPERATION_PARAMS`).

## Arquivos afetados

**Schema/tipos**
- `spec/latest/pacp.schema.json` — enum `+TAX +DISCOUNT`; campos `rate`, `base`
  (enum `CURRENT|BASE_PRICE`, `default CURRENT`); condicionais `if TAX → require rate`.
- `packages/pacp/src/types.ts` — `RuleOperation +"TAX" +"DISCOUNT"`; `Rule.rate`,
  `Rule.base`; tipo `TaxBase = "CURRENT" | "BASE_PRICE"`.

**Validador**
- `tools/validator/src/cli.ts` — `checkRulesSemanticBasics`: TAX exige `rate`;
  DISCOUNT exige exatamente um de `value`/`rate`.

**Doc normativa/guias**
- `spec/latest/pacp.md` — §6 operações + ordenação acumulativa + erros normativos.
- `docs/pricing-engine.md`, `docs/integration-guide.md` — tabelas de operações.
- `site/index.html` — tabela de operações (adicionar `TAX` **e** `DISCOUNT`;
  o PR original esquecera até o TAX aqui).

**Exemplos/fixtures**
- `spec/latest/examples/tax_operation.json` (+ `products/prod_luminaria.json`) —
  atualizar `base` para `CURRENT`/`BASE_PRICE`.
- `spec/latest/examples/discount_operation.json` (+ produto) — novo exemplo
  cobrindo `value` e `rate`.
- `spec/latest/examples/README.md` — registrar os exemplos.
- `tools/validator/test/fixtures/rule_invalid_tax_missing_rate.json` — já existe.
- `tools/validator/test/fixtures/rule_invalid_discount_missing_params.json` — novo.
- `tools/validator/test/README.md` — registrar a fixture nova.

**Versionamento**
- `CHANGELOG.md`, `packages/pacp/package.json`, `spec/latest.json` — `3.7.0`,
  `published_at 2026-07-01`. CHANGELOG cobrindo TAX **e** DISCOUNT.

## Validação

- `npm run build` (tipos + validador compilam).
- `npm run validate:examples` — todos os exemplos (incl. os novos) passam.
- Fixtures negativas saem com exit code 2 e código esperado.

## Publicação

1. Merge do PR #9 (com estas mudanças) em `main`.
2. Criar GitHub Release com tag `v3.7.0` → dispara `publish-npm.yml` (OIDC
   Trusted Publisher) → publica `@pacp/spec@3.7.0` no npm.
