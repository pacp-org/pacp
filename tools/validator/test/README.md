# Fixtures negativas do validador

Cada arquivo aqui é um PACP document **deliberadamente inválido** que o validador CLI DEVE rejeitar com um código de erro específico.

## Como rodar

```bash
cd tools/validator
npm run build
node dist/cli.js test/fixtures/<arquivo>.json
```

Cada execução deve sair com **exit code 2** (validação falhou) e imprimir o código de erro esperado no formato `[CODE] /path: mensagem`.

## Fixtures

| Arquivo | Código esperado |
|---|---|
| `supplied_invalid_no_source_when.json` | `INVALID_SOURCE_WHEN` (via schema, oneOf) ou `SCHEMA` (allOf if/then) |
| `supplied_invalid_unknown_attribute.json` | `MISSING_SOURCING_ATTRIBUTE` |
| `supplied_invalid_uncovered_option.json` | `UNCOVERED_OPTION_VALUE` |
| `supplied_invalid_duplicate_id.json` | `DUPLICATE_SUPPLIED_MATERIAL_ID` |

Fixtures NÃO são executadas por `npm run validate:examples` (pasta está fora de `spec/latest/examples`).
