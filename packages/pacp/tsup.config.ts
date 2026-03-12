import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    schema: "src/schema.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  shims: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  onSuccess: async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const specDir = path.resolve("../../spec/1.0.0");
    const distDir = path.resolve("dist");
    const profilesDist = path.join(distDir, "profiles");

    fs.mkdirSync(profilesDist, { recursive: true });

    fs.copyFileSync(
      path.join(specDir, "pacp.schema.json"),
      path.join(distDir, "pacp.schema.json")
    );

    const profilesDir = path.join(specDir, "profiles");
    for (const file of fs.readdirSync(profilesDir)) {
      if (file.endsWith(".schema.json")) {
        fs.copyFileSync(
          path.join(profilesDir, file),
          path.join(profilesDist, file)
        );
      }
    }
  },
});
