import type { Server as HttpServer } from "node:http";
import type { ViteDevServer } from "vite";

export async function startViteDev(root: string, httpServer: HttpServer): Promise<ViteDevServer> {
  const { createServer } = await import("vite");
  return createServer({
    root,
    appType: "spa",
    server: {
      middlewareMode: true,
      hmr: { server: httpServer, path: "/__vite_hmr" },
      allowedHosts: true,
    },
  });
}
