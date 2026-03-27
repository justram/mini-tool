import { existsSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));
const srcRoot = resolve(root, "../src");

function resolveTsFallback(jsPath: string): string | null {
  if (existsSync(jsPath)) {
    return null;
  }

  const tsPath = jsPath.slice(0, -3) + ".ts";
  return existsSync(tsPath) ? tsPath : null;
}

function resolveMiniToolUiSourceEntry(source: string): string | null {
  if (source === "mini-toolui/styles") {
    return resolve(srcRoot, "styles/entries/mini-tool.css");
  }

  if (source === "mini-toolui/actions") {
    return resolve(srcRoot, "actions/index.ts");
  }

  const componentPrefix = "mini-toolui/components/";
  if (source.startsWith(componentPrefix)) {
    const componentName = source.slice(componentPrefix.length);
    if (!componentName) {
      return null;
    }

    return resolve(srcRoot, `mini-tool/${componentName}/index.ts`);
  }

  return null;
}

function standalonePackageResolver(): Plugin {
  return {
    name: "mini-toolui-standalone-package-resolver",
    enforce: "pre",
    resolveId(source, importer) {
      const miniToolUiSourceEntry = resolveMiniToolUiSourceEntry(source);
      if (miniToolUiSourceEntry) {
        return miniToolUiSourceEntry;
      }

      if (extname(source) !== ".js" || !importer) {
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
  plugins: [standalonePackageResolver(), tailwindcss()],
  root,
  publicDir: resolve(root, "public"),
  server: {
    fs: {
      allow: [resolve(root, "../")],
    },
  },
});
