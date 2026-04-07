# Exemplos Oficiais PACP

Cada exemplo demonstra um aspecto especifico da spec. Todos os JSONs validam contra `spec/latest/pacp.schema.json`.

## Exemplos

| Arquivo | O que demonstra |
|---------|-----------------|
| `minimal.json` | Catalogo minimo: 1 produto, 2 atributos, 1 regra ADD |
| `matrix_lookup.json` | Tabela matricial (largura x acabamento) com operacao LOOKUP |
| `max_of_components.json` | Agregacao MAX_OF entre 2 tabelas + PERCENT_OF no TOTAL |
| `dependencies.json` | REQUIRES, AVAILABLE_OPTIONS_WHEN e DENY constraint |
| `multi_price_list.json` | Multiplas listas de preco selecionadas por context |
| `extensions.json` | Campos x-* em catalogo, produto, regra e dicionarios |

## Estrutura

```
examples/
├── minimal.json
├── matrix_lookup.json
├── max_of_components.json
├── dependencies.json
├── multi_price_list.json
├── extensions.json
└── products/
    ├── prod_cadeira.json
    ├── prod_banner.json
    ├── prod_mesa.json
    ├── prod_mesa_config.json
    ├── prod_camiseta.json
    └── prod_sofa.json
```

## Validacao

```bash
cd tools/validator
npm run validate:examples
```
