import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type CliOptions = {
  component?: string;
};

const USAGE = "Usage: npx tsx scripts/typecheck-component.ts --component <name>";

function parseArgs(argv: string[]): CliOptions {
  const args = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    if (key === "help" || key === "h") {
      console.log(USAGE);
      process.exit(0);
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for '--${key}'.`);
    }

    args.set(key, value);
    index += 1;
  }

  return {
    component: args.get("component"),
  };
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  if (!options.component) {
    throw new Error(`Component is required. ${USAGE}`);
  }

  const componentDir = resolve(process.cwd(), `src/mini-tool/${options.component}`);
  if (!existsSync(componentDir)) {
    throw new Error(`Component directory not found: ${componentDir}`);
  }

  const tempDir = resolve(process.cwd(), ".tmp");
  mkdirSync(tempDir, { recursive: true });

  const tempConfigPath = resolve(tempDir, `tsconfig.typecheck.${options.component}.json`);
  const tempConfig = {
    extends: "../tsconfig.json",
    include: [
      "../src/**/*.d.ts",
      `../src/mini-tool/${options.component}/**/*.ts`,
      `../src/mini-tool/${options.component}/**/*.tsx`,
    ],
  };

  writeFileSync(tempConfigPath, `${JSON.stringify(tempConfig, null, 2)}\n`, "utf8");

  try {
    const result = spawnSync("npx", ["tsc", "--noEmit", "--pretty", "false", "--project", tempConfigPath], {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });

    process.exit(result.status ?? 1);
  } finally {
    rmSync(tempConfigPath, { force: true });
  }
}

main();
