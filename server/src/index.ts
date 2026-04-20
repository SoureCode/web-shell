import http from "node:http";
import { CLIENT_DIST, CLIENT_ROOT, HOST, PORT } from "./config.js";
import { createViteFallback } from "./dev/vite-fallback.js";
import { startViteDev } from "./dev/vite-middleware.js";
import { createHttpHandler } from "./http/router.js";
import { createStaticFallback } from "./http/static-fallback.js";
import { SessionManager } from "./session/manager.js";
import type { RequestFallback } from "./types/fallback.js";
import { isAuthDisabled } from "./utils/auth.js";
import { mountWsRouter } from "./ws/router.js";

process.env["PORT"] = String(PORT);

const manager = new SessionManager();
await manager.rehydrate();
const server = http.createServer();
mountWsRouter(server, manager);

let fallback: RequestFallback | null = null;
let mode = "api-only";

const preferDev = process.env["NODE_ENV"] === "development";

if (preferDev && CLIENT_ROOT) {
  const vite = await startViteDev(CLIENT_ROOT, server);
  fallback = createViteFallback(vite);
  mode = `vite dev (${CLIENT_ROOT})`;
} else if (CLIENT_DIST) {
  fallback = createStaticFallback(CLIENT_DIST);
  mode = `static ${CLIENT_DIST}`;
} else if (CLIENT_ROOT) {
  const vite = await startViteDev(CLIENT_ROOT, server);
  fallback = createViteFallback(vite);
  mode = `vite dev (${CLIENT_ROOT})`;
}

server.on("request", createHttpHandler(manager, fallback));

server.listen(PORT, HOST, () => {
  const authState = isAuthDisabled() ? "disabled (trust upstream)" : "enabled";
  console.log(`[web-shell] http://${HOST}:${PORT} · auth ${authState} · ${mode}`);
});
