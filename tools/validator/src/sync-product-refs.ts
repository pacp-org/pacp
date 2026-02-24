#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

type ProductRef = {
  id: string;
  path: string;
};

function usage(): void {
  console.error("Uso: pacp-sync-product-refs <catalogo.json> [diretorio-products]");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readJsonFile(filePath: string): JsonValue {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as JsonValue;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`JSON invalido em ${filePath}: ${error.message}`);
    }
    throw new Error(`Nao foi possivel ler ${filePath}: ${(error as Error).message}`);
  }
}

function collectJsonFilesRecursively(rootDir: string): string[] {
  const files: string[] = [];
  const stack: string[] = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolute);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".json")) {
        files.push(absolute);
      }
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

function toPosixPath(inputPath: string): string {
  return inputPath.split(path.sep).join("/");
}

function syncProductRefs(catalogFilePathArg: string, productsDirArg?: string): number {
  const catalogFilePath = path.resolve(process.cwd(), catalogFilePathArg);
  if (!fs.existsSync(catalogFilePath)) {
    console.error(`Arquivo de catalogo nao encontrado: ${catalogFilePath}`);
    return 1;
  }

  let catalogDoc: JsonValue;
  try {
    catalogDoc = readJsonFile(catalogFilePath);
  } catch (error) {
    console.error((error as Error).message);
    return 1;
  }

  if (!isRecord(catalogDoc)) {
    console.error("Catalogo deve ser um objeto JSON.");
    return 1;
  }

  if (catalogDoc.document_type !== "CATALOG") {
    console.error("Arquivo informado deve ter document_type=\"CATALOG\".");
    return 1;
  }

  if (!isRecord(catalogDoc.catalog) || typeof catalogDoc.catalog.id !== "string" || catalogDoc.catalog.id.length === 0) {
    console.error("Catalogo invalido: campo catalog.id obrigatorio.");
    return 1;
  }

  const catalogId = catalogDoc.catalog.id;
  const catalogDir = path.dirname(catalogFilePath);
  const productsDir = productsDirArg
    ? path.resolve(catalogDir, productsDirArg)
    : path.resolve(catalogDir, "products");

  if (!fs.existsSync(productsDir) || !fs.statSync(productsDir).isDirectory()) {
    console.error(`Diretorio de produtos nao encontrado: ${productsDir}`);
    return 1;
  }

  const productFiles = collectJsonFilesRecursively(productsDir);
  if (productFiles.length === 0) {
    console.error(`Nenhum arquivo JSON encontrado em: ${productsDir}`);
    return 1;
  }

  const refs: ProductRef[] = [];
  const seenProductIds = new Set<string>();

  let skippedByCatalogId = 0;

  for (const productFilePath of productFiles) {
    let productDoc: JsonValue;
    try {
      productDoc = readJsonFile(productFilePath);
    } catch (error) {
      console.error((error as Error).message);
      return 1;
    }

    if (!isRecord(productDoc)) {
      console.error(`Arquivo de produto invalido (nao e objeto): ${productFilePath}`);
      return 1;
    }

    if (productDoc.document_type !== "PRODUCT") {
      console.error(`Arquivo de produto sem document_type=\"PRODUCT\": ${productFilePath}`);
      return 1;
    }

    if (productDoc.spec !== "1.0.0") {
      console.error(`Arquivo de produto com spec invalida: ${productFilePath}`);
      return 1;
    }

    if (productDoc.catalog_id !== catalogId) {
      skippedByCatalogId += 1;
      continue;
    }

    if (!isRecord(productDoc.product) || typeof productDoc.product.id !== "string" || productDoc.product.id.length === 0) {
      console.error(`Arquivo de produto sem product.id valido: ${productFilePath}`);
      return 1;
    }

    const productId = productDoc.product.id;
    if (seenProductIds.has(productId)) {
      console.error(`product.id duplicado encontrado: "${productId}"`);
      return 1;
    }
    seenProductIds.add(productId);

    const relativePath = toPosixPath(path.relative(catalogDir, productFilePath));
    refs.push({
      id: productId,
      path: relativePath
    });
  }

  if (refs.length === 0) {
    console.error(
      `Nenhum produto com catalog_id="${catalogId}" encontrado em ${productsDir}.` +
      (skippedByCatalogId > 0 ? ` (${skippedByCatalogId} arquivo(s) ignorado(s) por catalog_id diferente)` : "")
    );
    return 1;
  }

  refs.sort((a, b) => a.path.localeCompare(b.path) || a.id.localeCompare(b.id));
  catalogDoc.product_refs = refs;

  const formatted = `${JSON.stringify(catalogDoc, null, 2)}\n`;
  fs.writeFileSync(catalogFilePath, formatted, "utf8");

  console.log(
    `OK: product_refs atualizado em ${catalogFilePathArg} com ${refs.length} produto(s).` +
    (skippedByCatalogId > 0 ? ` ${skippedByCatalogId} arquivo(s) ignorado(s) por catalog_id diferente.` : "")
  );
  return 0;
}

function main(): void {
  const catalogFilePath = process.argv[2];
  const productsDir = process.argv[3];
  if (!catalogFilePath) {
    usage();
    process.exit(1);
  }

  process.exit(syncProductRefs(catalogFilePath, productsDir));
}

main();
