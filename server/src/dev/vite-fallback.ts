import type { ViteDevServer } from "vite";
import type { RequestFallback } from "../types/fallback.js";
import { sendJson } from "../utils/json.js";

export function createViteFallback(vite: ViteDevServer): RequestFallback {
  return (req, res) =>
    new Promise((resolve) => {
      res.once("close", resolve);
      vite.middlewares(req, res, () => {
        sendJson(res, 404, { error: "not found" });
        resolve();
      });
    });
}
