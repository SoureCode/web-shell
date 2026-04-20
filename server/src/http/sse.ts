import type { IncomingMessage, ServerResponse } from "node:http";
import type { SessionManager } from "../session/manager.js";
import { sendJson } from "../utils/json.js";
import { log } from "../utils/log.js";
import { sendEvent, sendPing, startSse } from "../utils/sse.js";

const PING_INTERVAL_MS = 15_000;

export function handleSseStream(
  manager: SessionManager,
  id: string,
  req: IncomingMessage,
  res: ServerResponse,
): void {
  const session = manager.get(id);
  if (!session) {
    sendJson(res, 404, { error: "not found" });
    return;
  }

  log("sse", "open", id);
  startSse(res);
  sendEvent(res, "history", session.history());

  const unsubscribe = session.subscribe(
    (chunk) => {
      log("sse", "send output", id, chunk.length, "bytes");
      sendEvent(res, "output", chunk);
    },
    (code, signal) => {
      log("sse", "send exit", id, "code=", code, "signal=", signal);
      sendEvent(res, "exit", JSON.stringify({ code, signal: signal ?? null }));
      res.end();
    },
  );

  const ping = setInterval(() => sendPing(res), PING_INTERVAL_MS);

  req.on("close", () => {
    log("sse", "close", id);
    clearInterval(ping);
    unsubscribe();
  });
}
