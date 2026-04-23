export const TITLE_PREFIX_PLACEHOLDER = "{{TITLE_PREFIX}}";

export function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function injectTitlePrefix(html: string, prefix: string | null): string {
  return html.replace(TITLE_PREFIX_PLACEHOLDER, escapeHtmlAttr(prefix ?? ""));
}
