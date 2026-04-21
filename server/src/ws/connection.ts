import type { WebSocket } from "ws";
import type { Session } from "../session/session.js";
import type { ServerMessage } from "../types/protocol.js";
import { log } from "../utils/log.js";
import { parseClientMessage } from "./parse.js";

export function bindSocket(ws: WebSocket, session: Session): void {
  const id = session.id;
  log("ws", "bind", id);

  const send = (msg: ServerMessage): void => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  };

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
      session.resize(msg.cols, msg.rows);
      if (firstResize) {
        firstResize = false;
        session.pokeWinch();
      }
    }
  });

  ws.on("close", (code, reason) => {
    log("ws", "close", id, "code=", code, "reason=", reason.toString());
    unsubscribe();
  });

  ws.on("error", (err) => {
    log("ws", "error", id, err.message);
  });
}
