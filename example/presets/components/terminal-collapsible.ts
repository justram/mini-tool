import type { MiniToolUiExamplePayloadTarget } from "../types.js";

export function applyTerminalCollapsibleInitialPayload(element: MiniToolUiExamplePayloadTarget) {
  element.payload = {
    id: "terminal-preview-collapsible",
    command: "pnpm install",
    stdout: `\u001b[36m?\u001b[0m The modules directory at "node_modules" will be removed and reinstalled from scratch. Proceed? \u001b[32m(Y/n)\u001b[0m \u001b[2mtrue\u001b[0m
    
    \u001b[90mLockfile is up to date, resolution step is skipped\u001b[0m
    \u001b[90mAlready up to date\u001b[0m
    
    Progress: resolved 892, reused 891, downloaded 1, added 847
    Progress: resolved 892, reused 891, downloaded 1, added 847, done
    
    dependencies:
    + @radix-ui/react-dialog 1.1.4
    + @radix-ui/react-dropdown-menu 2.1.4
    + @radix-ui/react-popover 1.1.4
    + @radix-ui/react-select 2.1.4
    + @radix-ui/react-tabs 1.1.2
    + @radix-ui/react-tooltip 1.1.6
    + class-variance-authority 0.7.1
    + clsx 2.1.1
    + lucide-react 0.468.0
    + next 15.1.3
    + react 19.0.0
    + react-dom 19.0.0
    + tailwind-merge 2.6.0
    + tailwindcss-animate 1.0.7
    + zod 3.24.1
    
    devDependencies:
    + @types/node 22.10.5
    + @types/react 19.0.2
    + eslint 9.17.0
    + prettier 3.4.2
    + typescript 5.7.2
    
    \u001b[33mWarning\u001b[0m 2 deprecated subdependencies found: glob@7.2.3, inflight@1.0.6
    
    \u001b[32mDone in 4.8s\u001b[0m`,
    stderr: "",
    exitCode: 0,
    durationMs: 4800,
    cwd: "~/project",
    maxCollapsedLines: 8,
  };
}
