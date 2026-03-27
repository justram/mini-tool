import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  root: resolve(process.cwd(), "tests/fixtures/source-runtime-app"),
  server: {
    host: "127.0.0.1",
  },
  resolve: {
    alias: {
      "@": resolve(process.cwd(), "../tool-ui/apps/www"),
      react: resolve(process.cwd(), "node_modules/react"),
      "react-dom": resolve(process.cwd(), "node_modules/react-dom"),
    },
    dedupe: ["react", "react-dom"],
  },
});
