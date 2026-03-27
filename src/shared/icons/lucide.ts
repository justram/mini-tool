import { html, type TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { createElement, type IconNode } from "lucide";

type LucideIconOptions = {
  size?: number;
  className?: string;
};

export function renderLucideIcon(iconNode: IconNode, options: LucideIconOptions = {}): TemplateResult {
  const size = options.size ?? 16;
  const attrs: Record<string, string | number> = {
    width: size,
    height: size,
  };

  if (options.className) {
    attrs.class = options.className;
  }

  const element = createElement(iconNode, attrs);

  return html`${unsafeHTML(element.outerHTML)}`;
}
