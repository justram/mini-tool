export type DocumentTheme = "light" | "dark";

type ThemeListener = (theme: DocumentTheme) => void;

const listeners = new Set<ThemeListener>();

let currentTheme: DocumentTheme = resolveDocumentTheme();
let themeObserver: MutationObserver | null = null;
let themeMediaQuery: MediaQueryList | null = null;

function getSystemTheme(): DocumentTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getDocumentTheme(): DocumentTheme | null {
  if (typeof document === "undefined") {
    return null;
  }

  const root = document.documentElement;
  const dataTheme = root.getAttribute("data-theme")?.toLowerCase();
  if (dataTheme === "light" || dataTheme === "dark") {
    return dataTheme;
  }

  if (root.classList.contains("light")) {
    return "light";
  }

  if (root.classList.contains("dark")) {
    return "dark";
  }

  return null;
}

function resolveDocumentTheme(): DocumentTheme {
  return getDocumentTheme() ?? getSystemTheme();
}

function emitThemeIfChanged(): void {
  const nextTheme = resolveDocumentTheme();
  if (nextTheme === currentTheme) {
    return;
  }

  currentTheme = nextTheme;
  listeners.forEach((listener) => {
    listener(nextTheme);
  });
}

function startObservers(): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  if (!themeMediaQuery) {
    themeMediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)") ?? null;
    themeMediaQuery?.addEventListener("change", emitThemeIfChanged);
  }

  if (!themeObserver) {
    themeObserver = new MutationObserver(emitThemeIfChanged);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
  }

  emitThemeIfChanged();
}

function stopObservers(): void {
  themeMediaQuery?.removeEventListener("change", emitThemeIfChanged);
  themeMediaQuery = null;
  themeObserver?.disconnect();
  themeObserver = null;
}

export function getResolvedDocumentTheme(): DocumentTheme {
  currentTheme = resolveDocumentTheme();
  return currentTheme;
}

export function subscribeToDocumentTheme(listener: ThemeListener): () => void {
  listeners.add(listener);
  startObservers();
  listener(getResolvedDocumentTheme());

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopObservers();
    }
  };
}
