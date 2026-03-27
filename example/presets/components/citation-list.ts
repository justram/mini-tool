import type { MiniToolUiExamplePayloadTarget } from "../types.js";

export function applyCitationListInitialPayload(element: MiniToolUiExamplePayloadTarget) {
  element.payload = {
    id: "citation-list-stacked",
    variant: "stacked",
    citations: [
      {
        id: "citation-stacked-1",
        href: "https://react.dev/reference/react/useState",
        title: "useState – React",
        domain: "react.dev",
        favicon: "https://www.google.com/s2/favicons?domain=react.dev&sz=32",
        type: "document",
      },
      {
        id: "citation-stacked-2",
        href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
        title: "JavaScript - MDN Web Docs",
        domain: "developer.mozilla.org",
        favicon: "https://www.google.com/s2/favicons?domain=developer.mozilla.org&sz=32",
        type: "document",
      },
      {
        id: "citation-stacked-3",
        href: "https://www.typescriptlang.org/docs/",
        title: "TypeScript Documentation",
        domain: "typescriptlang.org",
        favicon: "https://www.google.com/s2/favicons?domain=typescriptlang.org&sz=32",
        type: "document",
      },
      {
        id: "citation-stacked-4",
        href: "https://nodejs.org/docs/latest/api/",
        title: "Node.js Documentation",
        domain: "nodejs.org",
        favicon: "https://www.google.com/s2/favicons?domain=nodejs.org&sz=32",
        type: "api",
      },
      {
        id: "citation-stacked-5",
        href: "https://nextjs.org/docs",
        title: "Next.js Documentation",
        domain: "nextjs.org",
        favicon: "https://www.google.com/s2/favicons?domain=nextjs.org&sz=32",
        type: "document",
      },
      {
        id: "citation-stacked-6",
        href: "https://tailwindcss.com/docs",
        title: "Tailwind CSS Documentation",
        domain: "tailwindcss.com",
        favicon: "https://www.google.com/s2/favicons?domain=tailwindcss.com&sz=32",
        type: "document",
      },
    ],
  };
}
