import type { IncomingMessage, Server as HttpServer } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer } from "ws";
import type { SessionManager } from "../session/manager.js";
import { bindSocket } from "./connection.js";

const WS_PATH = /^\/ws\/sessions\/([^/]+)$/;

export function mountWsRouter(server: HttpServer, manager: SessionManager): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const match = WS_PATH.exec(url.pathname);
    if (!match) {
      socket.destroy();
      return;
    }

    const id = match[1] as string;
    const session = manager.get(id);
    if (!session) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => bindSocket(ws, session));
  });
}
