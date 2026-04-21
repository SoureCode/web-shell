function readNamespaces(): Set<string> {
  const fallback = import.meta.env.DEV ? "*" : "";
  try {
    const raw = localStorage.getItem("debug") ?? fallback;
    return new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
  } catch {
    return new Set(fallback ? [fallback] : []);
  }
}

const set = readNamespaces();
const all = set.has("*");

export function log(tag: string, ...args: unknown[]): void {
  if (!all && !set.has(tag)) return;
  // eslint-disable-next-line no-console
  console.debug(`[${tag}]`, ...args);
}
