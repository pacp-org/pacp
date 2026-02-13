import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

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

  return files.sort();
}

function main(): void {
  const examplesDir = path.resolve(__dirname, "../../../spec/1.0.0/examples");
  if (!fs.existsSync(examplesDir)) {
    console.log(`Diretorio de exemplos nao encontrado: ${examplesDir}`);
    process.exit(0);
  }

  const entries = collectJsonFilesRecursively(examplesDir);

  if (entries.length === 0) {
    console.log("Nenhum exemplo JSON encontrado para validar.");
    process.exit(0);
  }

  let hasErrors = false;
  for (const absolute of entries) {
    const relativeForCli = path.relative(process.cwd(), absolute);
    const stats = fs.statSync(absolute);

    if (stats.size === 0) {
      console.log(`SKIP: ${relativeForCli} esta vazio (placeholder).`);
      continue;
    }

    const result = spawnSync(process.execPath, [path.resolve(__dirname, "cli.js"), relativeForCli], {
      stdio: "inherit"
    });

    if ((result.status ?? 1) !== 0) {
      hasErrors = true;
    }
  }

  process.exit(hasErrors ? 1 : 0);
}

main();
