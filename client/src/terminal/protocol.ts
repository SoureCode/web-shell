import { safeParse } from "../utils/json.js";
import type { ServerMessage } from "../types/protocol.js";

export function parseServerMessage(raw: string): ServerMessage | null {
  const parsed = safeParse<unknown>(raw);
  if (!parsed || typeof parsed !== "object") return null;

  const obj = parsed as Record<string, unknown>;
  if ((obj["type"] === "history" || obj["type"] === "output") && typeof obj["data"] === "string") {
    return { type: obj["type"], data: obj["data"] };
  }
  if (obj["type"] === "exit" && typeof obj["code"] === "number") {
    const signal = obj["signal"];
    return typeof signal === "number"
      ? { type: "exit", code: obj["code"], signal }
      : { type: "exit", code: obj["code"] };
  }
  return null;
}
