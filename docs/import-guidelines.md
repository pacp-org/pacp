# Guia de Importação de Dados

## Objetivo

Ajudar equipes a converter planilhas e fontes legadas para PACP sem perder consistência.

## Princípios de importação

- Preserve IDs estáveis para produtos, atributos, opções, tabelas e rulesets.
- Normalize valores categóricos antes de gerar `options`.
- Evite criar variantes explícitas em massa; priorize atributos + regras.
- Registre metadados de origem em campos `x-*` quando necessário.

## Mapeamento recomendado

- Colunas de produto -> `products[]`.
- Colunas de atributo -> `products[].attributes[]`.
- Valores de seleção -> `products[].options[]`.
- Planilhas de preço matricial -> `tables[]` com `dimensions` e `rows`.
- Regras de negócio -> `rulesets[]` e `rules[]`.
- Regras de bloqueio -> `constraints[]`.
- Dependências entre seleções -> `dependencies[]`.

## Checklist pré-publicação

- IDs únicos por coleção.
- Referências (`productId`, `tableId`, `rulesetId`, `optionId`) válidas.
- Nenhuma célula obrigatória vazia no JSON final.
- Exemplos representativos validados no CLI.

## Estratégia incremental

1. Comece com `minimal.json` para validar modelo base.
2. Adicione tabelas (`matrix_lookup`) e agregadores (`max_of`).
3. Introduza dependencies/constraints.
4. Ative múltiplas listas de preço e contexto.
5. Só depois adicione extensões `x-*` específicas de domínio.
