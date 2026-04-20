import type { IncomingMessage, Server as HttpServer } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer } from "ws";
import type { SessionManager } from "../session/manager.js";
import { extractQueryToken, isTokenValid } from "../utils/auth.js";
import { isOriginAllowed } from "../utils/origin.js";
import { bindSocket } from "./connection.js";

const WS_PATH = /^\/ws\/sessions\/([^/]+)$/;

function rejectUpgrade(socket: Duplex, status: number, reason: string): void {
  socket.write(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
}

export function mountWsRouter(server: HttpServer, manager: SessionManager): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (!isOriginAllowed(req.headers.origin)) {
      rejectUpgrade(socket, 403, "Forbidden");
      return;
    }

    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (!isTokenValid(extractQueryToken(url))) {
      rejectUpgrade(socket, 401, "Unauthorized");
      return;
    }

    const match = WS_PATH.exec(url.pathname);
    if (!match) {
      rejectUpgrade(socket, 404, "Not Found");
      return;
    }

    const id = match[1] as string;
    const session = manager.get(id);
    if (!session) {
      rejectUpgrade(socket, 404, "Not Found");
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => bindSocket(ws, session));
  });
}
