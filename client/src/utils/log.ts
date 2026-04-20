function readNamespaces(): Set<string> {
  try {
    const raw = localStorage.getItem("debug") ?? "*";
    return new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
  } catch {
    return new Set(["*"]);
  }
}

const set = readNamespaces();
const all = set.has("*");

export function log(tag: string, ...args: unknown[]): void {
  if (!all && !set.has(tag)) return;
  // eslint-disable-next-line no-console
  console.debug(`[${tag}]`, ...args);
}
