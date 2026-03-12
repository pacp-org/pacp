# PACP - Padrão Aberto de Catálogo e Precificação

## Project Overview
PACP is an open standard for modeling product catalogs and pricing in a deterministic way. This repository serves as the specification, documentation, and tooling hub for the PACP standard.

## Project Structure

- `site/` - Static website (served on port 5000)
  - `index.html` - Main landing page (Portuguese)
  - `css/style.css` - Stylesheet
- `spec/` - JSON Schema specifications and examples
  - `1.0.0/` - Version 1.0.0 of the spec
  - `latest.json` - Stable pointer to the latest published spec
- `docs/` - Practical guides (integration, pricing engine, governance, etc.)
- `tools/validator/` - TypeScript CLI tool for validating PACP documents

## Running the Project

The project uses a Node.js HTTP server (`serve.js`) to serve the static site.

- **Workflow**: "Start application" → `node serve.js`
- **Port**: 5000
- **Host**: 0.0.0.0

## Validator CLI

The validator is a separate TypeScript tool located in `tools/validator/`:

```bash
cd tools/validator
npm ci
npm run build
npm run validate -- ../../spec/1.0.0/examples/geral/minimal.json
```

## Deployment

Configured as a **static** deployment serving the `site/` directory.

## Tech Stack

- **Runtime**: Node.js 20
- **Frontend**: Static HTML/CSS
- **Validator**: TypeScript + AJV (JSON Schema validation)
- **Language**: Portuguese (Brazilian)
