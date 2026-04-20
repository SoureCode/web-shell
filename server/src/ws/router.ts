import type { IncomingMessage, Server as HttpServer } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer } from "ws";
import type { SessionManager } from "../session/manager.js";
import { log } from "../utils/log.js";
import { isRequestOriginAcceptable } from "../utils/origin.js";
import { bindSocket } from "./connection.js";

const WS_PATH = /^\/api\/sessions\/([^/]+)\/stream$/;

function rejectUpgrade(socket: Duplex, status: number, reason: string): void {
  socket.write(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
}

export function mountWsRouter(server: HttpServer, manager: SessionManager): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const origin = req.headers.origin ?? "-";
    log("ws", "upgrade", url.pathname, "origin=", origin);

    const match = WS_PATH.exec(url.pathname);
    if (!match) {
      log("ws", "upgrade pass-through (not our path)", url.pathname);
      return;
    }

    if (!isRequestOriginAcceptable(req)) {
      log("ws", "upgrade rejected: origin not acceptable", origin);
      rejectUpgrade(socket, 403, "Forbidden");
      return;
    }

    const id = match[1] as string;
    const session = manager.get(id);
    if (!session) {
      log("ws", "upgrade rejected: session not found", id);
      rejectUpgrade(socket, 404, "Not Found");
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      log("ws", "upgrade accepted", id);
      bindSocket(ws, session);
    });
  });
}
