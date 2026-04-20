import type { IncomingMessage, ServerResponse } from "node:http";
import type { SessionManager } from "../session/manager.js";
import type { RequestFallback } from "../types/fallback.js";
import type { CreateSessionRequest } from "../types/session.js";
import { extractBearer, extractQueryToken, isTokenValid } from "../utils/auth.js";
import { readJson, sendJson } from "../utils/json.js";
import { log } from "../utils/log.js";
import { isRequestOriginAcceptable } from "../utils/origin.js";
import { handleSseStream } from "./sse.js";

const SESSION_PATH = /^\/api\/sessions\/([^/]+)$/;
const EVENTS_PATH = /^\/api\/sessions\/([^/]+)\/events$/;
const INPUT_PATH = /^\/api\/sessions\/([^/]+)\/input$/;
const RESIZE_PATH = /^\/api\/sessions\/([^/]+)\/resize$/;

export function createHttpHandler(manager: SessionManager, fallback: RequestFallback | null) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    log("http", req.method, req.url, "origin=", req.headers.origin ?? "-");

    if (!isRequestOriginAcceptable(req)) {
      log("http", "rejected: origin", req.headers.origin);
      sendJson(res, 403, { error: "origin not allowed" });
      return;
    }

    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const path = url.pathname;
    const isApi = path.startsWith("/api/");

    if (isApi) {
      const token = extractBearer(req) ?? extractQueryToken(url);
      if (!isTokenValid(token)) {
        log("http", "rejected: unauthorized", path);
        sendJson(res, 401, { error: "unauthorized" });
        return;
      }
    }

    const eventsMatch = EVENTS_PATH.exec(path);
    if (eventsMatch && req.method === "GET") {
      handleSseStream(manager, eventsMatch[1] as string, req, res);
      return;
    }

    const inputMatch = INPUT_PATH.exec(path);
    if (inputMatch && req.method === "POST") {
      const id = inputMatch[1] as string;
      const session = manager.get(id);
      if (!session) {
        sendJson(res, 404, { error: "not found" });
        return;
      }
      const body = await readJson<{ data?: string }>(req).catch(() => ({}) as { data?: string });
      if (typeof body.data !== "string") {
        sendJson(res, 400, { error: "data required" });
        return;
      }
      session.write(body.data);
      sendJson(res, 204, {});
      return;
    }

    const resizeMatch = RESIZE_PATH.exec(path);
    if (resizeMatch && req.method === "POST") {
      const id = resizeMatch[1] as string;
      const session = manager.get(id);
      if (!session) {
        sendJson(res, 404, { error: "not found" });
        return;
      }
      const body = await readJson<{ cols?: number; rows?: number }>(req).catch(() => ({}) as { cols?: number; rows?: number });
      if (typeof body.cols !== "number" || typeof body.rows !== "number") {
        sendJson(res, 400, { error: "cols/rows required" });
        return;
      }
      session.resize(body.cols, body.rows);
      sendJson(res, 204, {});
      return;
    }

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

    if (isApi) {
      sendJson(res, 404, { error: "not found" });
      return;
    }

    if (fallback) {
      await fallback(req, res);
      return;
    }

    sendJson(res, 404, { error: "not found" });
  };
}
