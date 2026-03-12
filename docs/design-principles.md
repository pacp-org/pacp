# Princípios de Design do PACP

## 1. Determinismo

A mesma entrada DEVE produzir o mesmo resultado. Toda ambiguidade de ordem, prioridade e fallback deve ser eliminada na modelagem.

## 2. Neutralidade

O padrão DEVE ser independente de fornecedor e tecnologia de implementação.

## 3. Separação de responsabilidades

- Constraints/dependencies: validam e bloqueiam combinações.
- Rulesets/operações: calculam preço.

Essas fases NÃO DEVEM ser misturadas.

## 4. Modelagem orientada a dados

PACP modela produtos por atributos, opções, tabelas e regras. O padrão NÃO DEVE exigir expansão total de variantes.

## 5. Compatibilidade progressiva

Extensões `x-*` PODEM coexistir com o contrato base sem quebrar consumidores compatíveis.

## 6. Core universal + Profiles por vertical

Campos que mais de 80% dos implementadores precisam (independente do setor) pertencem ao core do `product`: `sku`, `manufacturer`, `brand`, `description`, `gtin`, `images`, `weight`, `dimensions`, `tags`.

Campos específicos de um setor (ex.: `x-lumens` para iluminação, `x-pei` para pisos) são padronizados via **extension profiles** — JSON Schemas independentes que definem e validam extensões `x-*` por vertical.

Profiles são aditivos e opcionais. Campos `x-*` sem profile declarado continuam válidos. Essa separação garante que o core não infle com demandas setoriais e que cada vertical tenha um contrato formal para suas extensões.

## 7. Operabilidade

O padrão DEVE ser fácil de validar automaticamente (schema + checks semânticos) e fácil de importar a partir de planilhas.
