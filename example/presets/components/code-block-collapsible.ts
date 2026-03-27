import type { MiniToolUiExamplePayloadTarget } from "../types.js";

export function applyCodeBlockCollapsibleInitialPayload(element: MiniToolUiExamplePayloadTarget) {
  element.payload = {
    id: "code-block-preview-collapsible",
    code: `import { z } from "zod";
    
    export const UserSchema = z.object({
      id: z.string().uuid(),
      email: z.string().email(),
      name: z.string().min(1).max(100),
      role: z.enum(["admin", "member", "guest"]),
      createdAt: z.coerce.date(),
      updatedAt: z.coerce.date(),
      preferences: z.object({
        theme: z.enum(["light", "dark", "system"]).default("system"),
      }),
    });`,
    language: "typescript",
    lineNumbers: "visible",
    filename: "user-schema.ts",
    maxCollapsedLines: 6,
  };
}
