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
- Colunas de lote obrigatório -> `products[].lot_policy`.
- Colunas de embalagem/unidade comercial -> `products[].sales_unit`.
- Colunas de atributo -> `products[].attributes[]`.
- Valores de seleção -> `products[].options[]`.
- Planilhas de preço matricial -> `tables[]` com `dimensions` e `rows`.
- Regras de negócio -> `rulesets[]` e `rules[]`.
- Regras de bloqueio -> `constraints[]`.
- Dependências entre seleções -> `dependencies[]`.
- Colunas de orçamento (quantidade e unidade) -> `context.requested_quantity` e `context.requested_unit`.

## Checklist pré-publicação

- IDs únicos por coleção.
- Referências (`productId`, `tableId`, `rulesetId`, `optionId`) válidas.
- Nenhuma célula obrigatória vazia no JSON final.
- Produto com lote obrigatório possui entrada de lote no `context`.
- Produto com `sales_unit` possui `requested_quantity` e `requested_unit` compatíveis.
- Exemplos representativos validados no CLI.

## Estratégia incremental

1. Comece com `minimal.json` para validar modelo base.
2. Adicione tabelas (`matrix_lookup`) e agregadores (`max_of`).
3. Introduza dependencies/constraints.
4. Ative múltiplas listas de preço e contexto.
5. Só depois adicione extensões `x-*` específicas de domínio.

## Importando `supplied_materials` de planilha

Mapeamento típico de uma aba "Materiais" da planilha do fornecedor:

| Coluna planilha | Campo PACP | Notas |
|---|---|---|
| `produto_id` | (chave de agrupamento) | Materiais com mesmo `produto_id` viram itens em `supplied_materials[]` |
| `material_id` | `supplied_materials[].id` | Único por produto |
| `material_tipo` | `supplied_materials[].material` | Normalizar para SNAKE_UPPER (ex.: "tecido" → `TECIDO`) |
| `qty` | `supplied_materials[].quantity.value` | Se a planilha tiver coluna `qty_tabela` em vez de `qty`, mapear para `quantity.table_id` |
| `unidade` | `supplied_materials[].quantity.unit` | `m2`, `m`, `kg`, etc. |
| `padrao_fonte` | `supplied_materials[].default_source` | `FABRICA` → `FACTORY`, `CLIENTE` → `CUSTOMER` |
| `attribute_id_escolha` | `supplied_materials[].sourcing_attribute_id` | Quando presente, importador DEVE gerar `source_when` lendo as opções declaradas para esse attribute |
| `factory_cost` ou `cost_tabela` | `supplied_materials[].factory_cost.value` ou `.table_id` | Mutuamente exclusivos |
| Colunas `gramatura_min`, `largura_min`, etc. | `requirements.x-fabric_requirements.*` | Profile `moveis` |

**Desentrelaçar `base_price`.** Se a planilha traz `preço_total` (com tecido padrão incluso), o importador DEVE:
1. Subtrair o custo do tecido padrão do `preço_total`.
2. Gravar o resultado em `base_price`.
3. Gravar o custo do tecido padrão (e variações) em `supplied_materials[].factory_cost`.

Sem essa separação, o engine não consegue calcular corretamente o caso "tecido fornecido pelo cliente" (não sabe quanto subtrair).
