import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const inCodeServer = Boolean(process.env["VSCODE_PROXY_URI"]);
export const HOST: string = process.env["HOST"] ?? (inCodeServer ? "0.0.0.0" : "127.0.0.1");
export const PORT: number = Number(process.env["PORT"] ?? 4000);

const here = dirname(fileURLToPath(import.meta.url));
const candidateDist = process.env["CLIENT_DIST"] ?? resolve(here, "../../client/dist");
export const CLIENT_DIST: string | null = existsSync(candidateDist) ? candidateDist : null;

const candidateRoot = process.env["CLIENT_ROOT"] ?? resolve(here, "../../client");
export const CLIENT_ROOT: string | null = existsSync(candidateRoot) ? candidateRoot : null;

export const AUTH_TOKEN: string | null = process.env["AUTH_TOKEN"]?.trim() || null;

export const SCROLLBACK_BYTES = 1024 * 1024;

export const DEFAULT_COLS = 80;
export const DEFAULT_ROWS = 24;

const DEFAULT_ALLOWED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];

function proxyOrigin(): string | null {
  const uri = process.env["VSCODE_PROXY_URI"]?.replace("{{port}}", String(PORT)).replace(/\/$/, "");
  if (!uri) return null;
  try {
    const u = new URL(uri);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

const envOrigins = process.env["ALLOWED_ORIGINS"]
  ?.split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export const ALLOWED_ORIGINS: readonly string[] =
  envOrigins ?? [...DEFAULT_ALLOWED_ORIGINS, ...(proxyOrigin() ? [proxyOrigin() as string] : [])];
