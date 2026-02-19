# Guia do Pricing Engine (PACP v1.0.0)

## Objetivo

Este guia descreve como um engine compatível com PACP DEVE processar um documento para produzir resultado determinístico.

## Pipeline recomendado

1. Carregar JSON e validar contra `spec/1.0.0/pacp.schema.json`.
2. Rodar checks semânticos mínimos (IDs, referências e lookup).
3. Avaliar `dependencies` e `constraints` para bloquear combinações inválidas.
4. Validar lote obrigatório (`lot_policy`) e entrada de quantidade solicitada (`context.requested_quantity`, `context.requested_unit`) quando aplicável.
5. Normalizar quantidade mínima vendável por `sales_unit` usando `CEIL(requested_quantity / quantity_per_sell_unit)`.
6. Inicializar preço base e aplicar rulesets por target (`BASE`, `SUBTOTAL`, `TOTAL`).
7. Aplicar operações de pós-processamento (`ROUND`, `CAP`, `FLOOR`) quando configuradas.
8. Retornar preço final, quantidade mínima vendável e trilha resumida de aplicação (opcional, mas recomendado).

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

## Quantidade vendável e lote

- Quando `product.lot_policy.required=true`, o motor DEVE exigir o lote antes do cálculo.
- Quando `product.sales_unit` existir, o motor DEVE validar a unidade solicitada e calcular unidades vendáveis mínimas.
- Em v1.0.0, `sales_unit.rounding` DEVE ser `CEIL`.
- Exemplo em pisos e revestimentos: `requested_quantity=23 m2` e `quantity_per_sell_unit=2.2 m2/box` resulta em `11 box`.

## Tratamento de erro

- Constraint negada DEVE interromper cálculo.
- Lote obrigatório ausente DEVE interromper cálculo.
- Unidade solicitada incompatível com `sales_unit.requested_unit` DEVE interromper cálculo.
- Referência quebrada DEVE ser erro de validação.
- `LOOKUP` sem célula encontrada DEVE seguir fallback ou falhar explicitamente.
- Entrada inválida NÃO DEVE gerar preço parcial silencioso.
