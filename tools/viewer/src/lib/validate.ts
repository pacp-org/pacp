import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { ValidationResult, ValidationIssue } from './pacp-types';

const SCHEMA_URL =
  'https://raw.githubusercontent.com/pacp-org/pacp/main/spec/1.0.0/pacp.schema.json';

let schemaCache: object | null = null;

async function getSchema(): Promise<object> {
  if (schemaCache) return schemaCache;
  const res = await fetch(SCHEMA_URL);
  if (!res.ok) throw new Error('Falha ao carregar schema PACP');
  schemaCache = (await res.json()) as object;
  return schemaCache;
}

export async function validatePacp(document: unknown): Promise<ValidationResult> {
  const schema = await getSchema();
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);

  const issues: ValidationIssue[] = [];
  const validateSchema = ajv.compile(schema);
  const valid = validateSchema(document);

  if (!valid && validateSchema.errors) {
    for (const err of validateSchema.errors) {
      issues.push({
        code: 'SCHEMA',
        path: err.instancePath || '/',
        message: err.message ?? 'Erro de validação de schema',
      });
    }
  }

  return { valid: issues.length === 0, issues };
}

export function parsePacpJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'JSON inválido';
    throw new Error(`Erro ao parsear JSON: ${msg}`);
  }
}
