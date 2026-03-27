import type { MiniToolUiExamplePayloadTarget } from "../types.js";

export function applyCodeDiffInitialPayload(element: MiniToolUiExamplePayloadTarget) {
  element.payload = {
    id: "code-diff-preview-refactor",
    language: "typescript",
    filename: "lib/auth.ts",
    lineNumbers: "visible",
    diffStyle: "unified",
    oldCode: `export async function fetchUser(id: string) {
      const res = await db.users.findUnique({ where: { id } });
      if (!res) throw new Error("User not found");
      return res;
    }
    `,
    newCode: `export async function fetchUser(id: string) {
      const res = await db.users.findUnique({ where: { id } });
      if (!res) return null;
      return res;
    }
    `,
  };
}
