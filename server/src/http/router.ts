import type { IncomingMessage, ServerResponse } from "node:http";
import type { SessionManager } from "../session/manager.js";
import type { CreateSessionRequest } from "../types/session.js";
import { applyCors } from "../utils/cors.js";
import { readJson, sendJson } from "../utils/json.js";
import { isOriginAllowed } from "../utils/origin.js";

const SESSION_PATH = /^\/api\/sessions\/([^/]+)$/;

export function createHttpHandler(manager: SessionManager) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const origin = req.headers.origin;

    if (origin !== undefined && !isOriginAllowed(origin)) {
      sendJson(res, 403, { error: "origin not allowed" });
      return;
    }

    applyCors(res, origin);

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const path = url.pathname;

    if (req.method === "GET" && path === "/api/sessions") {
      sendJson(res, 200, manager.list());
      return;
    }

    if (req.method === "POST" && path === "/api/sessions") {
      const body = await readJson<CreateSessionRequest>(req).catch(() => ({}) as CreateSessionRequest);
      const session = manager.create(body);
      sendJson(res, 201, session.info());
      return;
    }

    const match = SESSION_PATH.exec(path);
    if (match) {
      const id = match[1] as string;
      if (req.method === "GET") {
        const session = manager.get(id);
        if (session) sendJson(res, 200, session.info());
        else sendJson(res, 404, { error: "not found" });
        return;
      }
      if (req.method === "DELETE") {
        const ok = manager.destroy(id);
        sendJson(res, ok ? 200 : 404, { ok });
        return;
      }
    }

    sendJson(res, 404, { error: "not found" });
  };
}
