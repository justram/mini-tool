import type { MiniToolUiExamplePayloadTarget } from "../types.js";

export function applyTerminalInitialPayload(element: MiniToolUiExamplePayloadTarget) {
  element.payload = {
    id: "terminal-preview-success",
    command: "pnpm test",
    stdout: `\u001b[32m✓\u001b[0m src/utils.test.ts \u001b[90m(5 tests)\u001b[0m \u001b[33m23ms\u001b[0m
    \u001b[32m✓\u001b[0m src/api.test.ts \u001b[90m(12 tests)\u001b[0m \u001b[33m156ms\u001b[0m
    \u001b[32m✓\u001b[0m src/components.test.ts \u001b[90m(8 tests)\u001b[0m \u001b[33m89ms\u001b[0m
    
    \u001b[1mTest Files\u001b[0m  \u001b[32m3 passed\u001b[0m (3)
    \u001b[1m     Tests\u001b[0m  \u001b[32m25 passed\u001b[0m (25)
    \u001b[1m  Start at\u001b[0m  10:23:45
    \u001b[1m  Duration\u001b[0m  312ms`,
    exitCode: 0,
    durationMs: 312,
    cwd: "~/project",
  };
}
