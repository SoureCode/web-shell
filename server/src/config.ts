export const HOST: string = process.env["HOST"] ?? "127.0.0.1";
export const PORT: number = Number(process.env["PORT"] ?? 4000);

export const AUTH_TOKEN: string | null = process.env["AUTH_TOKEN"]?.trim() || null;

export const SCROLLBACK_BYTES = 256 * 1024;

export const DEFAULT_COLS = 80;
export const DEFAULT_ROWS = 24;

const DEFAULT_ALLOWED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];

export const ALLOWED_ORIGINS: readonly string[] = (
  process.env["ALLOWED_ORIGINS"]?.split(",").map((o) => o.trim()).filter(Boolean) ??
  DEFAULT_ALLOWED_ORIGINS
);
