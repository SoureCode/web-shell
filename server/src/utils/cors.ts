import type { ServerResponse } from "node:http";
import { isOriginAllowed } from "./origin.js";

export function applyCors(res: ServerResponse, origin: string | undefined): boolean {
  if (!isOriginAllowed(origin)) return false;
  res.setHeader("access-control-allow-origin", origin as string);
  res.setHeader("vary", "origin");
  res.setHeader("access-control-allow-methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type");
  return true;
}
