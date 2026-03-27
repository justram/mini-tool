#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const result = spawnSync("npx", ["tsx", "benchmarks/run.ts", ...process.argv.slice(2)], {
  cwd: process.cwd(),
  stdio: "inherit",
  env: process.env,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
