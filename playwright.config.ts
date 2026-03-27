import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["github"]] : [["list"]],
  use: {
    headless: true,
    browserName: "chromium",
    baseURL: "http://127.0.0.1:4173",
  },
  webServer: {
    command: "npx vite --config example/vite.config.ts --port 4173 --host 127.0.0.1",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    port: 4173,
  },
});
