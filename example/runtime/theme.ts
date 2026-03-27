export type MiniToolUiExampleThemeMode = "light" | "dark";

type MiniToolUiExampleThemeToggleElements = {
  button?: Element | null;
  label?: Element | null;
};

const THEME_TRANSITION_DURATION_MS = 620;

const TRANSITIONABLE_THEME_COLOR_PROPERTIES = [
  ["--background", "oklch(1 0 0)"],
  ["--foreground", "oklch(0.145 0 0)"],
  ["--card", "oklch(1 0 0)"],
  ["--card-foreground", "oklch(0.145 0 0)"],
  ["--popover", "oklch(1 0 0)"],
  ["--popover-foreground", "oklch(0.145 0 0)"],
  ["--primary", "oklch(0.205 0 0)"],
  ["--primary-foreground", "oklch(0.985 0 0)"],
  ["--secondary", "oklch(0.97 0 0)"],
  ["--secondary-foreground", "oklch(0.205 0 0)"],
  ["--muted", "oklch(0.97 0 0)"],
  ["--muted-foreground", "oklch(0.556 0 0)"],
  ["--accent", "oklch(0.97 0 0)"],
  ["--accent-foreground", "oklch(0.205 0 0)"],
  ["--destructive", "oklch(0.577 0.245 27.325)"],
  ["--destructive-foreground", "oklch(0.577 0.245 27.325)"],
  ["--border", "oklch(0.922 0 0)"],
  ["--input", "oklch(0.922 0 0)"],
  ["--ring", "oklch(0.708 0 0)"],
] as const satisfies ReadonlyArray<readonly [string, string]>;

let themeColorPropertiesRegistered = false;

const THEME_VARIABLES: Record<MiniToolUiExampleThemeMode, Record<string, string>> = {
  light: {
    "--background": "oklch(1 0 0)",
    "--foreground": "oklch(0.145 0 0)",
    "--card": "oklch(1 0 0)",
    "--card-foreground": "oklch(0.145 0 0)",
    "--popover": "oklch(1 0 0)",
    "--popover-foreground": "oklch(0.145 0 0)",
    "--primary": "oklch(0.205 0 0)",
    "--primary-foreground": "oklch(0.985 0 0)",
    "--secondary": "oklch(0.97 0 0)",
    "--secondary-foreground": "oklch(0.205 0 0)",
    "--muted": "oklch(0.97 0 0)",
    "--muted-foreground": "oklch(0.556 0 0)",
    "--accent": "oklch(0.97 0 0)",
    "--accent-foreground": "oklch(0.205 0 0)",
    "--destructive": "oklch(0.577 0.245 27.325)",
    "--destructive-foreground": "oklch(0.577 0.245 27.325)",
    "--border": "oklch(0.922 0 0)",
    "--input": "oklch(0.922 0 0)",
    "--ring": "oklch(0.708 0 0)",
    "--chart-1": "var(--color-green-500)",
    "--chart-2": "var(--color-red-500)",
    "--chart-3": "var(--color-blue-500)",
    "--chart-4": "var(--color-purple-500)",
    "--chart-5": "var(--color-yellow-500)",
    "--ansi-black": "rgb(0 0 0)",
    "--ansi-red": "rgb(187 0 0)",
    "--ansi-green": "rgb(0 187 0)",
    "--ansi-yellow": "rgb(187 187 0)",
    "--ansi-blue": "rgb(0 0 187)",
    "--ansi-magenta": "rgb(187 0 187)",
    "--ansi-cyan": "rgb(0 187 187)",
    "--ansi-white": "rgb(187 187 187)",
    "--ansi-bright-black": "rgb(85 85 85)",
    "--ansi-bright-red": "rgb(255 85 85)",
    "--ansi-bright-green": "rgb(85 255 85)",
    "--ansi-bright-yellow": "rgb(255 255 85)",
    "--ansi-bright-blue": "rgb(85 85 255)",
    "--ansi-bright-magenta": "rgb(255 85 255)",
    "--ansi-bright-cyan": "rgb(85 255 255)",
    "--ansi-bright-white": "rgb(255 255 255)",
    "--radius": "0.625rem",
  },
  dark: {
    "--background": "oklch(0.145 0 0)",
    "--foreground": "oklch(0.985 0 0)",
    "--card": "oklch(0.205 0 0)",
    "--card-foreground": "oklch(0.985 0 0)",
    "--popover": "oklch(0.205 0 0)",
    "--popover-foreground": "oklch(0.985 0 0)",
    "--primary": "oklch(0.922 0 0)",
    "--primary-foreground": "oklch(0.205 0 0)",
    "--secondary": "oklch(0.269 0 0)",
    "--secondary-foreground": "oklch(0.985 0 0)",
    "--muted": "oklch(0.269 0 0)",
    "--muted-foreground": "oklch(0.708 0 0)",
    "--accent": "oklch(0.269 0 0)",
    "--accent-foreground": "oklch(0.985 0 0)",
    "--destructive": "oklch(0.704 0.191 22.216)",
    "--destructive-foreground": "oklch(0.637 0.237 25.331)",
    "--border": "oklch(1 0 0 / 10%)",
    "--input": "oklch(1 0 0 / 15%)",
    "--ring": "oklch(0.556 0 0)",
    "--chart-1": "var(--color-green-400)",
    "--chart-2": "var(--color-red-400)",
    "--chart-3": "var(--color-blue-400)",
    "--chart-4": "var(--color-purple-400)",
    "--chart-5": "var(--color-yellow-400)",
    "--ansi-black": "rgb(0 0 0)",
    "--ansi-red": "rgb(187 0 0)",
    "--ansi-green": "rgb(0 187 0)",
    "--ansi-yellow": "rgb(187 187 0)",
    "--ansi-blue": "rgb(0 0 187)",
    "--ansi-magenta": "rgb(187 0 187)",
    "--ansi-cyan": "rgb(0 187 187)",
    "--ansi-white": "rgb(187 187 187)",
    "--ansi-bright-black": "rgb(85 85 85)",
    "--ansi-bright-red": "rgb(255 85 85)",
    "--ansi-bright-green": "rgb(85 255 85)",
    "--ansi-bright-yellow": "rgb(255 255 85)",
    "--ansi-bright-blue": "rgb(85 85 255)",
    "--ansi-bright-magenta": "rgb(255 85 255)",
    "--ansi-bright-cyan": "rgb(85 255 255)",
    "--ansi-bright-white": "rgb(255 255 255)",
    "--radius": "0.625rem",
  },
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

function registerThemeColorProperties(): void {
  if (themeColorPropertiesRegistered) {
    return;
  }

  themeColorPropertiesRegistered = true;
  if (typeof CSS === "undefined" || typeof CSS.registerProperty !== "function") {
    return;
  }

  for (const [name, initialValue] of TRANSITIONABLE_THEME_COLOR_PROPERTIES) {
    try {
      CSS.registerProperty({
        name,
        syntax: "<color>",
        inherits: true,
        initialValue,
      });
    } catch {
      // Ignore duplicate registrations or unsupported values.
    }
  }
}

function applyThemeVariables(theme: MiniToolUiExampleThemeMode): void {
  const rootStyle = document.documentElement.style;
  for (const [name, value] of Object.entries(THEME_VARIABLES[theme])) {
    rootStyle.setProperty(name, value);
  }

  rootStyle.colorScheme = theme;
}

export function applyTheme(
  theme: MiniToolUiExampleThemeMode,
  elements: MiniToolUiExampleThemeToggleElements = {},
): void {
  registerThemeColorProperties();

  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  applyThemeVariables(theme);
  syncThemeToggle(theme, elements);
}

function removeExistingThemeTransitionOverlay(): void {
  document.documentElement.removeAttribute("data-theme-animating");
  document.querySelector(".theme-transition-overlay")?.remove();
}

function appendThemeTransitionOverlay(
  theme: MiniToolUiExampleThemeMode,
  originElement?: Element | null,
): HTMLDivElement {
  const overlay = document.createElement("div");
  overlay.className = "theme-transition-overlay";

  const nextBackground = THEME_VARIABLES[theme]["--background"];
  if (nextBackground) {
    overlay.style.setProperty("--theme-transition-overlay-color", nextBackground);
  }

  const nextForeground = THEME_VARIABLES[theme]["--foreground"];
  if (nextForeground) {
    overlay.style.setProperty("--theme-transition-overlay-contrast-color", nextForeground);
  }

  const originRect = originElement instanceof HTMLElement ? originElement.getBoundingClientRect() : null;
  const originX = originRect ? originRect.left + originRect.width / 2 : window.innerWidth - 24;
  const originY = originRect ? originRect.top + originRect.height / 2 : 24;

  overlay.style.setProperty("--theme-transition-origin-x", `${originX}px`);
  overlay.style.setProperty("--theme-transition-origin-y", `${originY}px`);
  overlay.style.setProperty("--theme-transition-duration", `${THEME_TRANSITION_DURATION_MS}ms`);
  document.body.appendChild(overlay);
  return overlay;
}

export function changeThemeWithTransition(
  theme: MiniToolUiExampleThemeMode,
  elements: MiniToolUiExampleThemeToggleElements = {},
): void {
  registerThemeColorProperties();

  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  if (prefersReducedMotion) {
    applyTheme(theme, elements);
    return;
  }

  removeExistingThemeTransitionOverlay();

  const root = document.documentElement;
  root.setAttribute("data-theme-animating", "");

  const overlay = appendThemeTransitionOverlay(theme, elements.button ?? null);
  applyTheme(theme, elements);

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) {
      return;
    }

    cleanedUp = true;
    root.removeAttribute("data-theme-animating");
    overlay.remove();
  };

  requestAnimationFrame(() => {
    overlay.classList.add("is-running");
  });

  overlay.addEventListener("animationend", cleanup, { once: true });
  window.setTimeout(cleanup, THEME_TRANSITION_DURATION_MS + 220);
}
