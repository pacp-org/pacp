# PACP - Padrão Aberto de Catálogo e Precificação

## Project Overview
PACP is an open standard for modeling product catalogs and pricing in a deterministic way. This repository serves as the specification, documentation, and tooling hub for the PACP standard.

## Project Structure

- `site/` - Static website (served on port 5000)
  - `index.html` - Main landing page (Portuguese) - dark theme, premium design
  - `css/style.css` - Stylesheet with dark-first design system, amber/orange accent palette
- `spec/` - JSON Schema specifications and examples
  - `1.0.0/` - Version 1.0.0 of the spec
  - `latest.json` - Stable pointer to the latest published spec
- `docs/` - Practical guides (integration, pricing engine, governance, etc.)
- `tools/validator/` - TypeScript CLI tool for validating PACP documents
- `serve.js` - Simple Node.js HTTP server for development

## Running the Project

The project uses a Node.js HTTP server (`serve.js`) to serve the static site.

- **Workflow**: "Start application" -> `node serve.js`
- **Port**: 5000
- **Host**: 0.0.0.0

## Site Design

- Dark-first premium design (bg: #09090b, accent: #f59e0b amber)
- Sections: Hero, Problem (before/after), Features, Architecture (with syntax-highlighted JSON), Pricing Pipeline, Extension Profiles (interactive tabs), Integration Steps (timeline + terminal), Resources, Footer
- IntersectionObserver-powered scroll animations with progressive enhancement (no-js fallback)
- Responsive: 3 breakpoints (desktop, tablet 900px, mobile 768px) with hamburger nav
- Accessibility: ARIA roles for tabs and hamburger, aria-hidden on decorative SVGs, semantic HTML with main landmark
- All external links have rel="noopener noreferrer"
- No external JS dependencies - vanilla JavaScript for interactivity (tabs, mobile nav, scroll animations)

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
- **Frontend**: Static HTML/CSS/JS (no framework)
- **Fonts**: Inter + JetBrains Mono (Google Fonts)
- **Validator**: TypeScript + AJV (JSON Schema validation)
- **Language**: Portuguese (Brazilian)
