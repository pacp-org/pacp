# Fixtures negativas do validador

Cada arquivo aqui é um PACP document **deliberadamente inválido** que o validador CLI DEVE rejeitar com um código de erro específico.

## Como rodar

```bash
cd tools/validator
npm run build
node dist/cli.js test/fixtures/<arquivo>.json
```

Cada execução deve sair com **exit code 2** (validação falhou) e imprimir o código de erro esperado no formato `[CODE] /path: mensagem`.

## Fixtures: supplied_materials

| Arquivo | Código esperado |
|---|---|
| `supplied_invalid_no_source_when.json` | `INVALID_SOURCE_WHEN` |
| `supplied_invalid_unknown_attribute.json` | `MISSING_SOURCING_ATTRIBUTE` |
| `supplied_invalid_uncovered_option.json` | `UNCOVERED_OPTION_VALUE` |
| `supplied_invalid_duplicate_id.json` | `DUPLICATE_SUPPLIED_MATERIAL_ID` |

## Fixtures: lot_policy

| Arquivo | Código esperado | Notas |
|---|---|---|
| `lot_invalid_missing_required.json` | `MISSING_REQUIRED_LOT` | CATALOG com `context` sem `lot_id`; produto referenciado via `product_refs` |
| `lot_invalid_attribute_source.json` | `INVALID_LOT_POLICY` | PRODUCT com `lot_policy.source="ATTRIBUTE"` e `attribute_id` que não existe nas options |

## Fixtures: sales_unit

| Arquivo | Código esperado | Notas |
|---|---|---|
| `sales_unit_invalid_unit_mismatch.json` | `UNIT_SALES_UNIT_MISMATCH` | PRODUCT com `unit="m2"` e `sales_unit.requested_unit="L"` |
| `sales_unit_invalid_missing_qty.json` | `MISSING_REQUESTED_QUANTITY` | CATALOG sem `context.requested_quantity`; produto com `sales_unit` |
| `sales_unit_invalid_unit_request_mismatch.json` | `REQUESTED_UNIT_MISMATCH` | CATALOG com `context.requested_unit="L"` mas produto exige `"m2"` |
| `sales_unit_invalid_rounding.json` | `[SCHEMA]` (enum) | PRODUCT com `sales_unit.rounding="BANKER"`; rejeitado pelo schema antes da validação semântica |

## Fixtures: refs e IDs

| Arquivo | Código esperado | Notas |
|---|---|---|
| `ref_invalid_broken_table.json` | `BROKEN_REFERENCE` | CATALOG com regra `LOOKUP` apontando para `tbl_inexistente` não declarada |
| `ids_invalid_duplicate_product.json` | `DUPLICATE_ID` | CATALOG com dois `product_refs` de mesmo `id` |
| `product_ref_missing_file.json` | `MISSING_PRODUCT_FILE` | CATALOG com `product_refs` apontando para arquivo inexistente |

## Fixtures: rules

| Arquivo | Código esperado | Notas |
|---|---|---|
| `rule_invalid_add_missing_value.json` | `INVALID_OPERATION_PARAMS` | CATALOG com regra `operation="ADD"` sem campo `value` |
| `rule_invalid_tax_missing_rate.json` | `INVALID_OPERATION_PARAMS` | CATALOG com regra `operation="TAX"` sem campo `rate` |
| `rule_invalid_discount_missing_params.json` | `INVALID_OPERATION_PARAMS` | CATALOG com regra `operation="DISCOUNT"` sem `value` nem `rate` |
| `rule_invalid_discount_both_params.json` | `INVALID_OPERATION_PARAMS` | CATALOG com regra `operation="DISCOUNT"` com `value` E `rate` (deve ter exatamente um) |
| `rule_invalid_maxof_one_component.json` | `[SCHEMA]` + `INVALID_OPERATION_PARAMS` | CATALOG com `MAX_OF` de 1 componente; schema exige `minItems: 2` e o CLI reforça. |

## Fixtures: documento PRODUCT isolado (checks semânticos)

Garantem que um arquivo `PRODUCT` avulso tem seus `rulesets`/`tables` validados (antes só o schema rodava).

| Arquivo | Código esperado | Notas |
|---|---|---|
| `product_invalid_lookup_key.json` | `INVALID_LOOKUP_KEY` | PRODUCT com `tables` inline cuja `row.key` usa chave não declarada em `dimensions`. |
| `product_invalid_duplicate_rule_id.json` | `DUPLICATE_ID` | PRODUCT com dois `rules` de mesmo `id` no mesmo ruleset. |
| `catalog_ref_product_invalid_rule.json` | `INVALID_LOOKUP_KEY` | CATALOG cujo produto (via `product_refs`) traz `tables` inline com chave inválida — valida que rulesets/tables de arquivo-produto são mesclados e checados. Usa `products/prod_ref_bad_lookup.json`. |

## Fixtures: hierarquia família/módulo

| Arquivo | Código esperado | Notas |
|---|---|---|
| `family_invalid_module_missing_family_id.json` | `[SCHEMA]` | PRODUCT `role=MODULE` sem `family_product_id`; rejeitado pelo schema (allOf if/then). |
| `family_invalid_family_with_base_price.json` | `[SCHEMA]` | PRODUCT `role=FAMILY` com `base_price`; rejeitado pelo schema. |
| `family_invalid_standalone_with_family_id.json` | `[SCHEMA]` | PRODUCT `role=STANDALONE` com `family_product_id`; rejeitado pelo schema. |
| `family_invalid_module_unknown_family.json` | `MISSING_FAMILY_PRODUCT` | CATALOG: MODULE aponta para `family_product_id` que não existe no catálogo. |
| `family_invalid_member_ids_desynced.json` | `FAMILY_MEMBER_MISMATCH` + `MISSING_FAMILY_PRODUCT` | CATALOG: FAMILY lista MODULE em `member_product_ids`, mas MODULE.`family_product_id` aponta para outra família (inexistente). |
| `family_invalid_module_pointing_to_standalone.json` | `INVALID_FAMILY_TARGET` | CATALOG: MODULE.`family_product_id` aponta para um produto que existe mas tem `role=STANDALONE`. |

## Verificação rápida (todos devem sair exit=2)

```bash
cd tools/validator
for f in test/fixtures/*.json; do
  node dist/cli.js "$f" >/dev/null 2>&1
  code=$?; echo "$(basename $f) exit=$code"
done
```

Fixtures NÃO são executadas por `npm run validate:examples` (pasta está fora de `spec/latest/examples`).

## Produto auxiliares em `products/`

Os fixtures CATALOG que precisam carregar produtos via `product_refs` usam arquivos em `test/fixtures/products/`:

| Arquivo | Usado por |
|---|---|
| `prod_with_lot.json` | `lot_invalid_missing_required.json` |
| `prod_with_sales_unit.json` | `sales_unit_invalid_missing_qty.json`, `sales_unit_invalid_unit_request_mismatch.json` |
| `prod_simple.json` | `ids_invalid_duplicate_product.json` |
| `prod_family_module_orphan.json` | `family_invalid_module_unknown_family.json` |
| `prod_family_fam.json` | `family_invalid_member_ids_desynced.json` |
| `prod_family_module_desynced.json` | `family_invalid_member_ids_desynced.json` |
| `prod_family_standalone_target.json` | `family_invalid_module_pointing_to_standalone.json` |
| `prod_family_module_to_standalone.json` | `family_invalid_module_pointing_to_standalone.json` |
| `prod_ref_bad_lookup.json` | `catalog_ref_product_invalid_rule.json` |
