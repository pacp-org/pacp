#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { ErrorObject } from "ajv";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

type Issue = {
  code: string;
  path: string;
  message: string;
};

type CollectedIds = {
  products: Set<string>;
  tables: Set<string>;
  rulesets: Set<string>;
  options: Set<string>;
};

function usage(): void {
  console.error("Uso: pacp-validate <arquivo.json>");
}

function readJsonFile(filePath: string, options?: { allowEmptyObject?: boolean }): JsonValue {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    if (options?.allowEmptyObject && raw.trim().length === 0) {
      return {} as JsonValue;
    }
    return JSON.parse(raw) as JsonValue;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`JSON invalido em ${filePath}: ${error.message}`);
    }
    throw new Error(`Nao foi possivel ler ${filePath}: ${(error as Error).message}`);
  }
}

function formatAjvError(error: ErrorObject): Issue {
  const dataPath = error.instancePath || "/";
  return {
    code: "SCHEMA",
    path: dataPath,
    message: error.message ?? "Erro de validacao de schema"
  };
}

function getArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function collectIdsAndDuplicates(doc: Record<string, unknown>, issues: Issue[]): CollectedIds {
  const collected: CollectedIds = {
    products: new Set<string>(),
    tables: new Set<string>(),
    rulesets: new Set<string>(),
    options: new Set<string>()
  };

  const checkDuplicates = (
    items: unknown[],
    groupName: "products" | "tables" | "rulesets",
    pathPrefix: string
  ): void => {
    const seen = new Set<string>();
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i] as Record<string, unknown>;
      const id = item?.id;
      if (typeof id !== "string" || id.trim().length === 0) {
        continue;
      }
      if (seen.has(id)) {
        issues.push({
          code: "DUPLICATE_ID",
          path: `${pathPrefix}[${i}].id`,
          message: `ID duplicado encontrado em ${groupName}: "${id}"`
        });
      } else {
        seen.add(id);
        collected[groupName].add(id);
      }
    }
  };

  const products = getArray<Record<string, unknown>>(doc.products);
  const tables = getArray<Record<string, unknown>>(doc.tables);
  const rulesets = getArray<Record<string, unknown>>(doc.rulesets);

  checkDuplicates(products, "products", "/products");
  checkDuplicates(tables, "tables", "/tables");
  checkDuplicates(rulesets, "rulesets", "/rulesets");

  for (let i = 0; i < products.length; i += 1) {
    const product = products[i];
    const options = getArray<Record<string, unknown>>(product.options);
    for (let j = 0; j < options.length; j += 1) {
      const optionId = options[j]?.id;
      if (typeof optionId !== "string" || optionId.trim().length === 0) {
        continue;
      }
      if (collected.options.has(optionId)) {
        issues.push({
          code: "DUPLICATE_ID",
          path: `/products[${i}]/options[${j}]/id`,
          message: `ID duplicado de option encontrado: "${optionId}"`
        });
      } else {
        collected.options.add(optionId);
      }
    }
  }

  return collected;
}

function checkBrokenReferences(
  node: unknown,
  ids: CollectedIds,
  issues: Issue[],
  currentPath = ""
): void {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i += 1) {
      checkBrokenReferences(node[i], ids, issues, `${currentPath}[${i}]`);
    }
    return;
  }

  if (!node || typeof node !== "object") {
    return;
  }

  const obj = node as Record<string, unknown>;
  const singularRef: Record<string, keyof CollectedIds> = {
    productId: "products",
    tableId: "tables",
    rulesetId: "rulesets",
    optionId: "options"
  };
  const pluralRef: Record<string, keyof CollectedIds> = {
    productIds: "products",
    tableIds: "tables",
    rulesetIds: "rulesets",
    optionIds: "options"
  };

  for (const [key, value] of Object.entries(obj)) {
    const pointerPath = `${currentPath}/${key}` || `/${key}`;

    if (key in singularRef && typeof value === "string") {
      const bucket = singularRef[key];
      if (!ids[bucket].has(value)) {
        issues.push({
          code: "BROKEN_REFERENCE",
          path: pointerPath,
          message: `Referencia quebrada: ${key}="${value}" nao existe em ${bucket}`
        });
      }
    } else if (key in pluralRef && Array.isArray(value)) {
      const bucket = pluralRef[key];
      for (let i = 0; i < value.length; i += 1) {
        const id = value[i];
        if (typeof id === "string" && !ids[bucket].has(id)) {
          issues.push({
            code: "BROKEN_REFERENCE",
            path: `${pointerPath}[${i}]`,
            message: `Referencia quebrada: ${key}[${i}]="${id}" nao existe em ${bucket}`
          });
        }
      }
    }

    checkBrokenReferences(value, ids, issues, pointerPath);
  }
}

function normalizeLookupKeyId(entry: unknown): string | null {
  if (typeof entry === "string") {
    return entry;
  }
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const obj = entry as Record<string, unknown>;
  if (typeof obj.optionId === "string") {
    return obj.optionId;
  }
  if (typeof obj.id === "string") {
    return obj.id;
  }
  if (typeof obj.name === "string") {
    return obj.name;
  }
  return null;
}

function checkLookupKeys(doc: Record<string, unknown>, ids: CollectedIds, issues: Issue[]): void {
  const tables = getArray<Record<string, unknown>>(doc.tables);
  for (let tIndex = 0; tIndex < tables.length; tIndex += 1) {
    const table = tables[tIndex];
    const tableType = String(table.type ?? table.kind ?? "").toUpperCase();
    const isLookup = tableType === "LOOKUP" || table.lookup === true;
    if (!isLookup) {
      continue;
    }

    const keyEntries = getArray<unknown>(table.keys);
    const allowedKeys = new Set<string>();
    for (const entry of keyEntries) {
      const keyId = normalizeLookupKeyId(entry);
      if (keyId) {
        allowedKeys.add(keyId);
      }
    }

    for (const keyId of allowedKeys) {
      if (ids.options.size > 0 && !ids.options.has(keyId)) {
        issues.push({
          code: "INVALID_LOOKUP_KEY",
          path: `/tables[${tIndex}]/keys`,
          message: `Lookup key invalida: "${keyId}" nao corresponde a nenhuma option.id`
        });
      }
    }

    const rows = getArray<Record<string, unknown>>(table.rows);
    for (let rIndex = 0; rIndex < rows.length; rIndex += 1) {
      const row = rows[rIndex];
      const rowKey = row.key ?? row.keys;
      if (!rowKey || typeof rowKey !== "object" || Array.isArray(rowKey)) {
        continue;
      }
      const rowKeyObject = rowKey as Record<string, unknown>;
      for (const rowKeyName of Object.keys(rowKeyObject)) {
        if (allowedKeys.size > 0 && !allowedKeys.has(rowKeyName)) {
          issues.push({
            code: "INVALID_LOOKUP_KEY",
            path: `/tables[${tIndex}]/rows[${rIndex}]/key/${rowKeyName}`,
            message: `Row da tabela lookup usa key invalida: "${rowKeyName}"`
          });
        }
      }
    }
  }
}

function checkRulesSemanticBasics(doc: Record<string, unknown>, issues: Issue[]): void {
  const rulesets = getArray<Record<string, unknown>>(doc.rulesets);
  for (let rsIndex = 0; rsIndex < rulesets.length; rsIndex += 1) {
    const ruleset = rulesets[rsIndex];
    const target = ruleset.target;
    if (typeof target === "string" && !["BASE", "SUBTOTAL", "TOTAL"].includes(target)) {
      issues.push({
        code: "INVALID_RULESET_TARGET",
        path: `/rulesets[${rsIndex}]/target`,
        message: `Target invalido em ruleset: "${target}"`
      });
    }

    const rules = getArray<Record<string, unknown>>(ruleset.rules);
    const seenRuleIds = new Set<string>();
    for (let rIndex = 0; rIndex < rules.length; rIndex += 1) {
      const rule = rules[rIndex];
      const ruleId = rule.id;
      if (typeof ruleId === "string" && ruleId.trim().length > 0) {
        if (seenRuleIds.has(ruleId)) {
          issues.push({
            code: "DUPLICATE_ID",
            path: `/rulesets[${rsIndex}]/rules[${rIndex}]/id`,
            message: `ID de regra duplicado no ruleset: "${ruleId}"`
          });
        } else {
          seenRuleIds.add(ruleId);
        }
      }

      const op = String(rule.operation ?? "").toUpperCase();
      const rulePath = `/rulesets[${rsIndex}]/rules[${rIndex}]`;
      if (!op) {
        continue;
      }

      if ((op === "ADD" || op === "OVERRIDE") && typeof rule.value !== "number") {
        issues.push({
          code: "INVALID_OPERATION_PARAMS",
          path: `${rulePath}/value`,
          message: `Operacao ${op} exige campo numerico "value"`
        });
      }
      if (op === "PERCENT_OF" && typeof rule.percent !== "number") {
        issues.push({
          code: "INVALID_OPERATION_PARAMS",
          path: `${rulePath}/percent`,
          message: "Operacao PERCENT_OF exige campo numerico \"percent\""
        });
      }
      if (op === "LOOKUP" && typeof rule.tableId !== "string") {
        issues.push({
          code: "INVALID_OPERATION_PARAMS",
          path: `${rulePath}/tableId`,
          message: "Operacao LOOKUP exige \"tableId\""
        });
      }
      if ((op === "MAX_OF" || op === "MIN_OF") && getArray(rule.components).length < 2) {
        issues.push({
          code: "INVALID_OPERATION_PARAMS",
          path: `${rulePath}/components`,
          message: `Operacao ${op} exige ao menos 2 componentes`
        });
      }
    }
  }
}

function checkLotAndSalesUnitSemantics(doc: Record<string, unknown>, issues: Issue[]): void {
  const products = getArray<Record<string, unknown>>(doc.products);
  const context = (doc.context && typeof doc.context === "object" && !Array.isArray(doc.context))
    ? (doc.context as Record<string, unknown>)
    : {};

  for (let pIndex = 0; pIndex < products.length; pIndex += 1) {
    const product = products[pIndex];
    const productPath = `/products[${pIndex}]`;
    const productId = typeof product.id === "string" ? product.id : `index_${pIndex}`;

    const lotPolicy = (product.lot_policy && typeof product.lot_policy === "object" && !Array.isArray(product.lot_policy))
      ? (product.lot_policy as Record<string, unknown>)
      : null;

    if (lotPolicy && lotPolicy.required === true) {
      const source = typeof lotPolicy.source === "string" ? lotPolicy.source : "CONTEXT";

      if (source === "CONTEXT") {
        const contextKey = typeof lotPolicy.contextKey === "string" ? lotPolicy.contextKey : "lot_id";
        const lotValue = context[contextKey];
        if (typeof lotValue !== "string" || lotValue.trim().length === 0) {
          issues.push({
            code: "MISSING_REQUIRED_LOT",
            path: `/context/${contextKey}`,
            message: `Produto "${productId}" exige lote obrigatorio via context.${contextKey}`
          });
        }
      }

      if (source === "ATTRIBUTE") {
        const attributeId = lotPolicy.attributeId;
        const options = getArray<Record<string, unknown>>(product.options);
        const hasLotOption = typeof attributeId === "string" && options.some((option) => option.attributeId === attributeId);
        if (!hasLotOption) {
          issues.push({
            code: "INVALID_LOT_POLICY",
            path: `${productPath}/lot_policy/attributeId`,
            message: `Produto "${productId}" exige option com attributeId de lote configurado em lot_policy`
          });
        }
      }
    }

    const salesUnit = (product.sales_unit && typeof product.sales_unit === "object" && !Array.isArray(product.sales_unit))
      ? (product.sales_unit as Record<string, unknown>)
      : null;

    if (!salesUnit) {
      continue;
    }

    const requestedQuantity = context.requested_quantity;
    const requestedUnit = context.requested_unit;
    const expectedRequestedUnit = salesUnit.requested_unit;
    const quantityPerSellUnit = salesUnit.quantity_per_sell_unit;
    const rounding = salesUnit.rounding;
    const minSellUnits = salesUnit.min_sell_units;

    if (typeof requestedQuantity !== "number" || !Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
      issues.push({
        code: "MISSING_REQUESTED_QUANTITY",
        path: "/context/requested_quantity",
        message: `Produto "${productId}" possui sales_unit e exige context.requested_quantity > 0`
      });
    }

    if (typeof requestedUnit !== "string" || requestedUnit.trim().length === 0) {
      issues.push({
        code: "MISSING_REQUESTED_UNIT",
        path: "/context/requested_unit",
        message: `Produto "${productId}" possui sales_unit e exige context.requested_unit`
      });
    }

    if (
      typeof requestedUnit === "string"
      && typeof expectedRequestedUnit === "string"
      && requestedUnit !== expectedRequestedUnit
    ) {
      issues.push({
        code: "REQUESTED_UNIT_MISMATCH",
        path: "/context/requested_unit",
        message: `Produto "${productId}" exige requested_unit="${expectedRequestedUnit}", recebido "${requestedUnit}"`
      });
    }

    if (rounding !== "CEIL") {
      issues.push({
        code: "INVALID_SALES_UNIT_ROUNDING",
        path: `${productPath}/sales_unit/rounding`,
        message: `Produto "${productId}" deve usar rounding="CEIL" em sales_unit`
      });
    }

    const hasValidQtyPerSellUnit =
      typeof quantityPerSellUnit === "number" && Number.isFinite(quantityPerSellUnit) && quantityPerSellUnit > 0;
    const hasValidRequestedQuantity =
      typeof requestedQuantity === "number" && Number.isFinite(requestedQuantity) && requestedQuantity > 0;
    const hasValidMinSellUnits =
      typeof minSellUnits === "number" && Number.isInteger(minSellUnits) && minSellUnits > 0;

    if (hasValidQtyPerSellUnit && hasValidRequestedQuantity) {
      let requiredSellUnits = Math.ceil(requestedQuantity / quantityPerSellUnit);
      if (hasValidMinSellUnits) {
        requiredSellUnits = Math.max(requiredSellUnits, minSellUnits as number);
      }

      const expectedSellUnits = context["x-expected_required_sell_units"];
      if (typeof expectedSellUnits === "number" && Number.isFinite(expectedSellUnits) && expectedSellUnits !== requiredSellUnits) {
        issues.push({
          code: "EXPECTED_SELL_UNITS_MISMATCH",
          path: "/context/x-expected_required_sell_units",
          message: `Esperado ${expectedSellUnits}, calculado ${requiredSellUnits} para produto "${productId}"`
        });
      }
    }
  }
}

function validatePacp(filePath: string): number {
  const absoluteFilePath = path.resolve(process.cwd(), filePath);
  const schemaPath = path.resolve(__dirname, "../../../spec/1.0.0/pacp.schema.json");

  if (!fs.existsSync(schemaPath)) {
    console.error(`Schema nao encontrado: ${schemaPath}`);
    return 1;
  }
  if (fs.statSync(schemaPath).size === 0) {
    console.warn("Aviso: schema PACP esta vazio; usando objeto {} temporariamente.");
  }
  if (!fs.existsSync(absoluteFilePath)) {
    console.error(`Arquivo nao encontrado: ${absoluteFilePath}`);
    return 1;
  }

  let schemaData: JsonValue;
  let docData: JsonValue;
  try {
    schemaData = readJsonFile(schemaPath, { allowEmptyObject: true });
    docData = readJsonFile(absoluteFilePath);
  } catch (error) {
    console.error((error as Error).message);
    return 1;
  }

  const ajv = new Ajv2020({
    allErrors: true,
    strict: false
  });
  addFormats(ajv);

  let validate;
  try {
    validate = ajv.compile(schemaData as Record<string, unknown>);
  } catch (error) {
    console.error(`Falha ao compilar schema: ${(error as Error).message}`);
    return 1;
  }

  const issues: Issue[] = [];
  const validSchema = validate(docData);
  if (!validSchema && validate.errors) {
    for (const error of validate.errors) {
      issues.push(formatAjvError(error));
    }
  }

  if (docData && typeof docData === "object" && !Array.isArray(docData)) {
    const objectDoc = docData as Record<string, unknown>;
    const ids = collectIdsAndDuplicates(objectDoc, issues);
    checkBrokenReferences(objectDoc, ids, issues);
    checkLookupKeys(objectDoc, ids, issues);
    checkRulesSemanticBasics(objectDoc, issues);
    checkLotAndSalesUnitSemantics(objectDoc, issues);
  }

  if (issues.length > 0) {
    console.error(`Falha na validacao de ${filePath}. ${issues.length} erro(s):`);
    for (const issue of issues) {
      console.error(`- [${issue.code}] ${issue.path}: ${issue.message}`);
    }
    return 2;
  }

  console.log(`OK: ${filePath} esta valido.`);
  return 0;
}

function main(): void {
  const inputFile = process.argv[2];
  if (!inputFile) {
    usage();
    process.exit(1);
  }
  process.exit(validatePacp(inputFile));
}

main();
