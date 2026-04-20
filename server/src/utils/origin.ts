import type { IncomingMessage } from "node:http";
import { ALLOWED_ORIGINS } from "../config.js";

export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

export function isRequestOriginAcceptable(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (origin === undefined) return true;
  if (isOriginAllowed(origin)) return true;
  const host = req.headers.host;
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
