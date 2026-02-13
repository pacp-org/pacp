# Governança do Padrão PACP

## Escopo

Este documento descreve como evoluir o padrão PACP mantendo neutralidade, transparência e compatibilidade.

## Diretrizes gerais

- PACP é padrão aberto e neutro.
- Versões publicadas em `spec/<versao>/` são imutáveis após release.
- Mudanças devem ser rastreáveis em `CHANGELOG.md`.
- Propostas devem incluir impacto em schema, spec textual e exemplos.

## Política de versionamento

- PATCH: correções editoriais sem mudar contrato.
- MINOR: adições compatíveis (campos opcionais, novos exemplos).
- MAJOR: mudanças incompatíveis.

## Processo de contribuição

1. Abrir issue descrevendo motivação e impacto.
2. Propor alteração com PR contendo:
   - atualização da spec;
   - atualização de schema;
   - exemplos atualizados/novos;
   - validação via CLI.
3. Revisão por mantenedores com foco em determinismo e compatibilidade.

## Critérios de aceite normativo

- Sem ambiguidade de execução de regras.
- Sem regressão nos exemplos oficiais.
- Compatibilidade de extensões `x-*`.
- Clareza de fallback/default para campos opcionais.
