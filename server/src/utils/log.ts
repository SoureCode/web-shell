const filter = process.env["DEBUG"] ?? "*";
const set = new Set(filter.split(",").map((s) => s.trim()).filter(Boolean));
const all = set.has("*");

export function log(tag: string, ...args: unknown[]): void {
  if (!all && !set.has(tag)) return;
  const stamp = new Date().toISOString();
  console.log(`${stamp} [${tag}]`, ...args);
}
