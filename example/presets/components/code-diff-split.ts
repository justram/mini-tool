import type { MiniToolUiExamplePayloadTarget } from "../types.js";

export function applyCodeDiffSplitInitialPayload(element: MiniToolUiExamplePayloadTarget) {
  element.payload = {
    id: "code-diff-preview-collapsed",
    language: "typescript",
    filename: "lib/permissions.ts",
    lineNumbers: "visible",
    diffStyle: "split",
    maxCollapsedLines: 8,
    oldCode: `export function resolvePermissions(user: User, resource: Resource): Permission[] {
      const base = getBasePermissions(user.role);
      const overrides = getResourceOverrides(resource.id);
      const result: Permission[] = [];
    
      for (const perm of base) {
        if (overrides.denied.includes(perm)) continue;
        if (perm === "write" && resource.locked) continue;
        result.push(perm);
      }
    
      for (const perm of overrides.granted) {
        if (!result.includes(perm)) {
          result.push(perm);
        }
      }
    
      return result;
    }`,
    newCode: `export function resolvePermissions(user: User, resource: Resource): Permission[] {
      const base = getBasePermissions(user.role);
      const overrides = getResourceOverrides(resource.id);
    
      const filtered = base.filter((perm) => {
        if (overrides.denied.includes(perm)) return false;
        if (perm === "write" && resource.locked) return false;
        return true;
      });
    
      const granted = overrides.granted.filter((perm) => !filtered.includes(perm));
      return [...filtered, ...granted];
    }`,
  };
}
