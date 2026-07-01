# Exemplos Oficiais PACP

Cada exemplo demonstra um aspecto especifico da spec. Todos os JSONs validam contra `spec/latest/pacp.schema.json`.

## Exemplos

| Arquivo | O que demonstra |
|---------|-----------------|
| `minimal.json` | Catalogo minimo: 1 produto, 2 atributos, 1 regra ADD |
| `matrix_lookup.json` | Tabela matricial (largura x acabamento) com operacao LOOKUP |
| `max_of_components.json` | Agregacao MAX_OF entre 2 tabelas + PERCENT_OF no TOTAL |
| `dependencies.json` | REQUIRES, AVAILABLE_OPTIONS_WHEN, DENY constraint e produto `INTERNAL` |
| `multi_price_list.json` | Multiplas listas de preco selecionadas por context |
| `extensions.json` | Campos x-* em catalogo, produto, regra e dicionarios |
| `collections.json` | Campo `collections` no produto + regras condicionais usando fact `product.collections` (queima de colecao + protecao de linha premium) |
| `catalog_notes.json` | Campos `catalog.notes` (publicas) e `catalog.internal_notes` (filtradas em catalogos publicos) |
| `family_hierarchy.json` | Hierarquia família/módulo: 1 FAMILY (Sofá ADANA) + 3 MODULEs com `standalone_sellable` true/false |
| `tax_operation.json` | Operação `TAX`: `base="COST"` (default, incide sobre o alvo corrente no SUBTOTAL) e `base="BASE"` (incide sobre `product.base_price` original no TOTAL, ignorando o ADD acumulado em BASE) |

## Estrutura

```
examples/
├── minimal.json
├── matrix_lookup.json
├── max_of_components.json
├── dependencies.json
├── multi_price_list.json
├── extensions.json
├── collections.json
├── catalog_notes.json
├── family_hierarchy.json
├── tax_operation.json
└── products/
    ├── prod_cadeira.json
    ├── prod_banner.json
    ├── prod_mesa.json
    ├── prod_mesa_config.json
    ├── prod_camiseta.json
    ├── prod_camisa_inverno.json
    ├── prod_jaqueta_premium.json
    ├── prod_ferragem.json
    ├── prod_sofa.json
    ├── prod_family_sofa_adana.json
    ├── prod_module_sofa_adana_1b_140.json
    ├── prod_module_sofa_adana_2b_180.json
    ├── prod_module_sofa_adana_3b_220.json
    └── prod_luminaria.json
```

## Validacao

```bash
cd tools/validator
npm run validate:examples
```
