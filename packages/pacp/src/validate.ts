import type { ValidationResult, ValidationIssue, PacpDocument } from "./types.js";
import { schema, profiles, type ProfileId } from "./schema.js";

export function validate(document: unknown): ValidationResult {
  let Ajv2020: typeof import("ajv/dist/2020").default;
  let addFormats: typeof import("ajv-formats").default;

  try {
    Ajv2020 = require("ajv/dist/2020") as typeof import("ajv/dist/2020").default;
    addFormats = require("ajv-formats") as typeof import("ajv-formats").default;
  } catch {
    throw new Error(
      'Para usar validate(), instale ajv e ajv-formats: npm install ajv ajv-formats'
    );
  }

  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);

  const issues: ValidationIssue[] = [];

  const validateSchema = ajv.compile(schema);
  const valid = validateSchema(document);

  if (!valid && validateSchema.errors) {
    for (const error of validateSchema.errors) {
      issues.push({
        code: "SCHEMA",
        path: error.instancePath || "/",
        message: error.message ?? "Erro de validacao de schema",
      });
    }
  }

  if (document && typeof document === "object" && !Array.isArray(document)) {
    const doc = document as Record<string, unknown>;
    const declaredProfiles = Array.isArray(doc.profiles) ? doc.profiles : [];

    for (const profileId of declaredProfiles) {
      if (typeof profileId !== "string") continue;

      const profileSchema = profiles[profileId as ProfileId];
      if (!profileSchema) {
        issues.push({
          code: "UNKNOWN_PROFILE",
          path: "/profiles",
          message: `Profile "${profileId}" nao e um profile oficial PACP`,
        });
        continue;
      }

      const products = extractProducts(doc);
      const validateProfile = ajv.compile(profileSchema);

      for (let i = 0; i < products.length; i++) {
        const xFields = extractXFields(products[i]);
        if (Object.keys(xFields).length === 0) continue;

        const profileValid = validateProfile(xFields);
        if (!profileValid && validateProfile.errors) {
          for (const error of validateProfile.errors) {
            issues.push({
              code: "PROFILE_VALIDATION",
              path: `products[${i}]${error.instancePath || "/"}`,
              message: `Profile "${profileId}": ${error.message ?? "erro de validacao"}`,
            });
          }
        }
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

function extractProducts(doc: Record<string, unknown>): Record<string, unknown>[] {
  if (doc.document_type === "PRODUCT" && doc.product && typeof doc.product === "object") {
    return [doc.product as Record<string, unknown>];
  }
  return [];
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
