# Exemplos oficiais PACP v1.0.0

Este diretório contém exemplos curtos e didáticos para cobrir cenários reais de precificação sem expansão massiva de SKUs.

- `minimal.json`: produto simples com atributos e regra `ADD`.
- `matrix_lookup.json`: tabela `LOOKUP` com dimensões e célula.
- `max_of.json`: agregação `MAX_OF` entre componentes fixo/tabela.
- `dependencies.json`: separação de `dependencies` e `constraints`.
- `multi_price_list.json`: múltiplas price lists e seleção por `context`.
- `extensions.json`: uso compatível de extensões `x-*`.

Todos os exemplos DEVEM validar em `spec/1.0.0/pacp.schema.json`.
