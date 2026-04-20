import type { ClientMessage } from "../types/protocol.js";

export function parseClientMessage(raw: string): ClientMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  const obj = parsed as Record<string, unknown>;
  if (obj["type"] === "input" && typeof obj["data"] === "string") {
    return { type: "input", data: obj["data"] };
  }
  if (obj["type"] === "resize" && typeof obj["cols"] === "number" && typeof obj["rows"] === "number") {
    return { type: "resize", cols: obj["cols"], rows: obj["rows"] };
  }
  return null;
}
