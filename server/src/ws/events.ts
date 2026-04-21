import type { WebSocket } from "ws";
import type { SessionManager } from "../session/manager.js";
import type { SessionInfo } from "../types/session.js";
import { log } from "../utils/log.js";

export function bindEventsSocket(ws: WebSocket, manager: SessionManager): void {
  log("ws-events", "bind");

  const send = (sessions: SessionInfo[]): void => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: "sessions", data: sessions }));
  };

  send(manager.list());
  const unsubscribe = manager.onChange(send);

  ws.on("close", () => {
    log("ws-events", "close");
    unsubscribe();
  });

  ws.on("error", (err) => {
    log("ws-events", "error", err.message);
  });
}
