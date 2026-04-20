import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { AUTH_TOKEN } from "../config.js";

export function isAuthDisabled(): boolean {
  return AUTH_TOKEN === null;
}

export function isTokenValid(candidate: string | null | undefined): boolean {
  if (AUTH_TOKEN === null) return true;
  if (!candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(AUTH_TOKEN);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function extractBearer(req: IncomingMessage): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? (match[1] as string) : null;
}

export function extractQueryToken(url: URL): string | null {
  return url.searchParams.get("token");
}
