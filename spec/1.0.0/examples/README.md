# Exemplos oficiais PACP v1.0.0

Este diretório contém exemplos curtos e didáticos para cobrir cenários reais de precificação sem expansão massiva de SKUs.

## Estrutura por setor

- `geral/minimal.json`: produto simples com regra `ADD`.
- `geral/multi_price_list.json`: múltiplas price lists e seleção por `context`.
- `geral/extensions.json`: uso compatível de extensões `x-*`.
- `moveis/max_of.json`: agregação `MAX_OF` entre componentes.
- `iluminacao/matrix_lookup.json`: tabela `LOOKUP` com dimensões e célula.
- `tapetes/dependencies.json`: separação de `dependencies` e `constraints`.
- `pisos-e-revestimentos/cost_plus.json`: `COST_PLUS` com lote obrigatório e conversão `m2` -> `box`.
- `geral/unit_conversion_volume.json`: conversão genérica `L` -> `galao` com arredondamento `CEIL`.

Cada pasta representa um setor de referência. Os exemplos são pequenos e reaproveitáveis para outros domínios.

Todos os exemplos DEVEM validar em `spec/1.0.0/pacp.schema.json`.
