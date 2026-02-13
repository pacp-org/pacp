import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function main(): void {
  const examplesDir = path.resolve(__dirname, "../../../spec/1.0.0/examples");
  if (!fs.existsSync(examplesDir)) {
    console.log(`Diretorio de exemplos nao encontrado: ${examplesDir}`);
    process.exit(0);
  }

  const entries = fs
    .readdirSync(examplesDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort();

  if (entries.length === 0) {
    console.log("Nenhum exemplo JSON encontrado para validar.");
    process.exit(0);
  }

  let hasErrors = false;
  for (const name of entries) {
    const absolute = path.join(examplesDir, name);
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
