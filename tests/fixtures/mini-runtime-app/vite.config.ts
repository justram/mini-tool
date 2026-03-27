import { existsSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

const root = resolve(process.cwd(), "tests/fixtures/mini-runtime-app");
const srcRoot = resolve(root, "../../../src");

function resolveTsFallback(jsPath: string): string | null {
  if (existsSync(jsPath)) {
    return null;
  }

  const tsPath = jsPath.slice(0, -3) + ".ts";
  return existsSync(tsPath) ? tsPath : null;
}

function strictEsmTsResolver(): Plugin {
  return {
    name: "strict-esm-ts-resolver",
    enforce: "pre",
    resolveId(source, importer) {
      if (extname(source) !== ".js") {
        return null;
      }

      if (source.startsWith("@mini/")) {
        const jsPath = resolve(srcRoot, source.slice("@mini/".length));
        return resolveTsFallback(jsPath);
      }

      if (!importer) {
        return null;
      }

      if (!source.startsWith("./") && !source.startsWith("../")) {
        return null;
      }

      const importerPath = importer.startsWith("/@fs/") ? importer.slice("/@fs".length) : importer;
      const importerDir = dirname(importerPath);
      const jsPath = resolve(importerDir, source);
      return resolveTsFallback(jsPath);
    },
  };
}

export default defineConfig({
  plugins: [strictEsmTsResolver()],
  resolve: {
    alias: {
      "@mini": srcRoot,
    },
  },
  root,
  server: {
    host: "127.0.0.1",
    fs: {
      allow: [resolve(root, "../../../")],
    },
  },
});
