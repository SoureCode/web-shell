import http from "node:http";
import { HOST, PORT } from "./config.js";
import { createHttpHandler } from "./http/router.js";
import { SessionManager } from "./session/manager.js";
import { isAuthDisabled } from "./utils/auth.js";
import { mountWsRouter } from "./ws/router.js";

const manager = new SessionManager();
const server = http.createServer(createHttpHandler(manager));
mountWsRouter(server, manager);

server.listen(PORT, HOST, () => {
  const authState = isAuthDisabled() ? "disabled (trust upstream)" : "enabled";
  console.log(`[web-shell] listening on http://${HOST}:${PORT} · auth ${authState}`);
});
