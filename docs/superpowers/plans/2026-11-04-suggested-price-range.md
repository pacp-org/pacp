# Faixa de preço sugerido do produto (PACP 3.9.0) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Adicionar a `product` dois campos opcionais, `suggested_min_price` e `suggested_max_price` (preço final mínimo/máximo sugerido pela fábrica ao lojista), e definir que o output do engine sinaliza a posição do `total` em relação à faixa (`suggested_range`), sem alterar nenhum cálculo.

**Architecture:** Campos aditivos em `$defs.product` (MINOR 3.8.0 → 3.9.0). Valor fixo por produto (não varia com a configuração). Puramente informativo: NÃO entram no pipeline de rulesets, NÃO alteram `total`/`subtotal`, NÃO bloqueiam. Este repo não tem implementação do engine; a sinalização é regra normativa em `pacp.md` §5.2 + tipo de output em `types.ts`.

**Tech Stack:** JSON Schema 2020-12, TypeScript (`packages/pacp/src/types.ts`, `tools/validator/src/cli.ts`), Markdown, npm.

## Decisões (do brainstorming com o Rafael)

- Informativo; engine só sinaliza `BELOW` / `WITHIN` / `ABOVE`.
- Valor fixo por produto.
- Decisões do implementador (Claude, marcadas como tal no relatório): nomes `suggested_min_price`/`suggested_max_price`; `number` ≥ 0; ambos opcionais e independentes; `min > max` → erro `INVALID_SUGGESTED_RANGE`; `role="FAMILY"` com os campos → erro `INVALID_SUGGESTED_RANGE_ON_FAMILY`; comparação contra `total` final (após passo 10) na moeda da price list; limites inclusivos; com `sales_unit`, mesma unidade do `total` retornado; sem nenhum dos campos, `suggested_range` é omitido; só um limite → o outro lado nunca dispara.
- Output: `suggested_range: { min?: number, max?: number, status: "BELOW" | "WITHIN" | "ABOVE" }`.

## Global Constraints

- Schema: `additionalProperties: false` — declarar os campos em `properties` de `$defs.product`.
- Bump MINOR em `packages/pacp/package.json` (+ lock) e `CHANGELOG.md`. NÃO mexer em `spec/latest.json` (escrito pelo workflow de release).
- Não tocar `spec/draft/`.
- Exemplos oficiais devem passar em `npm run validate:examples` (tools/validator).
- Nenhum campo novo afeta o pipeline de preço.

## Review Focus

- `min == max` válido; só min ou só max válido; `0` válido; negativo inválido (schema).
- Produto existente sem os campos continua válido.
- FAMILY com os campos falha; MODULE/STANDALONE passam.
- O validador reporta erro com `path` correto.

---

### Task 1: Schema + tipos + validador + fixtures

**Files:** `spec/latest/pacp.schema.json`, `packages/pacp/src/types.ts`, `packages/pacp/src/index.ts` (se exportar tipo novo), `tools/validator/src/cli.ts`, `tools/validator/test/fixtures/*`, `tools/validator/test/README.md`

- [ ] Schema: `suggested_min_price` e `suggested_max_price` (`type: number`, `minimum: 0`, com `description`) em `$defs.product`.
- [ ] `types.ts`: campos em `Product` com JSDoc; tipos `SuggestedRangeStatus = "BELOW" | "WITHIN" | "ABOVE"` e `SuggestedRange`; exportar em `index.ts` se o padrão do arquivo exportar tipos.
- [ ] `cli.ts`: checagens `INVALID_SUGGESTED_RANGE` (min > max) e `INVALID_SUGGESTED_RANGE_ON_FAMILY`, seguindo o padrão das checagens de família (ex.: `INVALID_FAMILY_TARGET`, ~linha 717).
- [ ] Fixtures: negativas (min > max; FAMILY com campo; valor negativo) e uma positiva (só min). Registrar no `test/README.md` no mesmo padrão das existentes.
- [ ] Rodar: `cd tools/validator && npm ci && npm run build`; validar cada fixture com `node dist/cli.js <arquivo>` (negativas → exit 2 com o código esperado; positiva → exit 0).
- [ ] Commit: `feat(spec): schema, tipos e validador da faixa de preço sugerido`.

### Task 2: Spec normativa + exemplo + docs + release

**Files:** `spec/latest/pacp.md`, `spec/latest/examples/products/prod_sofa.json`, `AGENTS.md`, `README.md`, `docs/pricing-engine.md`, `CHANGELOG.md`, `packages/pacp/package.json`, `packages/pacp/package-lock.json`

- [ ] `pacp.md`: campos no §4.3 (product) + subseção normativa da faixa sugerida (semântica informativa, comparação, inclusivo, `sales_unit`, omissão) + passo de output em §5.2 + códigos de erro novos.
- [ ] `prod_sofa.json`: adicionar `suggested_min_price`/`suggested_max_price` coerentes com o `base_price`.
- [ ] `AGENTS.md`: linhas na tabela "Erros do validador → fix" e uma convenção não-óbvia curta; `README.md`/`docs/pricing-engine.md`: menção ao `suggested_range` no output.
- [ ] `CHANGELOG.md` entrada 3.9.0; bump `packages/pacp/package.json` e `package-lock.json` (2 ocorrências de versão) para 3.9.0.
- [ ] Rodar `cd tools/validator && npm run validate:examples` (verde) e `cd packages/pacp && npm ci && npm run build`.
- [ ] Commit: `feat(spec): faixa de preço sugerido do produto (PACP 3.9.0)`.
