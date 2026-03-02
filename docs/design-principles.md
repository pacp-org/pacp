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

## 6. Operabilidade

O padrão DEVE ser fácil de validar automaticamente (schema + checks semânticos) e fácil de importar a partir de planilhas.
