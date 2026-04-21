const filter = process.env["DEBUG"] ?? (process.env["NODE_ENV"] === "development" ? "*" : "");
const set = new Set(filter.split(",").map((s) => s.trim()).filter(Boolean));
const all = set.has("*");

export function log(tag: string, ...args: unknown[]): void {
  if (!all && !set.has(tag)) return;
  const stamp = new Date().toISOString();
  console.log(`${stamp} [${tag}]`, ...args);
}
