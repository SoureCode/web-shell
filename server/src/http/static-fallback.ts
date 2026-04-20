import type { RequestFallback } from "../types/fallback.js";
import { sendJson } from "../utils/json.js";
import { serveSpaFallback, serveStatic } from "./static.js";

export function createStaticFallback(root: string): RequestFallback {
  return async (req, res) => {
    if (req.method !== "GET") {
      sendJson(res, 404, { error: "not found" });
      return;
    }
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    if (await serveStatic(root, url.pathname, res)) return;
    if (await serveSpaFallback(root, res)) return;
    sendJson(res, 404, { error: "not found" });
  };
}
