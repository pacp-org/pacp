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

type DocumentType = "CATALOG" | "PRODUCT";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
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
    product_id: "products",
    table_id: "tables",
    ruleset_id: "rulesets",
    option_id: "options"
  };
  const pluralRef: Record<string, keyof CollectedIds> = {
    product_ids: "products",
    table_ids: "tables",
    ruleset_ids: "rulesets",
    option_ids: "options"
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

function checkLookupDimensions(doc: Record<string, unknown>, ids: CollectedIds, issues: Issue[]): void {
  const tables = getArray<Record<string, unknown>>(doc.tables);
  for (let tIndex = 0; tIndex < tables.length; tIndex += 1) {
    const table = tables[tIndex];
    const tableType = String(table.type ?? "").toUpperCase();
    if (tableType !== "LOOKUP") {
      continue;
    }

    const dimensions = getArray<Record<string, unknown>>(table.dimensions);
    const dimensionKeys = new Set<string>();
    for (const dim of dimensions) {
      const key = dim.key;
      if (typeof key === "string") {
        dimensionKeys.add(key);
      }
    }

    const rows = getArray<Record<string, unknown>>(table.rows);
    for (let rIndex = 0; rIndex < rows.length; rIndex += 1) {
      const row = rows[rIndex];
      const rowKey = row.key;
      if (!rowKey || typeof rowKey !== "object" || Array.isArray(rowKey)) {
        continue;
      }
      const rowKeyObject = rowKey as Record<string, unknown>;
      for (const rowKeyName of Object.keys(rowKeyObject)) {
        if (dimensionKeys.size > 0 && !dimensionKeys.has(rowKeyName)) {
          issues.push({
            code: "INVALID_LOOKUP_KEY",
            path: `/tables[${tIndex}]/rows[${rIndex}]/key/${rowKeyName}`,
            message: `Row da tabela lookup usa key invalida: "${rowKeyName}" (nao declarada em dimensions)`
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
      if (op === "LOOKUP" && typeof rule.table_id !== "string") {
        issues.push({
          code: "INVALID_OPERATION_PARAMS",
          path: `${rulePath}/table_id`,
          message: "Operacao LOOKUP exige \"table_id\""
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
        const contextKey = typeof lotPolicy.context_key === "string" ? lotPolicy.context_key : "lot_id";
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
        const attributeId = lotPolicy.attribute_id;
        const options = getArray<Record<string, unknown>>(product.options);
        const hasLotOption = typeof attributeId === "string" && options.some((option) => option.attribute_id === attributeId);
        if (!hasLotOption) {
          issues.push({
            code: "INVALID_LOT_POLICY",
            path: `${productPath}/lot_policy/attribute_id`,
            message: `Produto "${productId}" exige option com attribute_id de lote configurado em lot_policy`
          });
        }
      }
    }

    const salesUnit = (product.sales_unit && typeof product.sales_unit === "object" && !Array.isArray(product.sales_unit))
      ? (product.sales_unit as Record<string, unknown>)
      : null;

    if (typeof product.unit === "string" && salesUnit) {
      const suRequestedUnit = salesUnit.requested_unit;
      if (typeof suRequestedUnit === "string" && product.unit !== suRequestedUnit) {
        issues.push({
          code: "UNIT_SALES_UNIT_MISMATCH",
          path: `${productPath}/unit`,
          message: `Produto "${productId}" declara unit="${product.unit}" mas sales_unit.requested_unit="${suRequestedUnit}". Devem ser iguais.`
        });
      }
    }

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

    const validRoundings = ["CEIL", "FLOOR", "ROUND", "HALF_UP"];
    if (typeof rounding !== "string" || !validRoundings.includes(rounding)) {
      issues.push({
        code: "INVALID_SALES_UNIT_ROUNDING",
        path: `${productPath}/sales_unit/rounding`,
        message: `Produto "${productId}" deve usar rounding valido (${validRoundings.join(", ")}) em sales_unit`
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

function checkProductDocumentSemanticBasics(doc: Record<string, unknown>, issues: Issue[]): void {
  if (!isRecord(doc.product)) {
    return;
  }

  const product = doc.product;
  const productId = typeof product.id === "string" ? product.id : "unknown_product";
  const options = getArray<Record<string, unknown>>(product.options);
  const seenOptionIds = new Set<string>();

  for (let i = 0; i < options.length; i += 1) {
    const optionId = options[i]?.id;
    if (typeof optionId !== "string" || optionId.trim().length === 0) {
      continue;
    }
    if (seenOptionIds.has(optionId)) {
      issues.push({
        code: "DUPLICATE_ID",
        path: `/product/options[${i}]/id`,
        message: `ID duplicado de option encontrado no produto "${productId}": "${optionId}"`
      });
      continue;
    }
    seenOptionIds.add(optionId);
  }

  const salesUnit = isRecord(product.sales_unit) ? product.sales_unit : null;
  if (typeof product.unit === "string" && salesUnit) {
    const suRequestedUnit = salesUnit.requested_unit;
    if (typeof suRequestedUnit === "string" && product.unit !== suRequestedUnit) {
      issues.push({
        code: "UNIT_SALES_UNIT_MISMATCH",
        path: "/product/unit",
        message: `Produto "${productId}" declara unit="${product.unit}" mas sales_unit.requested_unit="${suRequestedUnit}". Devem ser iguais.`
      });
    }
  }

  const lotPolicy = isRecord(product.lot_policy) ? product.lot_policy : null;
  if (lotPolicy?.source === "ATTRIBUTE") {
    const attributeId = lotPolicy.attribute_id;
    const hasLotOption = typeof attributeId === "string" && options.some((option) => option.attribute_id === attributeId);
    if (!hasLotOption) {
      issues.push({
        code: "INVALID_LOT_POLICY",
        path: "/product/lot_policy/attribute_id",
        message: `Produto "${productId}" exige option com attribute_id de lote configurado em lot_policy`
      });
    }
  }
}

function loadProfileSchema(profileId: string): Record<string, unknown> | null {
  const profilePath = path.resolve(__dirname, `../../../spec/latest/profiles/${profileId}.schema.json`);
  if (!fs.existsSync(profilePath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(profilePath, "utf8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractXFields(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("x-")) {
      result[key] = value;
    }
  }
  return result;
}

function checkProfileExtensions(
  doc: Record<string, unknown>,
  products: Record<string, unknown>[],
  issues: Issue[],
  ajv: InstanceType<typeof Ajv2020>
): void {
  const profileIds = getArray<string>(doc.profiles);
  if (profileIds.length === 0) {
    return;
  }

  const profileSchemas: Map<string, Record<string, unknown>> = new Map();
  for (const profileId of profileIds) {
    const schema = loadProfileSchema(profileId);
    if (!schema) {
      issues.push({
        code: "UNKNOWN_PROFILE",
        path: "/profiles",
        message: `Profile "${profileId}" nao encontrado em spec/latest/profiles/`
      });
      continue;
    }
    profileSchemas.set(profileId, schema);
  }

  if (profileSchemas.size === 0) {
    return;
  }

  const validators = new Map<string, ReturnType<typeof ajv.compile>>();
  for (const [profileId, schema] of profileSchemas) {
    try {
      validators.set(profileId, ajv.compile(schema));
    } catch {
      issues.push({
        code: "INVALID_PROFILE_SCHEMA",
        path: "/profiles",
        message: `Falha ao compilar schema do profile "${profileId}"`
      });
    }
  }

  for (let pIndex = 0; pIndex < products.length; pIndex += 1) {
    const product = products[pIndex];
    const xFields = extractXFields(product);
    if (Object.keys(xFields).length === 0) {
      continue;
    }

    for (const [profileId, validate] of validators) {
      const valid = validate(xFields);
      if (!valid && validate.errors) {
        for (const error of validate.errors) {
          const dataPath = error.instancePath || "/";
          issues.push({
            code: "PROFILE_VALIDATION",
            path: `/products[${pIndex}]${dataPath}`,
            message: `Profile "${profileId}": ${error.message ?? "erro de validacao"}`
          });
        }
      }
    }
  }
}

function loadProductsFromRefs(
  catalogDoc: Record<string, unknown>,
  catalogFilePath: string,
  issues: Issue[]
): Record<string, unknown>[] {
  const loadedProducts: Record<string, unknown>[] = [];
  const refs = getArray<Record<string, unknown>>(catalogDoc.product_refs);
  const seenRefIds = new Set<string>();
  const catalogId = isRecord(catalogDoc.catalog) && typeof catalogDoc.catalog.id === "string"
    ? catalogDoc.catalog.id
    : null;

  for (let i = 0; i < refs.length; i += 1) {
    const ref = refs[i];
    const refId = ref.id;
    const refPath = ref.path;
    const refPathPointer = `/product_refs[${i}]`;

    if (typeof refId !== "string" || refId.trim().length === 0) {
      continue;
    }
    if (seenRefIds.has(refId)) {
      issues.push({
        code: "DUPLICATE_ID",
        path: `${refPathPointer}/id`,
        message: `ID duplicado encontrado em product_refs: "${refId}"`
      });
      continue;
    }
    seenRefIds.add(refId);

    if (typeof refPath !== "string" || refPath.trim().length === 0) {
      continue;
    }

    const absoluteRefPath = path.resolve(path.dirname(catalogFilePath), refPath);
    if (!fs.existsSync(absoluteRefPath)) {
      issues.push({
        code: "MISSING_PRODUCT_FILE",
        path: `${refPathPointer}/path`,
        message: `Arquivo de produto nao encontrado: "${refPath}"`
      });
      continue;
    }

    let refDocData: JsonValue;
    try {
      refDocData = readJsonFile(absoluteRefPath);
    } catch (error) {
      issues.push({
        code: "INVALID_PRODUCT_FILE_JSON",
        path: `${refPathPointer}/path`,
        message: `Falha ao ler arquivo de produto "${refPath}": ${(error as Error).message}`
      });
      continue;
    }

    if (!isRecord(refDocData)) {
      issues.push({
        code: "INVALID_PRODUCT_FILE_TYPE",
        path: `${refPathPointer}/path`,
        message: `Arquivo de produto "${refPath}" deve conter objeto JSON`
      });
      continue;
    }

    if (String(refDocData.document_type ?? "").toUpperCase() !== "PRODUCT") {
      issues.push({
        code: "INVALID_PRODUCT_FILE_TYPE",
        path: `${refPathPointer}/path`,
        message: `Arquivo de produto "${refPath}" deve declarar document_type="PRODUCT"`
      });
      continue;
    }

    if (catalogId && refDocData.catalog_id !== catalogId) {
      issues.push({
        code: "INVALID_PRODUCT_CATALOG_ID",
        path: `${refPathPointer}/path`,
        message: `Arquivo de produto "${refPath}" possui catalog_id divergente de catalog.id`
      });
      continue;
    }

    if (!isRecord(refDocData.product)) {
      issues.push({
        code: "INVALID_PRODUCT_FILE_PRODUCT",
        path: `${refPathPointer}/path`,
        message: `Arquivo de produto "${refPath}" deve conter objeto product`
      });
      continue;
    }

    const productId = refDocData.product.id;
    if (productId !== refId) {
      issues.push({
        code: "PRODUCT_REF_MISMATCH",
        path: `${refPathPointer}/id`,
        message: `product_refs.id="${refId}" difere de product.id="${String(productId)}" em "${refPath}"`
      });
      continue;
    }

    loadedProducts.push(refDocData.product);
  }

  return loadedProducts;
}

function validatePacp(filePath: string): number {
  const absoluteFilePath = path.resolve(process.cwd(), filePath);
  const schemaPath = path.resolve(__dirname, "../../../spec/latest/pacp.schema.json");

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
    const documentType = String(objectDoc.document_type ?? "").toUpperCase() as DocumentType | "";

    if (documentType === "CATALOG") {
      const mergedDoc: Record<string, unknown> = { ...objectDoc };
      const loadedProducts = loadProductsFromRefs(objectDoc, absoluteFilePath, issues);
      mergedDoc.products = loadedProducts;

      const ids = collectIdsAndDuplicates(mergedDoc, issues);
      checkBrokenReferences(mergedDoc, ids, issues);
      checkLookupDimensions(mergedDoc, ids, issues);
      checkRulesSemanticBasics(mergedDoc, issues);
      checkLotAndSalesUnitSemantics(mergedDoc, issues);
      checkProfileExtensions(objectDoc, loadedProducts, issues, ajv);
    } else if (documentType === "PRODUCT") {
      checkProductDocumentSemanticBasics(objectDoc, issues);
      if (isRecord(objectDoc.product)) {
        checkProfileExtensions(objectDoc, [objectDoc.product], issues, ajv);
      }
    }
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
