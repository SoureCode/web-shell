import { accessSync, constants, realpathSync, statSync } from "node:fs";
import { isAbsolute, sep } from "node:path";
import { defaultCwd } from "./shell.js";

export type CwdResolution = { ok: true; cwd: string } | { ok: false; error: string };

function parseAllowlist(): readonly string[] | null {
  const raw = process.env["WEB_SHELL_CWD_ALLOW"];
  if (!raw) return null;
  const entries = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => (p.endsWith(sep) ? p.slice(0, -1) : p));
  return entries.length > 0 ? entries : null;
}

function isUnderAllowlist(resolved: string, allow: readonly string[]): boolean {
  for (const root of allow) {
    if (resolved === root) return true;
    if (resolved.startsWith(root + sep)) return true;
  }
  return false;
}

export function resolveRequestedCwd(raw: string | null | undefined): CwdResolution {
  if (raw === null || raw === undefined || raw === "") {
    return { ok: true, cwd: defaultCwd() };
  }

  if (typeof raw !== "string") {
    return { ok: false, error: "cwd must be a string" };
  }

  if (raw.includes("\0")) {
    return { ok: false, error: "cwd contains a null byte" };
  }

  if (!isAbsolute(raw)) {
    return { ok: false, error: `cwd "${raw}": must be an absolute path` };
  }

  let resolved: string;
  try {
    resolved = realpathSync(raw);
  } catch {
    return { ok: false, error: `cwd "${raw}": does not exist` };
  }

  let stats;
  try {
    stats = statSync(resolved);
  } catch {
    return { ok: false, error: `cwd "${raw}": does not exist` };
  }

  if (!stats.isDirectory()) {
    return { ok: false, error: `cwd "${raw}": not a directory` };
  }

  try {
    accessSync(resolved, constants.R_OK | constants.X_OK);
  } catch {
    return { ok: false, error: `cwd "${raw}": not readable by server` };
  }

  const allow = parseAllowlist();
  if (allow && !isUnderAllowlist(resolved, allow)) {
    return { ok: false, error: `cwd "${raw}": not under WEB_SHELL_CWD_ALLOW` };
  }

  return { ok: true, cwd: resolved };
}
