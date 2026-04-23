import type { WebSocket } from "ws";
import type { Session } from "../session/session.js";
import type { ServerMessage } from "../types/protocol.js";
import { log } from "../utils/log.js";
import { parseClientMessage } from "./parse.js";

// Browsers don't expose ping/pong to JS, but the ws library on the server
// can drive them and the browser auto-replies. Without this, half-open
// sockets (laptop sleep, NAT/proxy idle timeout) sit alive on the server
// for hours until OS TCP keepalive fires — and the client never sees a
// close to trigger its reconnect.
const PING_INTERVAL_MS = 20_000;

export function bindSocket(ws: WebSocket, session: Session): void {
  const id = session.id;
  log("ws", "bind", id);

  const send = (msg: ServerMessage): void => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  };

  let alive = true;
  ws.on("pong", () => { alive = true; });
  const ping = setInterval(() => {
    if (!alive) {
      log("ws", "stale (no pong), terminating", id);
      try { ws.terminate(); } catch { /* ignore */ }
      return;
    }
    alive = false;
    try { ws.ping(); } catch { /* ignore */ }
  }, PING_INTERVAL_MS);

  const history = session.history();
  log("ws", "send history", id, history.length, "bytes");
  send({ type: "history", data: history });

  let firstResize = true;

  const unsubscribe = session.subscribe(
    (chunk) => {
      log("ws", "send output", id, chunk.length, "bytes");
      send({ type: "output", data: chunk });
    },
    (code, signal) => {
      log("ws", "session exit", id, "code=", code, "signal=", signal);
      const msg: ServerMessage =
        signal === undefined ? { type: "exit", code } : { type: "exit", code, signal };
      send(msg);
      ws.close();
    },
  );

  ws.on("message", (raw) => {
    const text = raw.toString();
    const msg = parseClientMessage(text);
    if (!msg) {
      log("ws", "recv unparseable", id, text.slice(0, 80));
      return;
    }
    if (msg.type === "input") {
      log("ws", "recv input", id, msg.data.length, "bytes");
      session.write(msg.data);
    } else {
      log("ws", "recv resize", id, msg.cols, "x", msg.rows);
      session.setClientSize(ws, msg.cols, msg.rows);
      if (firstResize) {
        firstResize = false;
        session.pokeWinch();
      }
    }
  });

  ws.on("close", (code, reason) => {
    log("ws", "close", id, "code=", code, "reason=", reason.toString());
    clearInterval(ping);
    session.removeClient(ws);
    unsubscribe();
  });

  ws.on("error", (err) => {
    log("ws", "error", id, err.message);
  });
}
