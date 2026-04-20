import type { WebSocket } from "ws";
import type { Session } from "../session/session.js";
import type { ServerMessage } from "../types/protocol.js";
import { parseClientMessage } from "./parse.js";

export function bindSocket(ws: WebSocket, session: Session): void {
  const send = (msg: ServerMessage): void => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  };

  send({ type: "history", data: session.history() });

  const unsubscribe = session.subscribe(
    (chunk) => send({ type: "output", data: chunk }),
    (code, signal) => {
      const msg: ServerMessage =
        signal === undefined ? { type: "exit", code } : { type: "exit", code, signal };
      send(msg);
      ws.close();
    },
  );

  ws.on("message", (raw) => {
    const msg = parseClientMessage(raw.toString());
    if (!msg) return;
    if (msg.type === "input") session.write(msg.data);
    else session.resize(msg.cols, msg.rows);
  });

  ws.on("close", unsubscribe);
}
