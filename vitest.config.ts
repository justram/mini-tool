import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/benchmarks/**/*.test.ts"],
    globals: true,
    passWithNoTests: false,
    coverage: {
      reporter: ["text", "html"],
      include: ["tests/**/*.ts"],
    },
  },
});
