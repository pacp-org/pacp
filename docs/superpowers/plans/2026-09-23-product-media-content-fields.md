# Campos de mídia e conteúdo do produto (PACP 3.8.0) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar ao core do PACP seis campos novos de `product` — `documents`, `videos`, `competitive_differential`, `installation_manual`, `intended_use`, `usage_manual` — cobrindo a necessidade (levantada pelo Hoop, consumidor do protocolo) de anexar mídia categorizada (imagem/PDF/vídeo) e conteúdo textual estruturado (diferencial competitivo, manual de instalação, para que serve, manual de uso) a um produto, mantendo o protocolo determinístico e neutro por vertical.

**Architecture:** São campos opcionais e aditivos em `$defs.product` (MINOR bump, sem quebra de compatibilidade). `documents`/`videos` seguem exatamente o padrão já existente de `product.images`/`$defs.image` (array de objeto com `url` obrigatório + categoria). Os 3 campos de conteúdo (`installation_manual`, `intended_use`, `usage_manual`) compartilham um novo `$defs.content_field` (`{text?, document_url?}`) via `$ref` — o schema declarado usa draft 2020-12, que respeita `description` como sibling de `$ref`, então cada campo pode ter descrição própria sem duplicar a definição. `competitive_differential` é `string` simples. Nenhuma semântica de preço é afetada; nenhum destes campos é consumido pelo engine de regras.

**Tech Stack:** JSON Schema (draft 2020-12), TypeScript (tipos hand-maintained em `packages/pacp/src/types.ts`), AJV (validação via `tools/validator`), Markdown (spec normativa `pacp.md`), npm/tsup (build do pacote).

**Spec:** Decisão tomada em conversa (brainstorming architectural, sem doc de spec separado — ver histórico da conversa: escopo por catálogo, campos first-class no protocolo já que o usuário é mantenedor do PACP, vídeo por link externo, 3 campos de texto distintos com PDF opcional, diferencial competitivo em texto corrido).

## Global Constraints

- Schema: `additionalProperties: false` + `patternProperties: {"^x-": true}` em todo objeto — **nunca** adicionar campo sem declará-lo em `properties`, e nunca reutilizar um nome já usado em `$defs` (`document` colide conceitualmente com `product_document`, mas são nomes distintos — ok).
- Versão: bump MINOR (`3.7.1` → `3.8.0`) em `packages/pacp/package.json`, `CHANGELOG.md`. **Não** mexer em `spec/latest.json.spec_version`/`published_at` — isso é escrito pelo workflow `publish-npm.yml` no momento do release, não manualmente.
- Categoria de mídia nova (`document`/`video`): enum `["ILLUSTRATIVE", "TECHNICAL"]` (não reaproveitar o enum de `image.type`, que é mais granular — MAIN/DETAIL/AMBIANCE/TECHNICAL/OTHER — e já resolve a categorização pra imagem).
- Todo campo novo é **opcional** e **nunca inferido automaticamente** por nenhuma regra do engine — são dados descritivos, mesma categoria de `description`/`images`.
- Exemplo oficial novo/estendido precisa passar em `npm run validate:examples` (`tools/validator`) antes de qualquer commit.
- Não tocar em `spec/draft/` (vazio, não faz parte do fluxo ativo — confirmado por leitura direta).

## Review Focus

- **Campo com `$ref` + `description` sibling não é ignorado pelo AJV**: draft 2020-12 respeita siblings de `$ref` (confirmado em `pacp.schema.json:2`); se algum dia a spec baixar pra draft-07, essa suposição quebra silenciosamente — o teste do exemplo estendido cobre isso indiretamente (se a description fosse ignorada, o schema ainda validaria normalmente, já que description não afeta validação — o risco real é só documentação incorreta, não validação; mantido como nota, sem teste dedicado).
- **`document_url` malformada não deve ser aceita silenciosamente**: `format: "uri"` no schema. Testar com URL inválida no exemplo negativo do validador (fixture negativa).
- **Array `documents`/`videos` vazio ou ausente**: produto existente sem os campos novos precisa continuar validando (retrocompatibilidade) — coberto pelos exemplos oficiais já existentes (nenhum precisa mudar).
- **Categoria fora do enum (`"Ilustrativa"` em vez de `"ILLUSTRATIVE"`)**: DEVE falhar validação — testar no fixture negativo.
- **`content_field` totalmente vazio (`{}`)**: válido (nenhum sub-campo é obrigatório) — um produto pode declarar `installation_manual: {}` sem erro; isso é intencional (permite UI salvar objeto vazio antes do usuário preencher), mas vale confirmar que não quebra nada.

---

### Task 1: Schema + tipos TS + spec normativa + exemplo

**Files:**
- Modify: `spec/latest/pacp.schema.json:645-667` (novo `$defs.document`, `$defs.video`, `$defs.content_field`, inseridos após `$defs.image`)
- Modify: `spec/latest/pacp.schema.json:197-257` (novas properties em `$defs.product`)
- Modify: `packages/pacp/src/types.ts` (novas interfaces `Document`, `Video`, `ContentField`, `MediaCategory`, campos novos em `Product`)
- Modify: `spec/latest/pacp.md` (nova seção `### 4.10 Mídia e conteúdo (documents, videos, competitive_differential, installation_manual, intended_use, usage_manual)`, inserida entre a linha 227 e a linha 229 atual — antes de `## 5. Precificação`)
- Modify: `spec/latest/examples/products/prod_sofa.json` (produto de exemplo já é um sofá com opções de tecido — adicionar os 6 campos novos nele, é o caso mais próximo do domínio real do consumidor)
- Test/validation: `tools/validator` (CLI), fixture negativa nova em `tools/validator` (ver estrutura de fixtures negativas existente antes de criar)

**Interfaces:**
- Produces (consumido pela Task 2 e pelo consumo no Hoop depois): schema JSON com `product.documents: Document[]`, `product.videos: Video[]`, `product.competitive_differential?: string`, `product.installation_manual?: ContentField`, `product.intended_use?: ContentField`, `product.usage_manual?: ContentField`. Tipos TS: `Document { url: string; label?: string; category?: MediaCategory }`, `Video` idêntico, `ContentField { text?: string; document_url?: string }`, `MediaCategory = "ILLUSTRATIVE" | "TECHNICAL"`.

- [ ] **Step 1: Escrever o teste que falha — estender `prod_sofa.json` com os campos novos**

Editar `spec/latest/examples/products/prod_sofa.json`, adicionando (antes de `"ruleset_ids"`, depois de `"tags"`/`"attributes"` — manter ordem de propriedades como está, só inserir os campos novos ao final do objeto `product`, antes de `ruleset_ids`):

```json
    "documents": [
      {
        "url": "https://example.com/docs/sof-ret-003-ficha-tecnica.pdf",
        "label": "Ficha técnica e composição",
        "category": "TECHNICAL"
      },
      {
        "url": "https://example.com/docs/sof-ret-003-catalogo.pdf",
        "label": "Catálogo da linha",
        "category": "ILLUSTRATIVE"
      }
    ],
    "videos": [
      {
        "url": "https://www.youtube.com/watch?v=exemplo-sof-ret-003",
        "label": "Sofá retrátil em ambiente decorado",
        "category": "ILLUSTRATIVE"
      }
    ],
    "competitive_differential": "Mecanismo retrátil silencioso com curso duplo e estrutura em aço carbono reforçado, suportando até 300kg distribuídos — acima da média do segmento (180-220kg).",
    "installation_manual": {
      "text": "Posicionar o sofá nivelado, encaixar os pés fornecidos girando no sentido horário até travar, e testar o mecanismo retrátil antes de acomodar estofados.",
      "document_url": "https://example.com/docs/sof-ret-003-manual-instalacao.pdf"
    },
    "intended_use": {
      "text": "Sofá retrátil e reclinável para sala de estar, indicado para uso residencial diário."
    },
    "usage_manual": {
      "text": "Acionar o mecanismo retrátil apenas com o assento livre de objetos. Evitar apoiar peso sobre o encosto reclinado. Limpeza do suede apenas a seco.",
      "document_url": "https://example.com/docs/sof-ret-003-manual-uso.pdf"
    },
```

- [ ] **Step 2: Rodar o validador e confirmar que falha**

```bash
cd tools/validator && npm ci && npm run build && npm run validate -- ../../spec/latest/examples/products/prod_sofa.json
```

Esperado: FAIL — `additionalProperties` rejeitando `documents`, `videos`, `competitive_differential`, `installation_manual`, `intended_use`, `usage_manual` (schema ainda não os conhece).

- [ ] **Step 3: Implementar `$defs.document`, `$defs.video`, `$defs.content_field` no schema**

Em `spec/latest/pacp.schema.json`, logo após o fechamento do `$defs.image` (linha 667, `},`) e antes do `$defs.measure` (linha 669), inserir:

```json
    "document": {
      "type": "object",
      "required": ["url"],
      "additionalProperties": false,
      "patternProperties": { "^x-": true },
      "properties": {
        "url": { "type": "string", "format": "uri" },
        "label": { "type": "string" },
        "category": {
          "type": "string",
          "enum": ["ILLUSTRATIVE", "TECHNICAL"],
          "description": "Natureza do documento: ILLUSTRATIVE (material de apresentação/marketing) ou TECHNICAL (ficha técnica, certificado, especificação)."
        }
      }
    },

    "video": {
      "type": "object",
      "required": ["url"],
      "additionalProperties": false,
      "patternProperties": { "^x-": true },
      "properties": {
        "url": { "type": "string", "format": "uri" },
        "label": { "type": "string" },
        "category": {
          "type": "string",
          "enum": ["ILLUSTRATIVE", "TECHNICAL"],
          "description": "Natureza do vídeo: ILLUSTRATIVE (ambientação/apresentação) ou TECHNICAL (instalação, uso, demonstração técnica)."
        }
      }
    },

    "content_field": {
      "type": "object",
      "additionalProperties": false,
      "patternProperties": { "^x-": true },
      "properties": {
        "text": { "type": "string" },
        "document_url": { "type": "string", "format": "uri" }
      },
      "description": "Bloco de conteúdo textual com anexo opcional de documento (ex.: PDF). Ambos os sub-campos são opcionais e independentes."
    },
```

- [ ] **Step 4: Adicionar as 6 properties novas em `$defs.product`**

Em `spec/latest/pacp.schema.json:197-200`, o bloco `"images"` atual é:

```json
        "images": {
          "type": "array",
          "items": { "$ref": "#/$defs/image" }
        },
```

Logo depois (antes de `"tags"`, linha 201), inserir:

```json
        "documents": {
          "type": "array",
          "items": { "$ref": "#/$defs/document" },
          "description": "Anexos de documento do produto (ex.: PDF de ficha técnica, catálogo, certificado)."
        },
        "videos": {
          "type": "array",
          "items": { "$ref": "#/$defs/video" },
          "description": "Vídeos externos do produto (ex.: YouTube, Vimeo)."
        },
```

Em `$defs.product.properties`, depois de `"description": { "type": "string" },` (linha 184) e antes de `"category"` (linha 185), inserir:

```json
        "competitive_differential": {
          "type": "string",
          "description": "Texto livre descrevendo o diferencial competitivo do produto frente a alternativas do mercado."
        },
```

No fim de `$defs.product.properties`, depois de `"standalone_sellable"` (linha 253-257, último campo antes do `},` de fechamento de `properties`), inserir (lembrando de adicionar vírgula depois do `}` de `standalone_sellable`):

```json
        "installation_manual": {
          "$ref": "#/$defs/content_field",
          "description": "Instruções de como montar/instalar fisicamente o produto."
        },
        "intended_use": {
          "$ref": "#/$defs/content_field",
          "description": "Para que serve o produto — propósito e casos de uso."
        },
        "usage_manual": {
          "$ref": "#/$defs/content_field",
          "description": "Instruções de como operar/usar o produto no dia a dia."
        }
```

(Esse é o último campo antes do `},` que fecha `properties` — não deixar vírgula sobrando depois dele.)

- [ ] **Step 5: Rodar o validador e confirmar que passa**

```bash
cd tools/validator && npm run build && npm run validate -- ../../spec/latest/examples/products/prod_sofa.json
```

Esperado: PASS.

- [ ] **Step 6: Rodar todos os exemplos oficiais (retrocompatibilidade)**

```bash
cd tools/validator && npm run validate:examples
```

Esperado: PASS em todos (nenhum exemplo existente deveria ser afetado — campos novos são opcionais).

- [ ] **Step 7: Adicionar fixture negativa**

Verificar o padrão de fixtures negativas existente (`tools/validator` — provavelmente `tools/validator/fixtures/negative/` ou similar; localizar com `find tools/validator -iname "*negative*"` antes de criar). Adicionar um caso: produto com `"category": "Ilustrativa"` (valor fora do enum, minúsculo/português em vez de `ILLUSTRATIVE`) em um `document`, esperando erro de schema. Seguir o mesmo formato/estrutura dos casos negativos já cobertos pelo `tools/validator` (10 fixtures negativas citadas no commit `4dfa3aa`).

- [ ] **Step 8: Rodar suíte negativa e confirmar que a fixture nova falha como esperado**

```bash
cd tools/validator && npm test
```

(ou o comando equivalente usado pelas fixtures negativas — conferir `package.json` de `tools/validator` primeiro.)

Esperado: PASS (ou seja, o validador corretamente rejeita a fixture negativa).

- [ ] **Step 9: Adicionar tipos TypeScript**

Em `packages/pacp/src/types.ts`, logo após a interface `Image` (linha 21-32), inserir:

```typescript
/**
 * Categoria de mídia (documento ou vídeo): ILLUSTRATIVE (apresentação/marketing)
 * ou TECHNICAL (ficha técnica, certificado, instalação, uso).
 */
export type MediaCategory = "ILLUSTRATIVE" | "TECHNICAL";

/**
 * Anexo de documento do produto (ex.: PDF de ficha técnica, catálogo, certificado).
 */
export interface Document {
  /** URI válida do documento. */
  url: string;
  /** Rótulo legível / legenda. */
  label?: string;
  /** Natureza do documento. */
  category?: MediaCategory;
}

/**
 * Vídeo externo do produto (ex.: YouTube, Vimeo).
 */
export interface Video {
  /** URI válida do vídeo. */
  url: string;
  /** Rótulo legível / legenda. */
  label?: string;
  /** Natureza do vídeo. */
  category?: MediaCategory;
}

/**
 * Bloco de conteúdo textual com anexo opcional de documento (ex.: PDF).
 * Ambos os sub-campos são opcionais e independentes.
 */
export interface ContentField {
  text?: string;
  document_url?: string;
}
```

Na interface `Product` (a partir da linha 282), adicionar os campos novos seguindo exatamente o padrão de comentário JSDoc já usado nos campos vizinhos:

- Logo após `description?: string;` (linha 297): `/** Texto livre descrevendo o diferencial competitivo do produto frente a alternativas do mercado. */\n  competitive_differential?: string;`
- Logo após `images?: Image[];` (linha 315): `documents?: Document[];\n  videos?: Video[];` (com os respectivos comentários JSDoc "Anexos de documento..." / "Vídeos externos...")
- Ao final da interface `Product` (depois do último campo, `standalone_sellable?: boolean;`), adicionar `installation_manual?: ContentField;`, `intended_use?: ContentField;`, `usage_manual?: ContentField;`, cada um com JSDoc igual à description usada no schema.

- [ ] **Step 10: Rodar typecheck do pacote**

```bash
cd packages/pacp && npx tsc --noEmit
```

Esperado: PASS (sem erros de tipo).

- [ ] **Step 11: Escrever a seção normativa em `pacp.md`**

Inserir, entre a linha 227 (fim da seção 4.9) e a linha 228 (linha em branco antes de `## 5. Precificação`), a nova seção:

```markdown

### 4.10 Mídia e conteúdo (`documents`, `videos`, `competitive_differential`, `installation_manual`, `intended_use`, `usage_manual`)

Em PACP, `product` PODE incluir os campos abaixo para anexar mídia categorizada e conteúdo textual estruturado. Todos são opcionais, aditivos, e NÃO DEVEM alterar semântica de cálculo de preço.

**Mídia adicional (além de `images`):**

- `documents` (`array of document`): anexos de documento do produto (ex.: PDF de ficha técnica, catálogo, certificado).
  - Cada `document` DEVE conter `url` (URI válida). PODE conter `label` e `category` (enum: `ILLUSTRATIVE`, `TECHNICAL`).
- `videos` (`array of video`): vídeos externos do produto (ex.: YouTube, Vimeo). PACP não hospeda vídeo — apenas referencia a URL.
  - Cada `video` DEVE conter `url` (URI válida). PODE conter `label` e `category` (enum: `ILLUSTRATIVE`, `TECHNICAL`).
  - `category` em `document`/`video` é um enum simples de dois valores, deliberadamente menos granular que `image.type` (`MAIN`/`DETAIL`/`AMBIANCE`/`TECHNICAL`/`OTHER`): a variedade de ângulo/contexto que `image.type` distingue não se aplica a documento ou vídeo do mesmo jeito.

**Conteúdo textual estruturado:**

- `competitive_differential` (`string`): texto livre descrevendo o diferencial competitivo do produto frente a alternativas do mercado.
- `installation_manual` (`content_field`): instruções de como montar/instalar fisicamente o produto.
- `intended_use` (`content_field`): para que serve o produto — propósito e casos de uso.
- `usage_manual` (`content_field`): instruções de como operar/usar o produto no dia a dia.
- Um `content_field` é um objeto com `text` (`string`, opcional) e `document_url` (`string`, URI válida, opcional) — ambos independentes; um `content_field` PODE ter só texto, só documento, ambos, ou nenhum (`{}`).

Regras normativas:

- Estes campos existem para que o catálogo PACP sirva como base de dados autocontida também para conteúdo de vendas/pós-venda (não só para cálculo de preço) — incluindo consumo por sistemas de recomendação/geração de conteúdo automatizados.
- Nenhum destes campos é lido pelo engine de regras (`rulesets`/`rules`); consumidores PODEM ignorá-los sem afetar o cálculo de preço.
- Implementações NÃO DEVEM inferir automaticamente estes campos a partir de outros dados do produto — são conteúdo declarado explicitamente.

Exemplo: `spec/latest/examples/products/prod_sofa.json` demonstra os seis campos em um produto real (sofá retrátil com ficha técnica em PDF, vídeo de ambientação e manuais de instalação/uso).
```

- [ ] **Step 12: Revisar o diff completo do arquivo `pacp.md` e confirmar que a numeração de seções seguintes (se houver referências cruzadas a "seção 5" etc.) não quebrou**

```bash
git diff spec/latest/pacp.md
```

Conferir visualmente que a seção 5 (`## 5. Precificação`) continua logo em seguida, sem duplicar nem deslocar heading nenhum.

- [ ] **Step 13: Commit**

```bash
git add spec/latest/pacp.schema.json spec/latest/pacp.md spec/latest/examples/products/prod_sofa.json packages/pacp/src/types.ts tools/validator
git commit -m "feat(spec): campos de mídia e conteúdo do produto — documents, videos, competitive_differential, installation_manual, intended_use, usage_manual (@pacp/spec 3.8.0)"
```

---

### Task 2: CHANGELOG + bump de versão + build do pacote

**Files:**
- Modify: `CHANGELOG.md` (nova entrada `## [3.8.0]` no topo, seguindo exatamente o formato das entradas anteriores)
- Modify: `packages/pacp/package.json:3` (`"version": "3.7.1"` → `"3.8.0"`)
- Verify: `packages/pacp/package-lock.json` (versão espelhada, se o lockfile guardar a versão do próprio pacote)

**Interfaces:**
- Consumes: mudanças de schema/tipos da Task 1 (já commitadas).
- Produces: `packages/pacp` com `npm run build` verde, pronto pra ser instalado localmente (`npm install <path>`) pelo Hoop antes do release público real.

- [ ] **Step 1: Escrever a entrada do CHANGELOG**

No topo de `CHANGELOG.md` (antes de `## [3.7.1] - 2026-07-01`), inserir:

```markdown
## [3.8.0] - 2026-09-23

**npm:** `@pacp/spec@3.8.0`
**spec_version:** `3.8.0`

### Added

- **Mídia e conteúdo do produto** (`product.documents`, `product.videos`, `product.competitive_differential`, `product.installation_manual`, `product.intended_use`, `product.usage_manual`) — seis campos opcionais e aditivos cobrindo anexo de documento (PDF) e vídeo externo categorizados (`ILLUSTRATIVE`/`TECHNICAL`, análogo a `image.type` mas com enum mais simples) e conteúdo textual estruturado (diferencial competitivo, manual de instalação, para que serve, manual de uso — cada um com texto + documento opcional via novo `$defs.content_field`). Nenhum destes campos é lido pelo engine de regras. Motivação: consumidores do protocolo (ex.: Hoop) precisam de um catálogo de produto autocontido o suficiente pra alimentar sistemas de vendas/recomendação, sem depender de PIM externo pra esse conteúdo. Exemplo: `spec/latest/examples/products/prod_sofa.json`. Ver spec §4.10.
```

- [ ] **Step 2: Bump de versão**

Editar `packages/pacp/package.json:3`:

```json
  "version": "3.8.0",
```

- [ ] **Step 3: Sincronizar o lockfile**

```bash
cd packages/pacp && npm install --package-lock-only
```

- [ ] **Step 4: Build do pacote**

```bash
cd packages/pacp && npm run build
```

Esperado: PASS, gera `dist/` com o schema novo embutido e os tipos novos exportados.

- [ ] **Step 5: Conferir que o schema buildado reflete os campos novos**

```bash
cd packages/pacp && node -e "const s=require('./dist/pacp.schema.json'); console.log(Object.keys(s['\$defs'].product.properties).includes('documents'), Object.keys(s['\$defs']).includes('content_field'))"
```

Esperado: `true true`.

- [ ] **Step 6: Commit**

```bash
git add CHANGELOG.md packages/pacp/package.json packages/pacp/package-lock.json
git commit -m "chore(release): bump @pacp/spec para 3.8.0"
```

---

## Depois do plano (fora do escopo desta implementação)

- Abrir PR, `gh pr checks --watch`, merge squash pra `main` — **sem** criar tag/release (isso dispara `publish-npm.yml` e publica de verdade no npm público; fica pendente de confirmação humana explícita).
- Consumo no Hoop (`~/projects/hoop`) é um plano/ciclo separado — depende do build local de `packages/pacp` (ou do release público, quando publicado).
