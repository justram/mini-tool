import type { MiniToolUiExamplePayloadTarget } from "../types.js";

export function applyCodeBlockInitialPayload(element: MiniToolUiExamplePayloadTarget) {
  element.payload = {
    id: "code-block-preview-typescript",
    code: `import { useState } from "react";
    
    export function Counter() {
      const [count, setCount] = useState(0);
    
      return (
        <button onClick={() => setCount(c => c + 1)}>
          Count: {count}
        </button>
      );
    }`,
    language: "typescript",
    lineNumbers: "visible",
    filename: "Counter.tsx",
  };
}
