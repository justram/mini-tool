export type MiniToolUiExampleThemeMode = "light" | "dark";

type MiniToolUiExampleThemeToggleElements = {
  button?: Element | null;
  label?: Element | null;
};

export function resolveInitialTheme(
  storageKey: string,
  fallback: MiniToolUiExampleThemeMode = "light",
): MiniToolUiExampleThemeMode {
  const persisted = window.localStorage.getItem(storageKey);
  if (persisted === "light" || persisted === "dark") {
    return persisted;
  }

  return fallback;
}

function syncThemeToggle(theme: MiniToolUiExampleThemeMode, elements: MiniToolUiExampleThemeToggleElements = {}): void {
  const { button, label } = elements;
  if (!button) {
    return;
  }

  const isDark = theme === "dark";
  button.setAttribute("data-theme", theme);
  button.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
  button.setAttribute("aria-pressed", String(isDark));

  if (label) {
    label.textContent = isDark ? "Light mode" : "Dark mode";
  }
}

export function applyTheme(
  theme: MiniToolUiExampleThemeMode,
  elements: MiniToolUiExampleThemeToggleElements = {},
): void {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.setAttribute("data-theme", theme);

  syncThemeToggle(theme, elements);
}

export function changeThemeWithTransition(
  theme: MiniToolUiExampleThemeMode,
  elements: MiniToolUiExampleThemeToggleElements = {},
): void {
  if (typeof document.startViewTransition !== "function") {
    applyTheme(theme, elements);
    return;
  }

  const root = document.documentElement;
  root.setAttribute("data-theme-transition", "");

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) {
      return;
    }

    cleanedUp = true;
    root.removeAttribute("data-theme-transition");
  };

  const transition = document.startViewTransition(() => {
    applyTheme(theme, elements);
  });

  const fallbackTimer = window.setTimeout(cleanup, 1000);
  transition.finished.finally(() => {
    window.clearTimeout(fallbackTimer);
    cleanup();
  });
}
