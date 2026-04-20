import http from "node:http";
import { PORT } from "./config.js";
import { createHttpHandler } from "./http/router.js";
import { SessionManager } from "./session/manager.js";
import { mountWsRouter } from "./ws/router.js";

const manager = new SessionManager();
const server = http.createServer(createHttpHandler(manager));
mountWsRouter(server, manager);

server.listen(PORT, () => {
  console.log(`[web-shell] server listening on :${PORT}`);
});
