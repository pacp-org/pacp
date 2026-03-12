import { readFileSync } from "node:fs";
import { join } from "node:path";

function loadJson(relativePath: string): Record<string, unknown> {
  const fullPath = join(__dirname, relativePath);
  return JSON.parse(readFileSync(fullPath, "utf8"));
}

export const schema = loadJson("./pacp.schema.json") as Record<string, unknown>;

export const profiles = {
  moveis: loadJson("./profiles/moveis.schema.json") as Record<string, unknown>,
  iluminacao: loadJson("./profiles/iluminacao.schema.json") as Record<string, unknown>,
  "pisos-revestimentos": loadJson("./profiles/pisos-revestimentos.schema.json") as Record<string, unknown>,
  "fiscal-br": loadJson("./profiles/fiscal-br.schema.json") as Record<string, unknown>,
} as const;

export type ProfileId = keyof typeof profiles;

export const profileIds = Object.keys(profiles) as ProfileId[];
