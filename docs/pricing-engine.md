# Guia do Pricing Engine (PACP v1.0.0)

## Objetivo

Este guia descreve como um engine compatível com PACP DEVE processar um documento para produzir resultado determinístico.

## Pipeline recomendado

1. Carregar JSON e validar contra `spec/1.0.0/pacp.schema.json`.
2. Rodar checks semânticos mínimos (IDs, referências e lookup).
3. Avaliar `dependencies` e `constraints` para bloquear combinações inválidas.
4. Inicializar preço base e aplicar rulesets por target (`BASE`, `SUBTOTAL`, `TOTAL`).
5. Aplicar operações de pós-processamento (`ROUND`, `CAP`, `FLOOR`) quando configuradas.
6. Retornar preço final e trilha resumida de aplicação (opcional, mas recomendado).

## Ordenação de regras

- Ordene por `priority` (maior para menor).
- Em empate, ordene por `rule.id` em ordem lexicográfica crescente.
- Ignore regras com `enabled=false`.
- Regras sem `when` são consideradas verdadeiras.

## Semântica rápida de operações

- `ADD`: soma valor fixo.
- `PERCENT_OF`: soma percentual sobre alvo corrente.
- `OVERRIDE`: substitui valor corrente.
- `LOOKUP`: obtém valor de tabela por dimensões.
- `MAX_OF`/`MIN_OF`: escolhe extremo entre componentes.
- `PICK`: seleciona primeiro componente elegível.
- `ROUND`, `CAP`, `FLOOR`: ajustes finais de arredondamento/limites.

## Tratamento de erro

- Constraint negada DEVE interromper cálculo.
- Referência quebrada DEVE ser erro de validação.
- `LOOKUP` sem célula encontrada DEVE seguir fallback ou falhar explicitamente.
- Entrada inválida NÃO DEVE gerar preço parcial silencioso.
