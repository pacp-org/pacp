# Visualizador PACP

Visualizador interativo para documentos PACP (Padrão Aberto de Catálogo e Precificação).

## Funcionalidades

- **Entrada**: Upload de arquivo .json, colar JSON ou carregar exemplos oficiais
- **Validação**: Valida contra o schema PACP antes de abrir
- **Busca**: Por SKU, id, nome, referência
- **Filtro**: Por categoria
- **Lista de produtos**: Cards com nome, SKU, categoria e preço base
- **Detalhe do produto**: Atributos, opções, imagens, regras aplicadas
- **Formação de preço**: Seletor de opções por atributo; pipeline visual (BASE → SUBTOTAL → TOTAL)
- **Visão do catálogo**: Rulesets, tabelas, constraints, dependencies
- **Export**: Baixar JSON atual

## Desenvolvimento local

```bash
cd tools/viewer
npm install
npm run dev
```

Acesse http://localhost:5173/

## Build para produção

```bash
npm run build
```

O output é gerado em `site/viewer/` para deploy no GitHub Pages.

## Deploy

O workflow `.github/workflows/deploy-pages.yml` faz o build do viewer e publica em https://pacp-org.github.io/pacp/viewer/
